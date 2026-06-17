import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpConfig } from "./config";
import {
  getPolicySnapshot,
  REASON_CATALOG,
  safeMessage,
  screenMany,
  screenOne,
  type PolicySnapshot,
  type ScreenDecision,
} from "./core";

const screenOutputShape = {
  address: z.string(),
  verdict: z.enum(["cleared", "quarantined"]),
  cleared: z.boolean(),
  reasonCode: z.number(),
  reasonLabel: z.string(),
  tier: z.number().nullable(),
  group: z.string().nullable(),
  hasApass: z.boolean(),
  attestationHash: z.string(),
  screenedAt: z.number(),
  recommendation: z.string(),
  policy: z.object({
    minTier: z.number(),
    freshnessWindow: z.number(),
    requireCleanBlacklist: z.boolean(),
  }),
  contract: z.string(),
};

const policyOutputShape = {
  minTier: z.number(),
  freshnessWindow: z.number(),
  requireCleanBlacklist: z.boolean(),
  contract: z.string(),
  keeper: z.string(),
  operating: z.string(),
  quarantine: z.string(),
  explorer: z.string(),
};

function freshnessLabel(seconds: number): string {
  const days = Math.round(seconds / 86_400);
  return days >= 1 ? `${days}d` : `${seconds}s`;
}

function renderScreen(d: ScreenDecision): string {
  const lines = [
    `VERDICT: ${d.verdict.toUpperCase()}${d.cleared ? "" : ` — ${d.reasonLabel}`}`,
    `Sender:      ${d.address}`,
    `Tier:        ${d.tier === null ? "none (no A-Pass)" : d.tier}`,
    d.group ? `Group:       ${d.group}` : null,
    `Policy:      minTier ${d.policy.minTier} · freshness ${freshnessLabel(d.policy.freshnessWindow)} · blacklist ${d.policy.requireCleanBlacklist ? "enforced" : "advisory"}`,
    `Attestation: ${d.attestationHash}`,
    `Contract:    ${d.contract}`,
    "",
    `→ ${d.recommendation}`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

function renderPolicy(p: PolicySnapshot): string {
  return [
    "Cordon live on-chain policy",
    `  minTier:          ${p.minTier}`,
    `  freshnessWindow:  ${freshnessLabel(p.freshnessWindow)}`,
    `  blacklist:        ${p.requireCleanBlacklist ? "enforced" : "advisory"}`,
    `  contract:         ${p.contract}`,
    `  keeper:           ${p.keeper}`,
    `  operating wallet: ${p.operating}`,
    `  quarantine wallet:${p.quarantine}`,
    `  explorer:         ${p.explorer}`,
  ].join("\n");
}

function errorResult(err: unknown) {
  return { content: [{ type: "text" as const, text: `Screen failed: ${safeMessage(err)}` }], isError: true };
}

export function registerCordonTools(server: McpServer, cfg: McpConfig): void {
  server.registerTool(
    "screen_sender",
    {
      title: "Screen an inbound payment sender",
      description:
        "Before crediting or accepting an inbound payment, screen the sender wallet against Cordon's live on-chain compliance policy and the Cleanverse A-Pass identity registry. Returns a verdict (cleared | quarantined), the failing reason, the sender's KYC tier and group, and a regulator-anchorable attestation hash. Call this whenever your agent is about to receive funds from an address it does not already trust — a 'quarantined' verdict means the funds must be held, never spent.",
      inputSchema: { address: z.string().describe("The 0x sender wallet address to screen.") },
      outputSchema: screenOutputShape,
    },
    async ({ address }) => {
      try {
        const decision = await screenOne(cfg, address);
        return { content: [{ type: "text", text: renderScreen(decision) }], structuredContent: decision };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "screen_batch",
    {
      title: "Screen multiple inbound senders",
      description:
        "Screen up to 25 sender wallet addresses against the live policy in one call — useful when reconciling several inbound payments at once. Returns one decision per valid address plus an errors list for any that could not be screened.",
      inputSchema: {
        addresses: z
          .array(z.string())
          .min(1)
          .max(25)
          .describe("The 0x sender wallet addresses to screen (1–25)."),
      },
      outputSchema: {
        count: z.number(),
        results: z.array(z.object(screenOutputShape)),
        errors: z.array(z.object({ address: z.string(), error: z.string() })),
      },
    },
    async ({ addresses }) => {
      try {
        const { results, errors } = await screenMany(cfg, addresses);
        const summary = [
          `Screened ${results.length}/${addresses.length} addresses.`,
          ...results.map((d) => `  ${d.verdict === "cleared" ? "✓" : "✗"} ${d.address} — ${d.reasonLabel}`),
          ...errors.map((e) => `  ! ${e.address} — ${e.error}`),
        ].join("\n");
        return {
          content: [{ type: "text", text: summary }],
          structuredContent: { count: results.length, results, errors },
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "get_policy",
    {
      title: "Get the live Cordon policy",
      description:
        "Read the current on-chain compliance policy Cordon enforces: minimum KYC tier, A-Pass freshness window, blacklist enforcement, and the policy/keeper/operating/quarantine addresses. Call this to understand the rules a sender is screened against.",
      inputSchema: {},
      outputSchema: policyOutputShape,
    },
    async () => {
      try {
        const snapshot = await getPolicySnapshot(cfg);
        return { content: [{ type: "text", text: renderPolicy(snapshot) }], structuredContent: snapshot };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerResource(
    "cordon-policy",
    "cordon://policy",
    {
      title: "Cordon live policy",
      description: "The current on-chain compliance policy as JSON.",
      mimeType: "application/json",
    },
    async (uri) => {
      try {
        const snapshot = await getPolicySnapshot(cfg);
        return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(snapshot, null, 2) }] };
      } catch (err) {
        throw new Error(`Failed to read Cordon policy: ${safeMessage(err)}`);
      }
    },
  );

  server.registerResource(
    "cordon-reasons",
    "cordon://reasons",
    {
      title: "Cordon quarantine reasons",
      description: "The catalog of reasons a sender can be quarantined, in on-chain enum order.",
      mimeType: "application/json",
    },
    async (uri) => {
      return {
        contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(REASON_CATALOG, null, 2) }],
      };
    },
  );
}
