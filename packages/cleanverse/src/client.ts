import type {
  ApiEnvelope,
  ApassData,
  ChainConfig,
  ChainConfigData,
  ChainToken,
  DepositAddressData,
  DepositInstitutionsData,
  MagiclinkData,
  RegisterData,
  UserData,
} from "./types";

const DEFAULT_BASE = "https://uatapi.cleanverse.com/api/skills";
const OK = "0000";

export class CleanverseError extends Error {
  constructor(
    readonly code: string,
    readonly apiMessage: string,
    readonly endpoint: string,
  ) {
    super(`[${endpoint}] ${code}: ${apiMessage}`);
    this.name = "CleanverseError";
  }
}

export interface CleanverseClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

/** Typed client for the real Cleanverse `clevrpay` sandbox REST surface. */
export class CleanverseClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(opts: CleanverseClientOptions = {}) {
    const base = opts.baseUrl ?? process.env.CLEANVERSE_API_BASE ?? DEFAULT_BASE;
    this.baseUrl = base.replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? 30_000;
  }

  private async call<T>(
    endpoint: string,
    method: "GET" | "POST",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/${endpoint}`, {
        method,
        headers: { "content-type": "application/json", accept: "application/json" },
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      let env: ApiEnvelope<T>;
      try {
        env = JSON.parse(text) as ApiEnvelope<T>;
      } catch {
        throw new CleanverseError(
          String(res.status),
          `non-JSON response: ${text.slice(0, 200)}`,
          endpoint,
        );
      }
      if (env.code !== OK) {
        throw new CleanverseError(env.code, env.message, endpoint);
      }
      return env.data;
    } finally {
      clearTimeout(timer);
    }
  }

  queryChainConfig(): Promise<ChainConfigData> {
    return this.call<ChainConfigData>("query_chain_config", "GET");
  }

  queryApass(chain: string, address: string): Promise<ApassData> {
    return this.call<ApassData>("query_apass", "POST", { chain, address });
  }

  /** Returns null when the address has no A-Pass (code 0002), else the record. */
  async queryApassSafe(chain: string, address: string): Promise<ApassData | null> {
    try {
      return await this.queryApass(chain, address);
    } catch (e) {
      if (e instanceof CleanverseError && e.code === "0002") return null;
      throw e;
    }
  }

  queryUser(chain: string, symbol: string, address: string): Promise<UserData> {
    return this.call<UserData>("query_user", "POST", { chain, symbol, address });
  }

  queryDepositInstitutions(chain: string, symbol: string): Promise<DepositInstitutionsData> {
    return this.call<DepositInstitutionsData>("query_deposit_institutions", "POST", { chain, symbol });
  }

  queryDepositAddress(chain: string, address: string): Promise<DepositAddressData> {
    return this.call<DepositAddressData>("query_deposit_address", "POST", { chain, address });
  }

  registerData(chain: string, symbol: string, address: string): Promise<RegisterData> {
    return this.call<RegisterData>("register_data", "POST", { chain, symbol, address });
  }

  getMagiclink(): Promise<MagiclinkData> {
    return this.call<MagiclinkData>("get_magiclink", "GET");
  }
}

export function selectChain(config: ChainConfigData, chain: string): ChainConfig {
  const match = config.chains.find((c) => c.chain === chain);
  if (!match) {
    const names = config.chains.map((c) => c.chain).join(", ");
    throw new Error(`chain '${chain}' not in query_chain_config (have: ${names})`);
  }
  return match;
}

export function selectToken(chain: ChainConfig, symbol: string): ChainToken {
  const match = chain.tokens.find((t) => t.symbol === symbol);
  if (!match) {
    const names = chain.tokens.map((t) => t.symbol).join(", ");
    throw new Error(`token '${symbol}' not on chain '${chain.chain}' (have: ${names})`);
  }
  return match;
}
