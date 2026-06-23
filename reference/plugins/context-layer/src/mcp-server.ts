#!/usr/bin/env node
/**
 * mcp-server.ts — a hand-rolled MCP server. NO SDK.
 *
 * The big teaching idea: an MCP server is "just" a JSON-RPC 2.0 loop over
 * stdin/stdout. We read messages from stdin, dispatch by `method`, and write
 * JSON-RPC responses to stdout. That's the whole protocol surface a client
 * (like Claude Code) needs to discover and call tools.
 *
 * We implement exactly three MCP methods:
 *   - initialize   -> announce protocol version + capabilities + server info
 *   - tools/list   -> describe the tools we expose (name + JSON-Schema input)
 *   - tools/call   -> run a tool and return its text result
 *
 * Framing: we support both newline-delimited JSON (one message per line, easy
 * to test by hand) AND Content-Length-framed JSON (the LSP-style framing some
 * clients use). The reader auto-detects which it's getting.
 *
 * Robustness rule: a single bad message must never kill the loop. Parse errors
 * and unknown methods get a JSON-RPC error reply; we keep reading.
 *
 * CLI side-door: `node dist/mcp-server.js --index <path>` indexes a repo and
 * exits, so users can populate the store without speaking JSON-RPC.
 */

import { Store, resolveStorePath } from "./store.js";
import { indexRepo } from "./indexer.js";
import { semanticLookup } from "./tools/semantic-lookup.js";
import { impactCheck } from "./tools/impact-check.js";
import { brainSearch, brainRemember } from "./tools/brain-search.js";

const SERVER_NAME = "context-layer";
const SERVER_VERSION = "0.1.0";
// Echo back the client's protocol version when offered; else use this default.
const DEFAULT_PROTOCOL_VERSION = "2025-06-18";

// ---------------------------------------------------------------------------
// JSON-RPC types (only the bits we use).
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// Standard JSON-RPC error codes.
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

// ---------------------------------------------------------------------------
// Tool registry — the single source of truth for tools/list and tools/call.
// Each tool has a JSON-Schema inputSchema and a handler returning a text string.
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
    handler: (store, args) => semanticLookup(store, args as never),
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
    handler: (store, args) => impactCheck(store, args as never),
  },
  {
    name: "brain_search",
    description:
      "Search persistent cross-session notes (the 'brain') by keyword, ranked by a simple substring/tag score. Use to recall earlier decisions, conventions, or mistakes.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords to search notes for." },
        limit: {
          type: "number",
          description: "Max notes to return (default 5).",
        },
      },
      required: ["query"],
    },
    handler: (store, args) => brainSearch(store, args as never),
  },
  {
    name: "brain_remember",
    description:
      "Append a note to the persistent brain so it can be recalled later via brain_search. Use to record a decision, convention, or lesson worth keeping.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The note to remember." },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional tags to boost future search relevance.",
        },
      },
      required: ["text"],
    },
    handler: (store, args) => brainRemember(store, args as never),
  },
];

const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

// ---------------------------------------------------------------------------
// Output helpers — write a single JSON-RPC message as one line to stdout.
// ---------------------------------------------------------------------------

function writeMessage(msg: unknown): void {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function writeResult(id: JsonRpcRequest["id"], result: unknown): void {
  writeMessage({ jsonrpc: "2.0", id: id ?? null, result });
}

function writeError(id: JsonRpcRequest["id"], error: JsonRpcError): void {
  writeMessage({ jsonrpc: "2.0", id: id ?? null, error });
}

// ---------------------------------------------------------------------------
// Method dispatch.
// ---------------------------------------------------------------------------

function handleRequest(store: Store, req: JsonRpcRequest): void {
  // Notifications (no id) get no response; just acknowledge known ones silently.
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
      // Client handshake completion. Nothing to send back.
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
        // Bad arguments or tool failure — report as an error, keep the loop alive.
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
      if (isNotification) return; // ignore unknown notifications
      writeError(req.id, {
        code: METHOD_NOT_FOUND,
        message: `Method not found: ${req.method}`,
      });
      return;
    }
  }
}

/** Parse one raw line/frame and dispatch. Never throws to the caller. */
function processRawMessage(store: Store, raw: string): void {
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

// ---------------------------------------------------------------------------
// stdin reader — one buffered loop that handles BOTH framings.
//
// We accumulate raw bytes from stdin and repeatedly try to pull a complete
// message off the front of the buffer:
//   - Content-Length framed: `Content-Length: N\r\n\r\n<N bytes of body>`
//     (the LSP-style framing some MCP clients use)
//   - Newline-delimited:     one JSON object per line (easy to test by hand)
//
// Detecting per-message keeps the code simple and avoids any "consume the
// first chunk then re-attach a parser" gymnastics.
// ---------------------------------------------------------------------------

function startServer(store: Store): void {
  let buffer = Buffer.alloc(0);

  function drain(): void {
    for (;;) {
      // Try Content-Length framing first.
      const headerEnd = buffer.indexOf("\r\n\r\n");
      const newlineEnd = buffer.indexOf("\n");

      const looksFramed =
        headerEnd !== -1 &&
        /Content-Length:/i.test(buffer.subarray(0, headerEnd).toString("utf8"));

      if (looksFramed) {
        const header = buffer.subarray(0, headerEnd).toString("utf8");
        const match = header.match(/Content-Length:\s*(\d+)/i);
        const length = match ? Number(match[1]) : 0;
        const bodyStart = headerEnd + 4;
        if (buffer.length < bodyStart + length) return; // wait for the full body
        const body = buffer
          .subarray(bodyStart, bodyStart + length)
          .toString("utf8");
        buffer = buffer.subarray(bodyStart + length);
        processRawMessage(store, body);
        continue;
      }

      // Otherwise, pull one newline-delimited line.
      if (newlineEnd === -1) return; // no complete line yet
      const line = buffer.subarray(0, newlineEnd).toString("utf8");
      buffer = buffer.subarray(newlineEnd + 1);
      processRawMessage(store, line);
    }
  }

  process.stdin.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    drain();
  });

  // stdin closed: flush any final un-terminated line, then exit cleanly.
  process.stdin.on("end", () => {
    if (buffer.length) processRawMessage(store, buffer.toString("utf8"));
    process.exit(0);
  });
}

// ---------------------------------------------------------------------------
// CLI entry: --index <path> indexes and exits; otherwise run the server loop.
// ---------------------------------------------------------------------------

function main(): void {
  const argv = process.argv.slice(2);
  const storePath = resolveStorePath();
  const store = Store.load(storePath);

  const indexFlag = argv.indexOf("--index");
  if (indexFlag !== -1) {
    const target = argv[indexFlag + 1] ?? process.cwd();
    const result = indexRepo(store, target);
    process.stderr.write(
      `Indexed ${result.fileCount} files (${result.symbolCount} symbols) from ${result.root}\n` +
        `Store written to ${store.path}\n`,
    );
    process.exit(0);
  }

  startServer(store);
}

main();
