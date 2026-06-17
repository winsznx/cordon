# @cordon/mcp

Cordon's inbound-payment compliance screening, exposed as a **Model Context Protocol** server — so an AI agent can screen a payer as a native tool **before it accepts the money**.

One server, two transports:

- **Remote (Streamable HTTP)** — live at `https://cordon-mcp-production.up.railway.app/mcp`.
- **Local (stdio)** — for Claude Desktop and other stdio MCP clients.

## Tools

| Tool | Input | Returns |
|---|---|---|
| `screen_sender` | `address` | verdict (`cleared` \| `quarantined`), reason, tier, group, `attestationHash`, recommendation |
| `screen_batch` | `addresses[]` (1–25) | one decision per address + an errors list |
| `get_policy` | — | live on-chain policy: minTier, freshness, blacklist, keeper/operating/quarantine addresses |

Resources: `cordon://policy` (live policy JSON) · `cordon://reasons` (quarantine-reason catalog).

A `quarantined` verdict means the funds are non-compliant and must be held, never spent.

## Use it now (remote, no install)

```bash
# add to Claude Code (or any MCP client)
claude mcp add --transport http cordon https://cordon-mcp-production.up.railway.app/mcp

# or probe it directly
npx @modelcontextprotocol/inspector --cli https://cordon-mcp-production.up.railway.app/mcp \
  --transport http --method tools/call --tool-name screen_sender --tool-arg address=0xSENDER
```

## Run it locally (stdio, for Claude Desktop)

From the repo root, with `MONAD_RPC_URL` set (in `.env` or the environment):

```jsonc
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "cordon": {
      "command": "npx",
      "args": ["-y", "tsx", "/ABSOLUTE/PATH/TO/cordon/services/cordon-mcp/src/index.ts"],
      "env": { "MCP_TRANSPORT": "stdio", "MONAD_RPC_URL": "https://your-monad-rpc" }
    }
  }
}
```

## Configuration

| Env | Default | Notes |
|---|---|---|
| `MONAD_RPC_URL` | — | **required** — Monad testnet RPC |
| `CORDON_ADDRESS` | deployed `CordonPolicy` | the policy contract to screen against |
| `MCP_TRANSPORT` | `http` if `PORT` set, else `stdio` | force a transport |
| `PORT` / `HOST` | `8080` / `0.0.0.0` | HTTP transport bind |
| `CLEANVERSE_API_BASE` | public sandbox | override the Cleanverse API base |

## Develop

```bash
pnpm --filter @cordon/mcp typecheck
pnpm --filter @cordon/mcp test
MCP_TRANSPORT=http PORT=8123 pnpm --filter @cordon/mcp start   # local HTTP
```
