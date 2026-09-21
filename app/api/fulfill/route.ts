import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import { createPublicClient, encodeFunctionData, http } from "viem";
import { base } from "viem/chains";
import { lootboxAbi } from "@/lib/abis";
import { LOOTBOX_ADDRESS } from "@/lib/config";

export const runtime = "nodejs";
const SAFETY_SECONDS = BigInt(30);

export async function POST(request: Request) {
  try {
    const { requestId: rawId } = await request.json();
    if (typeof rawId !== "string" || !/^\d+$/.test(rawId)) return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    const requestId = BigInt(rawId);
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    const walletId = process.env.PRIVY_RANDOMNESS_WALLET_ID;
    const secret = process.env.LOOTBOX_ENTROPY_SECRET;
    const rpc = process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";
    if (!appId || !appSecret || !walletId || !secret) return NextResponse.json({ error: "Server wallet is not configured" }, { status: 503 });
    if (secret.length < 32) return NextResponse.json({ error: "LOOTBOX_ENTROPY_SECRET must be at least 32 characters" }, { status: 500 });

    const publicClient = createPublicClient({ chain: base, transport: http(rpc) });
    const draw = await publicClient.readContract({ address: LOOTBOX_ADDRESS, abi: lootboxAbi, functionName: "draws", args: [requestId] });
    if (draw[0] === "0x0000000000000000000000000000000000000000") return NextResponse.json({ error: "Draw does not exist" }, { status: 404 });
    if (Number(draw[2]) === 2) return NextResponse.json({ status: "already-fulfilled", bundleId: draw[5].toString() }, { status: 409 });
    if (Number(draw[2]) !== 1) return NextResponse.json({ error: "Draw is not pending" }, { status: 409 });
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (now + SAFETY_SECONDS >= draw[6]) return NextResponse.json({ error: "Draw is too close to its refund deadline" }, { status: 409 });

    const entropy = `0x${createHmac("sha256", secret).update(`${base.id}:${LOOTBOX_ADDRESS.toLowerCase()}:${requestId}`).digest("hex")}` as `0x${string}`;
    const data = encodeFunctionData({ abi: lootboxAbi, functionName: "fulfillDraw", args: [requestId, entropy] });
    const privy = new PrivyClient({ appId, appSecret });
    const result = await privy.wallets().ethereum().sendTransaction(walletId, {
      caip2: `eip155:${base.id}`,
      params: { transaction: { to: LOOTBOX_ADDRESS, data, value: "0x0", chain_id: base.id } },
    });
    return NextResponse.json({ status: "submitted", hash: result.hash });
  } catch (reason) {
    console.error("fulfill route failed", reason instanceof Error ? reason.message : "unknown error");
    return NextResponse.json({ error: "Could not submit fulfillment" }, { status: 500 });
  }
}
