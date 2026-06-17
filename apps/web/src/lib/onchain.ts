import "server-only";
import { cache } from "react";
import { monadClient, readPolicy } from "@cordon/screening";
import type { Address } from "viem";
import { ENV } from "./env";
import type { Policy } from "./types";

const RPC = process.env.MONAD_RPC_URL ?? "";

/** Read the live on-chain policy. Per-request memoized (React cache). */
export const getPolicy = cache(async (): Promise<Policy | null> => {
  if (!RPC || !ENV.cordonAddress) return null;
  try {
    const { policy, keeper, operating, quarantine } = await readPolicy(
      monadClient(RPC),
      ENV.cordonAddress as Address,
    );
    return { ...policy, keeper, operating, quarantine };
  } catch {
    return null;
  }
});
