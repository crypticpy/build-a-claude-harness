#!/usr/bin/env node
/**
 * Unified hook router.
 *
 * One executable, many events. Claude Code calls this file for several hook
 * events; the event name arrives as argv[2] and the hook payload arrives as
 * JSON on stdin. We read both, then dispatch to the right module(s).
 *
 * Two design rules make this safe to wire into every hook:
 *
 *   1. LAZY LOADING. Each branch dynamically import()s only the modules it
 *      needs. A `prompt` event never pays to parse the retrospective code.
 *
 *   2. FAIL SILENT. Every path ends in process.exit(0), and module work is
 *      wrapped so a thrown error, a missing file, or an unset API key is a
 *      no-op — never a crash that blocks the user's turn.
 *
 * Modules that emit text for the model write it to stdout; Claude Code surfaces
 * that as additional context for the event.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Config lives beside this file. A missing/!invalid config degrades to {} so
// every module's `config.x?.y` guard simply turns the feature off.
let config = {};
try {
  const configPath = join(__dirname, "config.json");
  if (existsSync(configPath)) {
    config = JSON.parse(readFileSync(configPath, "utf-8"));
  }
} catch {
  config = {};
}

import { getApiKey } from "./modules/api-key.mjs";

function loadModule(name) {
  return import(`./modules/${name}.mjs`);
}

async function main() {
  let event = {};
  try {
    const input = readFileSync(0, "utf-8");
    event = input ? JSON.parse(input) : {};
  } catch {
    event = {};
  }

  const eventType = process.argv[2];
  if (!eventType) {
    process.exit(0);
  }

  const apiKey = getApiKey(); // null when unset → modules skip the LLM path

  try {
    switch (eventType) {
      case "session-start": {
        // SessionStart: emit a one-shot project snapshot (stack, git, memory).
        const mod = await loadModule("session-start");
        const output = await mod.injectContext(event, config);
        if (output) console.log(output);
        break;
      }

      case "prompt": {
        // UserPromptSubmit: assemble additional context for the model from
        // four read-only sources. Each returns a string or null; we join the
        // non-empty ones and print the block.
        const [contextReport, skillActivation, sessionMemory, editHistory] =
          await Promise.all([
            loadModule("context-report"),
            loadModule("skill-activation"),
            loadModule("session-memory"),
            loadModule("edit-history"),
          ]);

        const outputs = [];

        const ctx = await contextReport.reportContext(event, config);
        if (ctx) outputs.push(ctx);

        const skills = await skillActivation.checkSkills(event, config);
        if (skills) outputs.push(skills);

        const memory = await sessionMemory.injectMemory(event);
        if (memory) outputs.push(memory);

        const editWarning = await editHistory.checkEditHistory(event, config, apiKey);
        if (editWarning) outputs.push(editWarning);

        if (outputs.length > 0) {
          console.log(outputs.join("\n\n"));
        }
        break;
      }

      case "precompact": {
        // PreCompact: one LLM call produces narrative memory + a diagnosis,
        // dispatched to memories/<session>.json and lessons.jsonl.
        const mod = await loadModule("precompact-llm");
        await mod.runPreCompact(event, config, apiKey);
        break;
      }

      case "post-edit": {
        // PostToolUse on Write|Edit: format the file, log the operation, and
        // (cheaply) hint at downstream consumers.
        const [formatLint, rollingLog, impactHint] = await Promise.all([
          loadModule("format-lint"),
          loadModule("rolling-log"),
          loadModule("impact-hint"),
        ]);

        await formatLint.formatFile(event, config);
        await rollingLog.logOperation(event, config, apiKey);

        try {
          const hint = await impactHint.emitHint(event, config);
          if (hint) console.log(hint);
        } catch {
          /* impact hint is best-effort */
        }
        break;
      }

      case "post-tool": {
        // PostToolUse on every other tool: log only. Write|Edit are already
        // handled by the post-edit branch, so skip them here to avoid double
        // logging.
        if (event.tool_name === "Write" || event.tool_name === "Edit") break;
        const mod = await loadModule("rolling-log");
        await mod.logOperation(event, config, apiKey);
        break;
      }

      case "stop": {
        // Stop: run quality gates (type-check, etc.) and emit a self-check
        // when the last turn made significant edits.
        const [gates, verify] = await Promise.all([
          loadModule("quality-gates"),
          loadModule("verification-check"),
        ]);
        await gates.runGates(event, config);
        const verifyOutput = await verify.runVerification(event, config);
        if (verifyOutput) console.log(verifyOutput);
        break;
      }

      case "retrospective": {
        // On-demand /retrospective: cross-session analysis (recall role).
        const mod = await loadModule("deep-retrospective");
        const result = await mod.retrospective(config);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case "evolve": {
        // On-demand /evolve: aggregate lessons → proposals (recall role).
        const mod = await loadModule("self-evolution");
        const result = await mod.evolve(config);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      default:
        // Unknown event: do nothing, exit clean.
        break;
    }
  } catch {
    /* never let a hook crash the user's turn */
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
