#!/usr/bin/env node
/**
 * mcp-server.ts — a hand-rolled MCP server. NO SDK.
 *
 * The one big idea of Part 4: an MCP server is "just" a JSON-RPC loop over
 * stdin/stdout. We read messages from stdin, look at each message's `method`,
 * do the thing, and write a JSON-RPC reply to stdout. That is the entire
 * protocol surface a client (Claude Code) needs to discover and call tools.
 *
 * This lesson (4.1) builds the LOOP and the three required methods:
 *   - initialize   -> announce protocol version + capabilities + server info
 *   - tools/list   -> describe the tools we expose (name + JSON-Schema input)
 *   - tools/call   -> run a tool and return its text result
 *
 * The tools here are deliberately tiny placeholders (echo, add). In 4.2 you
 * swap them for real code-intelligence tools over a JSON store. The loop you
 * build now does not change — that is the point.
 *
 * ── YOUR JOB ──────────────────────────────────────────────────────────────
 * Almost everything is done. There are TWO blanks marked `// TODO`, both in
 * handleRequest(): one in `tools/list` and one in `tools/call`. They are the
 * two places where the tool registry meets the protocol. Fill them in, build,
 * then run the Checkpoint in the README. (Stuck? Diff against ../solution.)
 */

// ---------------------------------------------------------------------------
// Server identity. The reference calls itself "context-layer"; we mirror that
// shape so `claude mcp add` in 4.2 registers a familiar-looking server.
// ---------------------------------------------------------------------------
const SERVER_NAME = "my-context-layer";
const SERVER_VERSION = "0.1.0";
// Echo back the client's protocol version when it offers one; else this default.
const DEFAULT_PROTOCOL_VERSION = "2025-06-18";

// ---------------------------------------------------------------------------
// JSON-RPC types (only the bits we use). A request is `{ method, params, id }`;
// a reply is `{ id, result }` or `{ id, error }`. The `id` matches answer to
// question. That's the whole convention.
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
}

// Standard JSON-RPC error codes.
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

// ---------------------------------------------------------------------------
// Tool registry — the single source of truth for BOTH tools/list and
// tools/call. Add a tool here and it is automatically discoverable AND
// callable. In 4.2 you replace these placeholders; the registry stays.
// ---------------------------------------------------------------------------
interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => string;
}

const TOOLS: ToolDef[] = [
  {
    name: "echo",
    description:
      "Return the `text` argument unchanged. A placeholder tool that proves the call path works end to end.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to echo back." },
      },
      required: ["text"],
    },
    handler: (args) => {
      if (typeof args.text !== "string") {
        throw new Error("echo requires a `text` string.");
      }
      return args.text;
    },
  },
  {
    name: "add",
    description:
      "Add two numbers `a` and `b`. A placeholder tool that proves arguments arrive parsed.",
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "number", description: "First addend." },
        b: { type: "number", description: "Second addend." },
      },
      required: ["a", "b"],
    },
    handler: (args) => {
      if (typeof args.a !== "number" || typeof args.b !== "number") {
        throw new Error("add requires numeric `a` and `b`.");
      }
      return String(args.a + args.b);
    },
  },
];

const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

// ---------------------------------------------------------------------------
// Output helpers — write a single JSON-RPC message as one line to stdout.
// One message per line is what our reader (and the smoke test) expects.
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
// Method dispatch — a plain `switch` on req.method. Read the request, match
// the method, write a reply. This is the heart of the protocol.
// ---------------------------------------------------------------------------
function handleRequest(req: JsonRpcRequest): void {
  // Notifications (no id) expect no response — we just acknowledge silently.
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

    // The client says "handshake done." Nothing to send back.
    case "notifications/initialized":
    case "initialized":
      return;

    case "tools/list": {
      // TODO (blank 1): reply with the list of tools. For each tool in TOOLS,
      // expose its `name`, `description`, and `inputSchema` (NOT its handler —
      // the client never sees your code, only the schema). Build that array and
      // pass it as `{ tools: [...] }` to writeResult(req.id, ...).
      // Hint: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
      writeResult(req.id, { tools: [] }); // <-- replace [] with the mapped array
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
        // TODO (blank 2): run the matched tool's handler with the call's
        // arguments (default to {} if none were sent), then return its text in
        // the MCP content shape. Replace the placeholder line below.
        // Hint: const text = tool.handler(params.arguments ?? {});
        const text = ""; // <-- call the handler instead of returning ""
        writeResult(req.id, { content: [{ type: "text", text }] });
      } catch (err) {
        // Bad args or a tool failure — report it, but keep the loop alive.
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

// ---------------------------------------------------------------------------
// Parse one raw line and dispatch. NEVER throws to the caller — a bad line
// becomes an error reply, and the loop reads the next line as if nothing
// happened. This is what "a bad message can't crash the server" means.
// ---------------------------------------------------------------------------
function processLine(raw: string): void {
  const trimmed = raw.trim();
  if (!trimmed) return; // blank line — ignore

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
    handleRequest(parsed as JsonRpcRequest);
  } catch (err) {
    writeError((parsed as JsonRpcRequest).id ?? null, {
      code: INTERNAL_ERROR,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// The loop. Accumulate stdin bytes, and every time we have a complete line
// (newline-terminated), process it. When stdin closes, flush any trailing
// partial line and exit cleanly.
// ---------------------------------------------------------------------------
function startServer(): void {
  let buffer = "";

  process.stdin.setEncoding("utf8");

  process.stdin.on("data", (chunk: string) => {
    buffer += chunk;
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      processLine(line);
      newlineIndex = buffer.indexOf("\n");
    }
  });

  process.stdin.on("end", () => {
    if (buffer.trim()) processLine(buffer);
    process.exit(0);
  });
}

startServer();
