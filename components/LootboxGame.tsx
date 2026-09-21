"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  createWalletClient,
  custom,
  decodeEventLog,
  formatUnits,
  type Address,
  type Hash,
} from "viem";
import { base } from "viem/chains";
import { erc20Abi, lootboxAbi } from "@/lib/abis";
import {
  BASE_EXPLORER,
  BOX_DISPLAY_PRICE,
  BOX_USD_PRICE,
  LOOTBOX_ADDRESS,
  TET_ADDRESS,
} from "@/lib/config";
import { publicClient } from "@/lib/client";
import { BundleContents } from "./BundleContents";

type Phase =
  | "idle"
  | "approve"
  | "purchase"
  | "waiting"
  | "revealed"
  | "error";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
  size: number;
  color: string;
  rot: number;
};

export function LootboxGame() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <section className="game-shell config-missing">
        <div>
          <span className="eyebrow">SETUP REQUIRED</span>

          <h1>Add your Privy app ID</h1>

          <p>
            Copy .env.example to .env.local, add your Privy
            credentials, then restart the app.
          </p>
        </div>
      </section>
    );
  }

  return <ConnectedLootboxGame />;
}

function ConnectedLootboxGame() {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const wallet = wallets[0];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const particles = useRef<Particle[]>([]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [boxPrice, setBoxPrice] = useState<bigint>(
    BigInt("1000000000000000000000"),
  );
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [allowance, setAllowance] =
    useState<bigint>(BigInt(0));
  const [inventory, setInventory] =
    useState<bigint>(BigInt(0));
  const [requestId, setRequestId] = useState<bigint>();
  const [bundleId, setBundleId] = useState<bigint>();
  const [delivered, setDelivered] = useState(false);
  const [txHash, setTxHash] = useState<Hash>();
  const [message, setMessage] =
    useState("Ready to open");

  const address = wallet?.address as Address | undefined;

  const refresh = useCallback(async () => {
    const [price, count] = await Promise.all([
      publicClient.readContract({
        address: LOOTBOX_ADDRESS,
        abi: lootboxAbi,
        functionName: "boxPrice",
      }),
      publicClient.readContract({
        address: LOOTBOX_ADDRESS,
        abi: lootboxAbi,
        functionName: "unreservedBundleCount",
      }),
    ]);

    setBoxPrice(price);
    setInventory(count);

    if (address) {
      const [nextBalance, nextAllowance] =
        await Promise.all([
          publicClient.readContract({
            address: TET_ADDRESS,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address],
          }),
          publicClient.readContract({
            address: TET_ADDRESS,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, LOOTBOX_ADDRESS],
          }),
        ]);

      setBalance(nextBalance);
      setAllowance(nextAllowance);
    }
  }, [address]);

  useEffect(() => {
    queueMicrotask(() => {
      refresh().catch(() => {
        setMessage("Could not read Base right now");
      });
    });
  }, [refresh]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;

    if (!canvas || !host) return;

    const context = canvas.getContext("2d");

    if (!context) return;

    let frame = 0;
    let previous = performance.now();

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;

      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      context.setTransform(
        scale,
        0,
        0,
        scale,
        0,
        0,
      );
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);

    resize();

    const tick = (now: number) => {
      const dt = Math.min(
        0.033,
        (now - previous) / 1000,
      );

      previous = now;

      context.clearRect(
        0,
        0,
        canvas.clientWidth,
        canvas.clientHeight,
      );

      particles.current = particles.current.filter(
        (particle) => {
          particle.age += dt;

          if (particle.age >= particle.life) {
            return false;
          }

          particle.vy += 560 * dt;
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          particle.rot += dt * 4;

          context.save();
          context.globalAlpha =
            1 - particle.age / particle.life;
          context.translate(
            particle.x,
            particle.y,
          );
          context.rotate(particle.rot);
          context.fillStyle = particle.color;
          context.fillRect(
            -particle.size / 2,
            -particle.size / 2,
            particle.size,
            particle.size,
          );
          context.restore();

          return true;
        },
      );

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const explode = () => {
    const host = hostRef.current;

    if (!host) return;

    const x = host.clientWidth / 2;
    const y = host.clientHeight * 0.43;

    particles.current.push(
      ...Array.from({ length: 92 }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed =
          150 + Math.random() * 280;

        return {
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy:
            Math.sin(angle) * speed -
            80,
          life:
            0.7 + Math.random() * 0.7,
          age: 0,
          size:
            3 + Math.random() * 9,
          color:
            Math.random() > 0.5
              ? "#f2ad3e"
              : "#7d3818",
          rot:
            Math.random() * 3,
        };
      }),
    );
  };

  const getWalletClient = async () => {
    if (!wallet) {
      throw new Error(
        "Connect a wallet first",
      );
    }

    await wallet.switchChain(base.id);

    const provider =
      await wallet.getEthereumProvider();

    return createWalletClient({
      account: wallet.address as Address,
      chain: base,
      transport: custom(provider),
    });
  };

  const approve = async () => {
    try {
      setPhase("approve");
      setMessage(
        "Approve TET in your wallet",
      );

      const walletClient =
        await getWalletClient();

      const hash =
        await walletClient.writeContract({
          address: TET_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [
            LOOTBOX_ADDRESS,
            boxPrice,
          ],
        });

      setTxHash(hash);
      setMessage("Confirming approval");

      await publicClient.waitForTransactionReceipt({
        hash,
      });

      await refresh();

      setPhase("idle");
      setMessage(
        "Approved. Your box is ready",
      );
    } catch (error) {
      setPhase("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Approval failed",
      );
    }
  };

  const pollDraw = async (id: bigint) => {
    for (
      let attempt = 0;
      attempt < 40;
      attempt++
    ) {
      const draw =
        await publicClient.readContract({
          address: LOOTBOX_ADDRESS,
          abi: lootboxAbi,
          functionName: "draws",
          args: [id],
        });

      if (Number(draw[2]) === 2) {
        setBundleId(draw[5]);
        setDelivered(draw[3]);
        setPhase("revealed");

        setMessage(
          draw[3]
            ? "Prize delivered"
            : "Prize assigned. Claim to a compatible wallet",
        );

        explode();
        return;
      }

      if (Number(draw[2]) === 3) {
        throw new Error(
          "This draw was refunded",
        );
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });
    }

    throw new Error(
      "The draw is still pending. You can safely return later with the request ID.",
    );
  };

  const purchase = async () => {
    try {
      setPhase("purchase");
      setMessage(
        "Confirm your lootbox purchase",
      );

      const walletClient =
        await getWalletClient();

      const deadline = BigInt(
        Math.floor(Date.now() / 1000) +
          600,
      );

      const hash =
        await walletClient.writeContract({
          address: LOOTBOX_ADDRESS,
          abi: lootboxAbi,
          functionName: "purchase",
          args: [
            boxPrice,
            deadline,
          ],
        });

      setTxHash(hash);
      setMessage(
        "Securing your box on Base",
      );

      const receipt =
        await publicClient.waitForTransactionReceipt({
          hash,
        });

      let id: bigint | undefined;

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: lootboxAbi,
            data: log.data,
            topics: log.topics,
          });

          if (
            decoded.eventName ===
            "DrawRequested"
          ) {
            id = decoded.args.requestId;
          }
        } catch {
          // Ignore logs emitted by other contracts.
        }
      }

      if (id === undefined) {
        throw new Error(
          "Purchase confirmed, but request ID was not found in the receipt",
        );
      }

      setRequestId(id);
      setPhase("waiting");
      setMessage(
        "Randomness provider is opening your box",
      );

      const response = await fetch(
        "/api/fulfill",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            requestId: id.toString(),
          }),
        },
      );

      const body = await response.json();

      if (
        !response.ok &&
        response.status !== 409
      ) {
        throw new Error(
          body.error ||
            "Randomness provider is unavailable",
        );
      }

      await pollDraw(id);
      await refresh();
    } catch (error) {
      setPhase("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Purchase failed",
      );
    }
  };

  const reset = () => {
    setPhase("idle");
    setRequestId(undefined);
    setBundleId(undefined);
    setDelivered(false);
    setTxHash(undefined);
    setMessage("Ready to open");
  };

  const busy = [
    "approve",
    "purchase",
    "waiting",
  ].includes(phase);

  const insufficient =
    balance < boxPrice;

  const action = !ready
    ? "Loading…"
    : !authenticated
      ? "Log in to open"
      : inventory === BigInt(0)
        ? "Sold out"
        : insufficient
          ? "Not enough TET"
          : allowance < boxPrice
            ? "Approve TET"
            : "Buy & open";

  const onAction = () => {
    if (!authenticated) {
      return login();
    }

    if (
      inventory === BigInt(0) ||
      insufficient
    ) {
      return;
    }

    if (allowance < boxPrice) {
      return approve();
    }

    return purchase();
  };

  return (
    <section
      className={`game-shell phase-${phase}`}
      ref={hostRef}
    >
      <div className="ray-bg" />

      <div className="glow-orb glow-one" />
      <div className="glow-orb glow-two" />

      <canvas
        className="particle-canvas"
        ref={canvasRef}
      />

      <div className="game-copy">
        <span className="eyebrow">
          ONCHAIN MYSTERY BUNDLES
        </span>

        <h1>
          BREAK THE
          <br />
          <span>BOX.</span>
        </h1>

        <p>
          One box. One supply-one PWN bundle.
          Your prize is picked on Base and sent
          straight to your wallet.
        </p>
      </div>

      <div className="crate-stage">
        <div className="rarity-label">
          {phase === "revealed"
            ? "UNLOCKED"
            : phase === "waiting"
              ? "DRAWING"
              : "MYSTERY"}
        </div>

        {phase === "revealed" &&
        bundleId !== undefined ? (
          <BundleContents
            bundleId={bundleId}
            requestId={requestId}
            delivered={delivered}
          />
        ) : (
          <>
            <div
              className={`crate ${
                busy ? "shaking" : ""
              }`}
              aria-label="Loot crate"
            >
              <div className="crate-face">
                <span className="crate-question">
                  ?
                </span>
              </div>
            </div>

            <div className="crate-shadow" />
          </>
        )}
      </div>

      <aside className="purchase-card">
        <div className="price-row">
          <span>PRICE</span>
          <strong>
            {BOX_DISPLAY_PRICE}
          </strong>
        </div>

        <div className="usd-line">
          ≈ ${BOX_USD_PRICE.toLocaleString()} USD{" "}
          <span>static estimate</span>
        </div>

        <div className="stock-line">
          <i
            className={
              inventory > BigInt(0)
                ? "live"
                : ""
            }
          />{" "}
          {inventory.toString()} boxes available
        </div>

        {authenticated && (
          <div className="balance-line">
            Your balance
            <strong>
              {Number(
                formatUnits(balance, 18),
              ).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{" "}
              TET
            </strong>
          </div>
        )}

        {phase === "revealed" ? (
          <>
            <div className="win-panel">
              <span>YOU WON</span>

              <strong>
                Bundle #{bundleId?.toString()}
              </strong>

              <small>
                {delivered
                  ? "Ready to claim"
                  : "Assigned to your wallet"}
              </small>
            </div>

            <button
              className="text-button"
              onClick={reset}
            >
              Open another
            </button>
          </>
        ) : (
          <button
            className="primary-button"
            disabled={
              busy ||
              inventory === BigInt(0) ||
              (authenticated &&
                insufficient)
            }
            onClick={onAction}
          >
            {busy ? "Opening…" : action}
          </button>
        )}

        <div
          className={`status-line ${
            phase === "error"
              ? "error"
              : ""
          }`}
        >
          {message}
        </div>

        {requestId !== undefined && (
          <div className="request-line">
            Request #{requestId.toString()}
          </div>
        )}

        {txHash && (
          <a
            className="tx-link"
            href={`${BASE_EXPLORER}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction ↗
          </a>
        )}
      </aside>

      <div className="fairness-note">
        <span>01</span>
        <p>
          <strong>BUY</strong>
          Pay 1,000 TET
        </p>

        <span>02</span>
        <p>
          <strong>DRAW</strong>
          Server fulfills
        </p>

        <span>03</span>
        <p>
          <strong>RECEIVE</strong>
          Bundle lands in wallet
        </p>
      </div>
    </section>
  );
}