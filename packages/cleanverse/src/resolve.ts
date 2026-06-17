import { CleanverseClient, selectChain, selectToken } from "./client";
import type { ChainConfig, ChainToken } from "./types";

export interface ResolvedChain {
  config: ChainConfig;
  ausdc: ChainToken;
  usdc: ChainToken;
}

/** Resolve a chain's live config + token addresses from query_chain_config. */
export async function resolveChain(client: CleanverseClient, chain: string): Promise<ResolvedChain> {
  const config = selectChain(await client.queryChainConfig(), chain);
  return {
    config,
    ausdc: selectToken(config, "ausdc"),
    usdc: selectToken(config, "usdc"),
  };
}
