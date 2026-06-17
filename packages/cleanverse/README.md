# @usecordon/cleanverse

Typed REST client for the **Cleanverse** verified-finance sandbox — the identity and value rails behind [Cordon](https://github.com/winsznx/cordon). One small, dependency-light client over the open Cleanverse Skills API: resolve live chain config, read an address's **A-Pass** (tier, status, group, freshness, KYC hash), check blacklist signals, and mint magiclinks.

```bash
npm i @usecordon/cleanverse viem
```

> ESM-only. `viem` is a peer-ish dependency you install alongside (used for address types). Node ≥ 18.

## Quick start

```ts
import { CleanverseClient } from "@usecordon/cleanverse";

const cleanverse = new CleanverseClient(); // defaults to the public sandbox

// Read an address's A-Pass. queryApassSafe returns null instead of throwing
// when the address has no A-Pass (API code 0002).
const apass = await cleanverse.queryApassSafe("monad", "0x83C1…65Bb");
if (apass) {
  console.log(apass.tier, apass.status, apass.group, apass.expirationTime);
}
```

## Client

```ts
new CleanverseClient(opts?: { baseUrl?: string; timeoutMs?: number })
```

`baseUrl` defaults to `process.env.CLEANVERSE_API_BASE` or the public sandbox; `timeoutMs` defaults to `30_000`.

| Method | Returns | Notes |
|---|---|---|
| `queryChainConfig()` | `ChainConfigData` | live chain + token addresses (nothing hardcoded) |
| `queryApass(chain, address)` | `ApassData` | throws `CleanverseError` if no A-Pass |
| `queryApassSafe(chain, address)` | `ApassData \| null` | returns `null` for "no A-Pass" (code `0002`) |
| `queryUser(chain, symbol, address)` | `UserData` | blacklist / status signal |
| `queryDepositInstitutions(chain, symbol)` | `DepositInstitutionsData` | whitelisted institutions |
| `queryDepositAddress(chain, address)` | `DepositAddressData` | deposit address for an account |
| `registerData(chain, symbol, address)` | `RegisterData` | register an account |
| `getMagiclink()` | `MagiclinkData` | enrolment magiclink |

All calls reject with `CleanverseError` (carrying `code`, `apiMessage`, `endpoint`) on a non-OK API envelope.

## Types

`ApassData` is the core identity record:

```ts
interface ApassData {
  tier: string;            // numeric tier as a string, e.g. "28"
  subTier: number;
  group: string;
  subGroup: string;
  status: number;          // 1 = active, 2 = frozen
  expirationTime: number;  // unix seconds
  currentKycHash: string;
  cvRecordId: string | null;
}
```

Also exported: `UserData`, `ChainConfig`, `ChainConfigData`, `ChainToken`, `DepositInstitutionsData`, `DepositAddressData`, `RegisterData`, `MagiclinkData`, `CleanverseError`, `selectChain`, `selectToken`, and `resolveChain` / `ResolvedChain`.

## Resolve a chain

```ts
import { CleanverseClient, resolveChain } from "@usecordon/cleanverse";

const config = await new CleanverseClient().queryChainConfig();
const monad = resolveChain(config, "monad"); // { chainId, ausdc, accessCore, apass, … }
```

## License

MIT — part of [Cordon](https://github.com/winsznx/cordon).
