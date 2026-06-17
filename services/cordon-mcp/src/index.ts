import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { type Request, type Response } from "express";
import { loadConfig, type McpConfig } from "./config";
import { registerCordonTools } from "./tools";

const NAME = "cordon-mcp";
const VERSION = "0.1.0";

// Never write to stdout: in stdio mode it is the JSON-RPC channel. All logs go to stderr.
function log(message: string): void {
  console.error(`[${NAME}] ${message}`);
}

function createServer(cfg: McpConfig): McpServer {
  const server = new McpServer(
    { name: NAME, version: VERSION },
    {
      instructions:
        "Cordon is an inbound compliance firewall for AI-agent wallets. Use `screen_sender` before crediting any inbound payment: a 'quarantined' verdict means the funds are non-compliant and must be held, never spent. Use `get_policy` to read the rules.",
    },
  );
  registerCordonTools(server, cfg);
  return server;
}

async function startStdio(cfg: McpConfig): Promise<void> {
  const server = createServer(cfg);
  await server.connect(new StdioServerTransport());
  log(`stdio transport ready · contract ${cfg.cordonAddress}`);
  const shutdown = (): void => void server.close().finally(() => process.exit(0));
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

const methodNotAllowed = (_req: Request, res: Response): void => {
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null });
};

async function startHttp(cfg: McpConfig): Promise<void> {
  const app = express();
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true, service: NAME, version: VERSION, contract: cfg.cordonAddress });
  });

  // Stateless Streamable HTTP: a fresh server + transport per request.
  app.post("/mcp", async (req: Request, res: Response) => {
    const server = createServer(cfg);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      Promise.all([transport.close(), server.close()]).catch((err) =>
        log(`cleanup error: ${err instanceof Error ? err.message : String(err)}`),
      );
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      log(`request error: ${err instanceof Error ? err.message : String(err)}`);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
      }
    }
  });
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  const server = app.listen(cfg.port, cfg.host, () => {
    log(`http transport on ${cfg.host}:${cfg.port}/mcp · contract ${cfg.cordonAddress}`);
  });

  const shutdown = (): void => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5_000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  if (cfg.transport === "http") await startHttp(cfg);
  else await startStdio(cfg);
}

main().catch((err) => {
  log(`fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
