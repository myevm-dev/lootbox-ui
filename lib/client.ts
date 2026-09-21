import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { PUBLIC_RPC } from "./config";

export const publicClient = createPublicClient({ chain: base, transport: http(PUBLIC_RPC) });
