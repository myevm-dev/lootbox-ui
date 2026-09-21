"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import {
  createWalletClient,
  custom,
  type Address,
  type Hash,
} from "viem";
import { base } from "viem/chains";
import { bundlerAbi, lootboxAbi } from "@/lib/abis";
import {
  assetDetails,
  CATEGORY_NAMES,
  loadBundleDetails,
  shortAddress,
  type BundleDetails,
} from "@/lib/bundles";
import {
  BASE_EXPLORER,
  BUNDLER_ADDRESS,
  LOOTBOX_ADDRESS,
} from "@/lib/config";
import { publicClient } from "@/lib/client";

type BundleContentsProps = {
  bundleId: bigint;
  requestId?: bigint;
  delivered?: boolean;
  onClaimed?: () => void;
};

export function BundleContents({
  bundleId,
  requestId,
  delivered = true,
  onClaimed,
}: BundleContentsProps) {
  const { wallets } = useWallets();
  const wallet = wallets[0];

  const [bundle, setBundle] = useState<BundleDetails>();
  const [isDelivered, setIsDelivered] = useState(delivered);
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [message, setMessage] = useState("");
  const [hash, setHash] = useState<Hash>();

  const load = useCallback(() => {
    return loadBundleDetails(bundleId)
      .then(setBundle)
      .catch(() => setMessage("Could not read this bundle"));
  }, [bundleId]);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const getWalletClient = async () => {
    if (!wallet) {
      throw new Error("Connect your winning wallet first");
    }

    await wallet.switchChain(base.id);
    const provider = await wallet.getEthereumProvider();

    return createWalletClient({
      account: wallet.address as Address,
      chain: base,
      transport: custom(provider),
    });
  };

  const claim = async () => {
    try {
      setBusy(true);
      setMessage(
        isDelivered
          ? "Confirm token claim"
          : "Confirm bundle delivery",
      );

      const client = await getWalletClient();

      const nextHash = isDelivered
        ? await client.writeContract({
            address: BUNDLER_ADDRESS,
            abi: bundlerAbi,
            functionName: "unwrap",
            args: [bundleId],
          })
        : await client.writeContract({
            address: LOOTBOX_ADDRESS,
            abi: lootboxAbi,
            functionName: "claimPrize",
            args: [
              requestId!,
              wallet!.address as Address,
            ],
          });

      setHash(nextHash);
      setMessage("Confirming on Base");

      await publicClient.waitForTransactionReceipt({
        hash: nextHash,
      });

      if (!isDelivered) {
        setIsDelivered(true);
        setMessage(
          "Bundle received. Press Claim tokens to unwrap it.",
        );
      } else {
        setClaimed(true);
        setMessage("Tokens claimed to your wallet");
        onClaimed?.();
      }
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Claim failed",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="reveal-prize-card">
      <div className="reveal-prize-head">
        <div>
          <span>YOU WON</span>
          <strong>Bundle #{bundleId.toString()}</strong>
        </div>

        <div>
          <span>ESTIMATED VALUE</span>
          <strong>
            {bundle
              ? bundle.value
                ? `$${bundle.value.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}`
                : "Unpriced"
              : "…"}
          </strong>
        </div>
      </div>

      {!bundle && !message && (
        <div className="claim-loading">
          <span className="loader" />
          Reading your prize…
        </div>
      )}

      {bundle && (
        <div className="reveal-assets">
          {bundle.assets.map((asset, index) => {
            const item = assetDetails(asset);

            return (
              <div
                className="reveal-asset"
                key={`${asset.assetAddress}-${index}`}
              >
                <div className="asset-icon">
                  {item.symbol.slice(0, 2)}
                </div>

                <div>
                  <strong>{item.symbol}</strong>

                  <a
                    href={`${BASE_EXPLORER}/address/${asset.assetAddress}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortAddress(asset.assetAddress)} ↗
                  </a>
                </div>

                <div>
                  <strong>{item.amount}</strong>

                  <span>
                    {CATEGORY_NAMES[asset.category]}
                    {item.usd !== null
                      ? ` · $${item.usd.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}`
                      : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!claimed ? (
        <button
          className="primary-button claim-button"
          disabled={busy || !bundle}
          onClick={claim}
        >
          {busy
            ? "Claiming…"
            : isDelivered
              ? "Claim tokens"
              : "Receive bundle"}
        </button>
      ) : (
        <div className="claimed-badge">
          ✓ TOKENS CLAIMED
        </div>
      )}

      <p className="claim-explainer">
        {isDelivered
          ? "Claiming unwraps the PWN bundle and transfers every token inside to this wallet."
          : "Receive the assigned bundle first, then unwrap it to claim its tokens."}
      </p>

      {message && (
        <div className="status-line">{message}</div>
      )}

      {hash && (
        <a
          className="tx-link"
          href={`${BASE_EXPLORER}/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
        >
          View claim transaction ↗
        </a>
      )}
    </div>
  );
}