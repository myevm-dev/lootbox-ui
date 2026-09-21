import type { Address } from "viem";

export const BASE_CHAIN_ID = 8453;
export const BASE_EXPLORER = "https://basescan.org";

export const LOOTBOX_ADDRESS = (process.env.NEXT_PUBLIC_LOOTBOX_CONTRACT_ADDRESS ||
  "0x3dEE0E6c136CA305990Eb6442aF990664f449f6c") as Address;
export const BUNDLER_ADDRESS = (process.env.NEXT_PUBLIC_BUNDLER_CONTRACT_ADDRESS ||
  "0x6fD3f5439aB1C103599385929d5f4c19acdBd264") as Address;
export const TET_ADDRESS = (process.env.NEXT_PUBLIC_TET_TOKEN_ADDRESS ||
  "0xaD5c38BE810C12a873A2A29759495E1Da7D5AC6f") as Address;
export const PUBLIC_RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";

export const STATIC_TOKENS: Record<string, { symbol: string; name: string; price: number; decimals: number }> = {
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": { symbol: "USDC", name: "USD Coin", price: 1, decimals: 6 },
  "0x4200000000000000000000000000000000000006": { symbol: "WETH", name: "Wrapped Ether", price: 2440, decimals: 18 },
  "0x97be14dd8f994a5364573bc035d85309e7cb34de": { symbol: "JitoSOL", name: "Jito Staked SOL", price: 143, decimals: 9 },
  "0x12e96c2bfea6e835cf8dd38a5834fa61cf723736": { symbol: "uDOGE", name: "Universal Dogecoin", price: 0.085, decimals: 8 },
  "0x5ed25e305e08f58afd7995eac72563e6be65a617": { symbol: "uNEAR", name: "Universal NEAR", price: 5.3, decimals: 18 },
  "0xc3de830ea07524a0761646a6a4e4be0e114a3c83": { symbol: "UNI", name: "Uniswap", price: 6.8, decimals: 18 },
  "0xad5c38be810c12a873a2a29759495e1da7d5ac6f": { symbol: "TET", name: "TET", price: 1.5, decimals: 18 },
};

export const BOX_DISPLAY_PRICE = "1,000 TET";
export const BOX_USD_PRICE = 1500;

export const LOOTBOX_DEPLOYMENT_BLOCK = BigInt(
  process.env.NEXT_PUBLIC_LOOTBOX_DEPLOYMENT_BLOCK ||
    "51500000",
);