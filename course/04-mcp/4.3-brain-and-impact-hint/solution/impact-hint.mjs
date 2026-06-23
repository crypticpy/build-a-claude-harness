// impact-hint.mjs — a PostToolUse nudge. After the model edits a source file
// that OTHER files import, print a one-line reminder to run impact_check.
//
// Push, not pull: the model doesn't have to remember to ask "what depends on
// this?" — the harness surfaces the consumer count the moment it's relevant.
//
// How it knows the consumers: it reads the SAME JSON store your MCP server
// built in 4.2 (the import-edge map). No grep, no shelling out — the index you
// already have is the dependency graph.
//
// Heuristics are STACK-SHAPED. These defaults assume a JS/TS/Python repo (the
// SOURCE_EXTS below). A Rust or Ruby project would tune the extensions and the
// skip list. That's expected — a nudge is only as good as the stack it knows.
//
// Failure mode: silent. If anything throws, do nothing. A hint must NEVER block
// an edit or break the turn (exit 0 always).

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// Source extensions we hint on. Editing a README or a .json config never fires.
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"]);
// Paths we never hint on, even if they're source. Stack-shaped — tune per repo.
const SKIP = [/node_modules/, /\.test\./, /\.spec\./, /__tests__/, /\.d\.ts$/, /dist\//];

/** Same store the MCP server uses: $CONTEXT_LAYER_STORE, else package-relative. */
function resolveStorePath() {
  const override = process.env.CONTEXT_LAYER_STORE;
  if (override && override.trim()) return override;
  return join(HERE, ".store", "brain.json");
}

/** Load the import-edge map: { "<consumer>": ["<import target>", ...], ... }. */
function loadImports(storePath) {
  if (!existsSync(storePath)) return {};
  try {
    const data = JSON.parse(readFileSync(storePath, "utf8"));
    return data.imports ?? {};
  } catch {
    return {};
  }
}

/**
 * Count files that import `editedRel`. Cheap heuristic: an edge matches if the
 * import target's basename equals the edited file's basename (extension-tolerant,
 * e.g. ./logger.js -> logger.ts). Directory-precise resolution is impact_check's
 * job; this nudge only needs a "probably worth checking" signal.
 */
function countImporters(imports, editedRel) {
  const stem = basename(editedRel, extname(editedRel)); // "logger.ts" -> "logger"
  const consumers = [];
  for (const [consumer, targets] of Object.entries(imports)) {
    if (consumer === editedRel) continue; // a file doesn't consume itself
    if (targets.some((t) => basename(String(t), extname(String(t))) === stem)) {
      consumers.push(consumer);
    }
  }
  return consumers;
}

/** Build the hint string, or null if this edit isn't worth a nudge. */
export function impactHint(event) {
  try {
    const toolName = event.tool_name;
    if (toolName !== "Edit" && toolName !== "Write") return null;

    const filePath = event.tool_input?.file_path;
    if (!filePath) return null;
    if (!SOURCE_EXTS.has(extname(filePath))) return null;
    if (SKIP.some((re) => re.test(filePath))) return null;

    // Reduce the edited path to the repo-relative key shape the store uses.
    // (The store keys are relative to the indexed root; we match by basename, so
    // the slashes don't have to line up — a deliberate simplification.)
    const editedRel = filePath.replace(/\\/g, "/");

    const imports = loadImports(resolveStorePath());
    const consumers = countImporters(imports, editedRel);
    if (consumers.length === 0) return null;

    const sample = consumers.slice(0, 3).join(", ");
    const more = consumers.length > 3 ? ` (+${consumers.length - 3} more)` : "";
    const n = consumers.length;
    return (
      `Impact hint: ${basename(editedRel)} is imported by ${n} file${n === 1 ? "" : "s"}: ${sample}${more}. ` +
      `If you changed any exports, run impact_check before continuing.`
    );
  } catch (err) {
    if (process.env.DEBUG) console.error("[impact-hint]", err);
    return null;
  }
}

// --- Run as a hook: read the event JSON from stdin, print any hint, exit 0. ---
// Whatever this prints to stdout surfaces to the model as added context. Claude
// Code wires PostToolUse on Edit|Write to call this. Simulate it yourself:
//   echo '{"tool_name":"Edit","tool_input":{"file_path":"src/logger.ts"}}' | node impact-hint.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  let raw = "";
  try {
    raw = readFileSync(0, "utf-8");
  } catch {
    raw = "";
  }
  let event = {};
  try {
    event = raw ? JSON.parse(raw) : {};
  } catch {
    event = {};
  }
  const hint = impactHint(event);
  if (hint) console.log(hint);
  process.exit(0);
}
