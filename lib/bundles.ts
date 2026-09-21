import { formatUnits, type Address } from "viem";
import { bundlerAbi, erc20Abi } from "./abis";
import { BUNDLER_ADDRESS, STATIC_TOKENS } from "./config";
import { publicClient } from "./client";

export type BundleAsset = {
  category: number;
  assetAddress: Address;
  id: bigint;
  amount: bigint;
  symbol?: string;
  decimals?: number;
};

export type BundleDetails = {
  id: bigint;
  assets: BundleAsset[];
  value: number;
};

export const CATEGORY_NAMES = ["ERC-20", "ERC-721", "ERC-1155"];

export function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function assetDetails(asset: BundleAsset) {
  const known = STATIC_TOKENS[asset.assetAddress.toLowerCase()];
  const symbol =
    asset.symbol || known?.symbol || shortAddress(asset.assetAddress);

  if (asset.category === 0) {
    const amount = Number(
      formatUnits(
        asset.amount,
        asset.decimals ?? known?.decimals ?? 18,
      ),
    );

    return {
      symbol,
      amount: amount.toLocaleString(undefined, {
        maximumFractionDigits: 5,
      }),
      usd: known ? amount * known.price : null,
    };
  }

  return {
    symbol,
    amount:
      asset.category === 1
        ? `Token #${asset.id}`
        : `${asset.amount || BigInt(1)} × ID ${asset.id}`,
    usd: null,
  };
}

export async function loadBundleDetails(
  id: bigint,
): Promise<BundleDetails> {
  const raw = await publicClient.readContract({
    address: BUNDLER_ADDRESS,
    abi: bundlerAbi,
    functionName: "tokensInBundle",
    args: [id],
  });

  const assets = await Promise.all(
    raw.map(async (item) => {
      const asset: BundleAsset = {
        category: Number(item.category),
        assetAddress: item.assetAddress,
        id: item.id,
        amount: item.amount,
      };

      if (asset.category !== 0) {
        return asset;
      }

      try {
        const [decimals, symbol] = await Promise.all([
          publicClient.readContract({
            address: asset.assetAddress,
            abi: erc20Abi,
            functionName: "decimals",
          }),
          publicClient.readContract({
            address: asset.assetAddress,
            abi: erc20Abi,
            functionName: "symbol",
          }),
        ]);

        return {
          ...asset,
          decimals: Number(decimals),
          symbol,
        };
      } catch {
        return asset;
      }
    }),
  );

  return {
    id,
    assets,
    value: assets.reduce(
      (sum, asset) => sum + (assetDetails(asset).usd || 0),
      0,
    ),
  };
}