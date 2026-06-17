import type { CleanverseClient, UserData } from "@cordon/cleanverse";
import { zeroHash } from "viem";
import { attestationHash } from "./attestation";
import { evaluate, parseTier } from "./evaluate";
import type { EvalPolicy, ScreenResult } from "./types";

export interface ScreenArgs {
  client: CleanverseClient;
  chain: string;
  symbol: string;
  sender: string;
  policy: EvalPolicy;
  isGroupAllowed?: (group: string) => boolean;
  /** unix seconds */
  nowSec: number;
}

/** Screen one inbound sender against policy using the real Cleanverse API. */
export async function screenSender(args: ScreenArgs): Promise<ScreenResult> {
  const { client, chain, symbol, sender, policy, isGroupAllowed, nowSec } = args;

  const apass = await client.queryApassSafe(chain, sender);

  // query_user can 404 even for verified users (sandbox quirk); absence of a
  // blacklist signal is not itself a failure.
  let user: UserData | null = null;
  try {
    user = await client.queryUser(chain, symbol, sender);
  } catch {
    user = null;
  }

  const verdict = evaluate({ apass, user, policy, isGroupAllowed, nowSec });

  return {
    ...verdict,
    sender,
    apass,
    user,
    tier: apass ? parseTier(apass) : null,
    attestationHash: apass ? attestationHash(apass, nowSec) : zeroHash,
    screenedAt: nowSec,
  };
}
