"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { parseAbiItem, type Address } from "viem";
import { bundlerAbi, lootboxAbi } from "@/lib/abis";
import {
  BUNDLER_ADDRESS,
  LOOTBOX_ADDRESS,
  LOOTBOX_DEPLOYMENT_BLOCK,
} from "@/lib/config";
import { publicClient } from "@/lib/client";
import { BundleContents } from "./BundleContents";

type Claim = {
  requestId: bigint;
  bundleId: bigint;
  delivered: boolean;
};

const drawFulfilled = parseAbiItem(
  "event DrawFulfilled(uint256 indexed requestId,address indexed buyer,uint256 indexed bundleId,bytes32 providerEntropy,uint256 selectedIndex)",
);

export function ClaimsGallery() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <main className="claims-page">
        <section className="claims-empty">
          <span className="eyebrow">SETUP REQUIRED</span>
          <h1>
            MY <span>CLAIMS</span>
          </h1>
          <p>
            Add NEXT_PUBLIC_PRIVY_APP_ID to use wallet claims.
          </p>
        </section>
      </main>
    );
  }

  return <ConnectedClaimsGallery />;
}

function ConnectedClaimsGallery() {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const address = wallets[0]?.address as Address | undefined;

  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError("");

      const latest = await publicClient.getBlockNumber();
      const logs = [];
      const chunk = BigInt(20_000);

      for (
        let fromBlock = LOOTBOX_DEPLOYMENT_BLOCK;
        fromBlock <= latest;
        fromBlock += chunk
      ) {
        const possibleToBlock =
          fromBlock + chunk - BigInt(1);

        const toBlock =
          possibleToBlock > latest
            ? latest
            : possibleToBlock;

        const part = await publicClient.getLogs({
          address: LOOTBOX_ADDRESS,
          event: drawFulfilled,
          args: {
            buyer: address,
          },
          fromBlock,
          toBlock,
        });

        logs.push(...part);
      }

      const records = await Promise.all(
        logs.map(async (log) => {
          const requestId = log.args.requestId!;
          const bundleId = log.args.bundleId!;

          const [draw, receiptBalance] =
            await Promise.all([
              publicClient.readContract({
                address: LOOTBOX_ADDRESS,
                abi: lootboxAbi,
                functionName: "draws",
                args: [requestId],
              }),
              publicClient.readContract({
                address: BUNDLER_ADDRESS,
                abi: bundlerAbi,
                functionName: "balanceOf",
                args: [address, bundleId],
              }),
            ]);

          if (
            Number(draw[2]) !== 2 ||
            (draw[3] && receiptBalance === BigInt(0))
          ) {
            return null;
          }

          return {
            requestId,
            bundleId,
            delivered: draw[3],
          };
        }),
      );

      setClaims(
        records
          .filter(
            (claim): claim is Claim => claim !== null,
          )
          .reverse(),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not load claims",
      );
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      queueMicrotask(load);
    }
  }, [address, load]);

  if (!ready) {
    return (
      <main className="claims-page">
        <div className="gallery-state">
          <span className="loader" />
          Loading wallet…
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="claims-page">
        <section className="claims-empty">
          <span className="eyebrow">YOUR PRIZES</span>

          <h1>
            MY <span>CLAIMS</span>
          </h1>

          <p>
            Log in with the wallet used to buy your lootboxes.
          </p>

          <button
            className="primary-button"
            onClick={login}
          >
            Log in
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="claims-page">
      <div className="claims-hero">
        <div>
          <span className="eyebrow">YOUR PRIZES</span>

          <h1>
            MY <span>CLAIMS</span>
          </h1>

          <p>
            Bundles stay here until you unwrap them. Claiming
            sends every token inside directly to your wallet.
          </p>
        </div>

        <div className="claims-count">
          <strong>{loading ? "—" : claims.length}</strong>
          <span>AVAILABLE CLAIMS</span>
        </div>
      </div>

      {loading && (
        <div className="gallery-state">
          <span className="loader" />
          Finding your onchain prizes…
        </div>
      )}

      {error && (
        <div className="gallery-state error">
          {error}
          <button onClick={load}>Try again</button>
        </div>
      )}

      {!loading && !error && claims.length === 0 && (
        <div className="claims-empty compact">
          <h2>Nothing waiting to be claimed</h2>
          <p>
            Newly won bundles will appear here until you
            unwrap them.
          </p>
        </div>
      )}

      <section className="claims-grid">
        {claims.map((claim) => (
          <article
            className="claim-item"
            key={claim.requestId.toString()}
          >
            <div className="claim-request">
              REQUEST #{claim.requestId.toString()}
            </div>

            <BundleContents
              {...claim}
              onClaimed={() =>
                setClaims((current) =>
                  current.filter(
                    (item) =>
                      item.requestId !== claim.requestId,
                  ),
                )
              }
            />
          </article>
        ))}
      </section>
    </main>
  );
}

