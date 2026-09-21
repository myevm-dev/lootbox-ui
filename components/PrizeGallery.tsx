"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits, type Address } from "viem";
import { bundlerAbi, erc20Abi, lootboxAbi } from "@/lib/abis";
import { BASE_EXPLORER, BUNDLER_ADDRESS, LOOTBOX_ADDRESS, STATIC_TOKENS } from "@/lib/config";
import { publicClient } from "@/lib/client";

type Asset = { category: number; assetAddress: Address; id: bigint; amount: bigint; symbol?: string; decimals?: number };
type Bundle = { id: bigint; assets: Asset[]; value: number };

const categoryName = ["ERC-20", "ERC-721", "ERC-1155"];
const hues = ["lime", "blue", "purple", "gold", "red"];

function short(value: string) { return `${value.slice(0, 6)}…${value.slice(-4)}`; }
function details(asset: Asset) {
  const known = STATIC_TOKENS[asset.assetAddress.toLowerCase()];
  const symbol = asset.symbol || known?.symbol || short(asset.assetAddress);
  if (asset.category === 0) {
    const decimals = asset.decimals ?? known?.decimals ?? 18;
    const amount = Number(formatUnits(asset.amount, decimals));
    return { symbol, amount: amount.toLocaleString(undefined, { maximumFractionDigits: 5 }), usd: known ? amount * known.price : null };
  }
  return { symbol, amount: asset.category === 1 ? `Token #${asset.id}` : `${asset.amount || BigInt(1)} × ID ${asset.id}`, usd: null };
}

export function PrizeGallery({ focusBundle }: { focusBundle?: string }) {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      let ids = await publicClient.readContract({ address: LOOTBOX_ADDRESS, abi: lootboxAbi, functionName: "availableBundleIds" });
      if (focusBundle && !ids.some((id) => id.toString() === focusBundle)) ids = [BigInt(focusBundle), ...ids];
      const records = await Promise.all(ids.map(async (id) => {
        const raw = await publicClient.readContract({ address: BUNDLER_ADDRESS, abi: bundlerAbi, functionName: "tokensInBundle", args: [id] });
        const assets = await Promise.all(raw.map(async (item) => {
          const asset: Asset = { category: Number(item.category), assetAddress: item.assetAddress, id: item.id, amount: item.amount };
          if (asset.category !== 0) return asset;
          try {
            const [decimals, symbol] = await Promise.all([
              publicClient.readContract({ address: asset.assetAddress, abi: erc20Abi, functionName: "decimals" }),
              publicClient.readContract({ address: asset.assetAddress, abi: erc20Abi, functionName: "symbol" }),
            ]);
            return { ...asset, decimals: Number(decimals), symbol };
          } catch { return asset; }
        }));
        const value = assets.reduce((sum, asset) => sum + (details(asset).usd || 0), 0);
        return { id, assets, value };
      }));
      setBundles(records);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load prizes"); }
    finally { setLoading(false); }
  }, [focusBundle]);

  useEffect(() => { queueMicrotask(load); }, [load]);
  const total = useMemo(() => bundles.reduce((sum, bundle) => sum + bundle.value, 0), [bundles]);

  return (
    <main className="prizes-page">
<div className="prizes-hero">
  <div>
    <span className="eyebrow">LIVE ON BASE</span>

    <h1>
      PRIZE <span>VAULT</span>
    </h1>

    <p>
      Every card is read directly from the lootbox and PWN TokenBundler
      contracts.
    </p>
  </div>

  <div className="vault-stats">
    <div>
      <span>AVAILABLE</span>
      <strong>{loading ? "" : bundles.length}</strong>
      <small>bundles</small>
    </div>

    <div>
      <span>PRICED VALUE</span>
      <strong>
        $
        {total.toLocaleString(undefined, {
          maximumFractionDigits: 0,
        })}
      </strong>
      <small>static estimate</small>
    </div>
  </div>
</div>
      {loading && <div className="gallery-state"><span className="loader" /> Reading prize inventory…</div>}
      {error && <div className="gallery-state error">{error}<button onClick={load}>Try again</button></div>}
      {!loading && !error && bundles.length === 0 && <div className="gallery-state">No bundles are loaded right now.</div>}
      <section className="bundle-grid">
        {bundles.map((bundle, index) => (
          <article className={`bundle-card hue-${hues[index % hues.length]} ${focusBundle === bundle.id.toString() ? "focused" : ""}`} key={bundle.id.toString()}>
            <div className="bundle-top"><div><span>BUNDLE</span><strong>#{bundle.id.toString()}</strong></div><span className="asset-count">{bundle.assets.length} {bundle.assets.length === 1 ? "ASSET" : "ASSETS"}</span></div>
            <div className="bundle-value"><span>KNOWN VALUE</span><strong>{bundle.value ? `$${bundle.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "Unpriced"}</strong></div>
            <div className="asset-list">
              {bundle.assets.map((asset, assetIndex) => {
                const item = details(asset);
                return <div className="asset-row" key={`${asset.assetAddress}-${assetIndex}`}>
                  <div className="asset-icon">{item.symbol.slice(0, 2)}</div>
                  <div className="asset-main"><strong>{item.symbol}</strong><a href={`${BASE_EXPLORER}/address/${asset.assetAddress}`} target="_blank" rel="noreferrer">{short(asset.assetAddress)} ↗</a></div>
                  <div className="asset-amount"><strong>{item.amount}</strong><span>{categoryName[asset.category] || "TOKEN"}{item.usd !== null ? ` · $${item.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ""}</span></div>
                </div>;
              })}
            </div>
            <a className="bundle-link" href={`${BASE_EXPLORER}/token/${BUNDLER_ADDRESS}?a=${bundle.id}`} target="_blank" rel="noreferrer">Inspect bundle on BaseScan ↗</a>
          </article>
        ))}
      </section>
    </main>
  );
}
