# @usecordon/screening

The inbound-payment **screening SDK** behind [Cordon](https://github.com/winsznx/cordon) — the compliance firewall for AI-agent wallets. Given a sender address, it resolves the real [Cleanverse](https://www.npmjs.com/package/@usecordon/cleanverse) A-Pass identity, evaluates it against an on-chain risk policy, and returns a verdict plus a selective-disclosure attestation — **no PII, no LLM, fully deterministic rules.**

```bash
npm i @usecordon/screening @usecordon/cleanverse viem
```

> ESM-only. Node ≥ 18.

## Screen a sender

```ts
import { CleanverseClient } from "@usecordon/cleanverse";
import { monadClient, readPolicy, screenSender, Reason } from "@usecordon/screening";

const RPC = process.env.MONAD_RPC_URL!;
const CORDON = "0x244198CFA8660BE9B47961E3C061DFA90622d2B0"; // your CordonPolicy contract

const { policy } = await readPolicy(monadClient(RPC), CORDON);

const r = await screenSender({
  client: new CleanverseClient(),
  chain: "monad",
  symbol: "usdc",
  sender: "0xSENDER",
  policy,
  nowSec: Math.floor(Date.now() / 1000),
});

if (r.verdict === 0) {
  credit(r.sender);                 // cleared — safe to spend
} else {
  hold(r.sender, Reason[r.reason]); // quarantined — never spend; r.reason says why
}
```

`r.attestationHash` = `keccak(cvRecordId · KYC hash · tier · status · screenedAt)` — proves the sender's verified status without putting any personal data on-chain.

## What it evaluates

A sender is **quarantined** for the first failing rule, in on-chain enum order:

| `Reason` | Code | Meaning |
|---|---|---|
| `NoAPass` | 0 | no Cleanverse A-Pass — identity unverifiable |
| `Frozen` | 1 | A-Pass status not active |
| `Blacklisted` | 2 | blacklist signal from `query_user` |
| `TierTooLow` | 3 | verified but tier below the policy minimum |
| `GroupNotAllowed` | 4 | jurisdiction/group not on the allowlist |
| `NearExpiry` | 5 | A-Pass expires within the policy freshness window |

## API

| Export | Purpose |
|---|---|
| `screenSender(args)` | resolve identity + evaluate → `ScreenResult` |
| `evaluate(args)` | **pure** policy evaluation over already-fetched A-Pass/user data |
| `readPolicy(client, address)` | read the live on-chain `Policy` (minTier, freshness, blacklist, wallets) |
| `monadClient(rpcUrl)` | a viem `PublicClient` for Monad testnet |
| `attestationHash(apass, nowSec)` | selective-disclosure hash |
| `parseTier(apass)` | numeric tier |
| `groupKey(group)` / `isGroupAllowedOnchain(...)` | jurisdiction group helpers |
| `Reason`, `VERDICT_CLEARED`, `VERDICT_QUARANTINED` | enums/constants |

`ScreenResult` (`verdict`: `0` cleared / `1` quarantined; `reason`: tier when cleared, `Reason` when quarantined):

```ts
interface ScreenResult {
  verdict: number;
  reason: number;
  cleared: boolean;
  sender: string;
  apass: ApassData | null;
  user: UserData | null;
  tier: number | null;
  attestationHash: `0x${string}`;
  screenedAt: number;
}
```

## Pure evaluation (no network)

`evaluate()` is side-effect-free — ideal for unit tests and custom pipelines:

```ts
import { evaluate } from "@usecordon/screening";

const { verdict, reason, cleared } = evaluate({ apass, user, policy, nowSec });
```

## License

MIT — part of [Cordon](https://github.com/winsznx/cordon).
