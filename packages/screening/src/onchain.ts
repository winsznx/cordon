import {
  createPublicClient,
  defineChain,
  http,
  keccak256,
  toBytes,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import type { EvalPolicy } from "./types";

export const MONAD_TESTNET_ID = 10143;

export const cordonPolicyAbi = [
  {
    type: "function",
    name: "getPolicy",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "minTier", type: "uint8" },
          { name: "freshnessWindow", type: "uint64" },
          { name: "requireCleanBlacklist", type: "bool" },
          { name: "keeper", type: "address" },
          { name: "operating", type: "address" },
          { name: "quarantine", type: "address" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "isGroupAllowed",
    stateMutability: "view",
    inputs: [{ name: "group", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
] as const;

/** bytes32 key for a jurisdiction/group string (keeper and institution must agree). */
export function groupKey(group: string): Hex {
  return keccak256(toBytes(group));
}

export function monadClient(rpcUrl: string): PublicClient {
  const chain = defineChain({
    id: MONAD_TESTNET_ID,
    name: "Monad Testnet",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
  return createPublicClient({ chain, transport: http(rpcUrl) });
}

export interface OnchainPolicy {
  policy: EvalPolicy;
  keeper: Address;
  operating: Address;
  quarantine: Address;
}

export async function readPolicy(client: PublicClient, address: Address): Promise<OnchainPolicy> {
  const p = await client.readContract({ address, abi: cordonPolicyAbi, functionName: "getPolicy" });
  return {
    policy: {
      minTier: p.minTier,
      freshnessWindow: Number(p.freshnessWindow),
      requireCleanBlacklist: p.requireCleanBlacklist,
    },
    keeper: p.keeper,
    operating: p.operating,
    quarantine: p.quarantine,
  };
}

export function isGroupAllowedOnchain(client: PublicClient, address: Address, group: string): Promise<boolean> {
  return client.readContract({
    address,
    abi: cordonPolicyAbi,
    functionName: "isGroupAllowed",
    args: [groupKey(group)],
  });
}
