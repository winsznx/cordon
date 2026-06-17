// Types mirror the real Cleanverse sandbox responses
// (https://uatapi.cleanverse.com/api/skills). Verified shapes are marked;
// query_apass/query_user success shapes follow PRD §8 and are refined against
// a real enrolled wallet during Day-0 verification.

export interface ApiEnvelope<T> {
  /** "0000" ok · "0001" param error · "0002" failure */
  code: string;
  message: string;
  data: T;
}

// --- query_chain_config (verified) ---
export interface ChainToken {
  chain: string;
  symbol: string;
  a_symbol: string;
  token_address: string;
  name: string;
  decimals: number;
  icon: string;
  /** "token" | "atoken" */
  token_category: string;
  access_core: string;
  deposit_gateway: string;
}

export interface ChainConfig {
  chain: string;
  chain_id: number;
  chain_name: string;
  chain_token: string;
  explorer: string;
  is_evm: boolean;
  rpc_url: string;
  operator_address: string;
  fee_pay_address: string;
  fee_receive_address: string;
  rent_payer_address: string;
  apass_address: string;
  wallet_core: string;
  supports_gas_sponsor: boolean;
  tokens: ChainToken[];
}

export interface ChainConfigData {
  chains: ChainConfig[];
}

// --- query_apass (verified against a real enrolled Monad identity) ---
export interface ApassData {
  /** numeric tier as a string, e.g. "28" (display name "Silver") */
  tier: string;
  subTier: number;
  group: string;
  subGroup: string;
  /** 1 = active, 2 = frozen. NOTE: real field is `status` (PRD §8 called it `state`). */
  status: number;
  /** unix seconds */
  expirationTime: number;
  currentKycHash: string;
  cvRecordId: string | null;
}

// --- query_user (PRD §8) ---
export interface UserData {
  status: string;
  blacklist_reason: string;
  deposit_address?: string;
}

// --- query_deposit_institutions (verified) ---
export interface WhitelistEntry {
  service_name: string;
  entity_name: string;
  category: string;
  icon: string;
}

export interface TokenWhitelist {
  origin_symbol: string;
  origin_token_address: string;
  atoken_symbol: string;
  atoken_address: string;
  whitelist: WhitelistEntry[];
}

export interface DepositInstitutionsData {
  chain: string;
  token_whitelist: TokenWhitelist[];
}

// --- query_deposit_address (verified) ---
export interface DepositAddressData {
  address: string;
  chain: string;
  txHash: string;
  aPassAddress: string;
  depositUSDCWallet: string;
  depositUSDTWallet: string;
}

// --- register_data (verified) ---
export interface RegisterData {
  user_address: string;
  deposit_address: string;
  chain: string;
  symbol: string;
}

// --- get_magiclink (verified) ---
export interface MagiclinkData {
  register_url: string;
}
