import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, defineChain, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, "../../..");

function loadDotEnv(): void {
  const p = resolve(ROOT, ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && m[1] && process.env[m[1]] === undefined) process.env[m[1]] = m[2] ?? "";
  }
}
loadDotEnv();

function req(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`missing required env: ${key}`);
  return v;
}

interface Deployments {
  contracts: { CordonPolicy: { address: string } };
}
const deployments = JSON.parse(readFileSync(resolve(ROOT, "deployments/monad.json"), "utf8")) as Deployments;

export const config = {
  rpcUrl: req("MONAD_RPC_URL"),
  chainId: Number(req("MONAD_CHAIN_ID")),
  cordon: deployments.contracts.CordonPolicy.address as Address,
  ausdc: req("AUSDC_ADDRESS") as Address,
  holding: req("HOLDING_WALLET") as Address,
  operating: req("OPERATING_WALLET") as Address,
  quarantine: req("QUARANTINE_WALLET") as Address,
  keeperPrivateKey: req("DEPLOYER_PRIVATE_KEY") as `0x${string}`,
  explorer: process.env.MONAD_EXPLORER ?? "https://testnet.monadvision.com/",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
} as const;

export const monadChain = defineChain({
  id: config.chainId,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
});

export const keeperAccount = privateKeyToAccount(config.keeperPrivateKey);
export const publicClient = createPublicClient({ chain: monadChain, transport: http(config.rpcUrl) });
export const walletClient = createWalletClient({
  account: keeperAccount,
  chain: monadChain,
  transport: http(config.rpcUrl),
});
