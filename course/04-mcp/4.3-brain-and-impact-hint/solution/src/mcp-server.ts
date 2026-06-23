#!/usr/bin/env node
/**
 * mcp-server.ts — the same hand-rolled JSON-RPC loop from 4.1, now with REAL
 * tools over a JSON store, plus a `--index` side-door to populate that store.
 *
 * What changed from 4.1: the two placeholder tools (echo, add) are gone. In
 * their place are semantic_lookup and impact_check, each backed by the indexed
 * store. The loop itself is byte-for-byte the same idea — read a line, dispatch
 * by method, write a reply, survive bad input. That stability is the lesson.
 *
 * CLI side-door: `node dist/mcp-server.js --index <path>` indexes a repo and
 * exits, so you can populate the store without speaking JSON-RPC.
 */

import { Store, resolveStorePath } from "./store.js";
import { indexRepo } from "./indexer.js";
import { semanticLookup } from "./tools/semantic-lookup.js";
import { impactCheck } from "./tools/impact-check.js";
import { brainSearch } from "./tools/brain-search.js";

const SERVER_NAME = "my-context-layer";
const SERVER_VERSION = "0.3.0";
const DEFAULT_PROTOCOL_VERSION = "2025-06-18";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

interface JsonRpcError {
  code: number;
  message: string;
}

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

// ---------------------------------------------------------------------------
// Tool registry — now the tools take the Store and return text. tools/list and
// tools/call both read from this one array, exactly as in 4.1.
// ---------------------------------------------------------------------------
interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (store: Store, args: Record<string, unknown>) => string;
}

const TOOLS: ToolDef[] = [
  {
    name: "semantic_lookup",
    description:
      "Return a file's stored summary and exported symbol list WITHOUT its full contents. Use when you only need to know what a file is and what it exports.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "A single repo-relative file path.",
        },
        paths: {
          type: "array",
          items: { type: "string" },
          description: "Several file paths to look up at once.",
        },
      },
    },
    handler: (store, args) => semanticLookup(store, args),
  },
  {
    name: "impact_check",
    description:
      "List the downstream consumers (files that import/reference) of a given file or exported symbol. Use before changing or deleting something to see what might break.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File you intend to change." },
        symbol: {
          type: "string",
          description: "Exported symbol name to trace.",
        },
      },
    },
    handler: (store, args) => impactCheck(store, args),
  },
  {
    name: "brain_search",
    description:
      "Search the persistent brain — the lessons accumulated in lessons.jsonl across sessions — by keyword, ranked by a simple score. Use to recall earlier decisions, mistakes, or conventions.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Keywords to search lessons for.",
        },
        limit: {
          type: "number",
          description: "Max lessons to return (default 5).",
        },
      },
      required: ["query"],
    },
    // brain_search reads lessons.jsonl, not the code Store — the `store` arg is
    // unused here. The registry shape stays uniform so tools/list and tools/call
    // don't need a special case.
    handler: (_store, args) => brainSearch(args),
  },
];

const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

function writeMessage(msg: unknown): void {
  process.stdout.write(JSON.stringify(msg) + "\n");
}
function writeResult(id: JsonRpcRequest["id"], result: unknown): void {
  writeMessage({ jsonrpc: "2.0", id: id ?? null, result });
}
function writeError(id: JsonRpcRequest["id"], error: JsonRpcError): void {
  writeMessage({ jsonrpc: "2.0", id: id ?? null, error });
}

function handleRequest(store: Store, req: JsonRpcRequest): void {
  const isNotification = req.id === undefined || req.id === null;

  switch (req.method) {
    case "initialize": {
      const params = (req.params ?? {}) as { protocolVersion?: string };
      writeResult(req.id, {
        protocolVersion: params.protocolVersion ?? DEFAULT_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });
      return;
    }

    case "notifications/initialized":
    case "initialized":
      return;

    case "tools/list": {
      writeResult(req.id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });
      return;
    }

    case "tools/call": {
      const params = (req.params ?? {}) as {
        name?: string;
        arguments?: Record<string, unknown>;
      };
      const tool = params.name ? TOOL_BY_NAME.get(params.name) : undefined;
      if (!tool) {
        writeError(req.id, {
          code: METHOD_NOT_FOUND,
          message: `Unknown tool: ${params.name ?? "(none)"}`,
        });
        return;
      }
      try {
        const text = tool.handler(store, params.arguments ?? {});
        writeResult(req.id, { content: [{ type: "text", text }] });
      } catch (err) {
        writeError(req.id, {
          code: INVALID_PARAMS,
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    case "ping":
      writeResult(req.id, {});
      return;

    default: {
      if (isNotification) return;
      writeError(req.id, {
        code: METHOD_NOT_FOUND,
        message: `Method not found: ${req.method}`,
      });
      return;
    }
  }
}

function processLine(store: Store, raw: string): void {
  const trimmed = raw.trim();
  if (!trimmed) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    writeError(null, {
      code: PARSE_ERROR,
      message: "Parse error: invalid JSON.",
    });
    return;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as JsonRpcRequest).method !== "string"
  ) {
    writeError((parsed as JsonRpcRequest)?.id ?? null, {
      code: INVALID_REQUEST,
      message: "Invalid request: expected a JSON-RPC object with a 'method'.",
    });
    return;
  }

  try {
    handleRequest(store, parsed as JsonRpcRequest);
  } catch (err) {
    writeError((parsed as JsonRpcRequest).id ?? null, {
      code: INTERNAL_ERROR,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

function startServer(store: Store): void {
  let buffer = "";
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", (chunk: string) => {
    buffer += chunk;
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      processLine(store, line);
      newlineIndex = buffer.indexOf("\n");
    }
  });

  process.stdin.on("end", () => {
    if (buffer.trim()) processLine(store, buffer);
    process.exit(0);
  });
}

// ---------------------------------------------------------------------------
// CLI entry: `--index <path>` indexes and exits; otherwise run the server loop.
// ---------------------------------------------------------------------------
function main(): void {
  const argv = process.argv.slice(2);
  const store = Store.load(resolveStorePath());

  const indexFlag = argv.indexOf("--index");
  if (indexFlag !== -1) {
    const target = argv[indexFlag + 1] ?? process.cwd();
    const result = indexRepo(store, target);
    // Status goes to STDERR so it never pollutes the JSON-RPC stream on stdout.
    process.stderr.write(
      `Indexed ${result.fileCount} files (${result.symbolCount} symbols) from ${result.root}\n` +
        `Store written to ${store.path}\n`,
    );
    process.exit(0);
  }

  startServer(store);
}

main();
