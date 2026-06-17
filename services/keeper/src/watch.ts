import { keccak256, encodePacked, parseAbiItem, type Hex } from "viem";
import { config, publicClient } from "./config";
import { screenAndRecord } from "./record";

const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

/**
 * Watch inbound ausdc Transfers to the holding wallet; screen each sender and
 * anchor the verdict on-chain. The rule-based money path — no AI here.
 */
export function watchInbound(): Promise<never> {
  console.log(`[keeper] watching ausdc ${config.ausdc} → holding ${config.holding} (chain ${config.chainId})`);

  const unwatch = publicClient.watchEvent({
    address: config.ausdc,
    event: transferEvent,
    args: { to: config.holding },
    onLogs: async (logs) => {
      for (const log of logs) {
        const from = log.args.from;
        const value = log.args.value;
        if (!from || value === undefined || !log.transactionHash) continue;

        const depositId: Hex = keccak256(
          encodePacked(["bytes32", "uint256"], [log.transactionHash, BigInt(log.logIndex ?? 0)]),
        );

        try {
          const r = await screenAndRecord({ sender: from, amount: value, depositId });
          console.log(
            `[keeper] inbound ${value} from ${from} → ${r.verdict === 0 ? "CLEARED" : "QUARANTINED"} reason=${r.reason} tx=${r.txHash}`,
          );
        } catch (e) {
          console.error(`[keeper] record failed for ${from}:`, e instanceof Error ? e.message : e);
        }
      }
    },
    onError: (e) => console.error("[keeper] watch error:", e.message),
  });

  process.on("SIGINT", () => {
    unwatch();
    process.exit(0);
  });

  return new Promise<never>(() => {});
}
