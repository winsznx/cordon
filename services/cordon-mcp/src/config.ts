import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getAddress, isAddress, type Address } from "viem";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");

/** The CordonPolicy deployed on Monad testnet — public, safe as a fallback. */
const DEFAULT_CORDON_ADDRESS = "0x244198CFA8660BE9B47961E3C061DFA90622d2B0";

function loadDotEnv(): void {
  const p = resolve(ROOT, ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && m[1] && process.env[m[1]] === undefined) process.env[m[1]] = m[2] ?? "";
  }
}

function toAddress(value: string, source: string): Address {
  if (!isAddress(value)) throw new Error(`${source} must be a valid 0x address, got: ${value}`);
  return getAddress(value);
}

function resolveCordonAddress(): Address {
  const fromEnv = process.env.CORDON_ADDRESS ?? process.env.NEXT_PUBLIC_CORDON_ADDRESS;
  if (fromEnv) return toAddress(fromEnv, "CORDON_ADDRESS");
  const deployments = resolve(ROOT, "deployments/monad.json");
  if (existsSync(deployments)) {
    try {
      const parsed = JSON.parse(readFileSync(deployments, "utf8")) as {
        contracts?: { CordonPolicy?: { address?: string } };
      };
      const addr = parsed.contracts?.CordonPolicy?.address;
      if (addr) return toAddress(addr, "deployments/monad.json CordonPolicy.address");
    } catch {
      // fall through to the public default
    }
  }
  return getAddress(DEFAULT_CORDON_ADDRESS);
}

export interface McpConfig {
  rpcUrl: string;
  cordonAddress: Address;
  cleanverseBase: string | undefined;
  explorer: string;
  transport: "stdio" | "http";
  port: number;
  host: string;
}

export function loadConfig(): McpConfig {
  loadDotEnv();
  const rpcUrl = process.env.MONAD_RPC_URL;
  if (!rpcUrl) throw new Error("missing required env: MONAD_RPC_URL");

  const port = Number(process.env.PORT ?? 8080);
  const explicit = process.env.MCP_TRANSPORT;
  const transport: "stdio" | "http" =
    explicit === "stdio" || explicit === "http" ? explicit : process.env.PORT ? "http" : "stdio";

  return {
    rpcUrl,
    cordonAddress: resolveCordonAddress(),
    cleanverseBase: process.env.CLEANVERSE_API_BASE,
    explorer: (process.env.MONAD_EXPLORER ?? "https://testnet.monadvision.com/").replace(/\/+$/, ""),
    transport,
    port,
    host: process.env.HOST ?? "0.0.0.0",
  };
}
