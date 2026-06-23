#!/usr/bin/env node
/**
 * broken-hook.mjs — a hook that fails ON PURPOSE, to prove the session survives.
 *
 * doRiskyWork() throws every time. Your job is to wrap it so the failure is
 * absorbed: caught, optionally logged under DEBUG, and followed by an exit code
 * of 0 so Claude Code sees success.
 *
 * FILL-IN-THE-BLANK: two TODOs. Diff against ../solution/broken-hook.mjs if
 * stuck. When you're done:
 *   echo '{}' | node broken-hook.mjs ; echo "exit=$?"
 * must print exit=0.
 */

function doRiskyWork() {
  throw new Error("kaboom: something in this hook went wrong");
}

// TODO (1 of 2): wrap the call to doRiskyWork() in a try/catch. In the catch,
// swallow the error (optionally `if (process.env.DEBUG) console.error(...)`).
// The error must NOT escape this block.
doRiskyWork();

// TODO (2 of 2): make this hook always report success. Add the one line that
// exits with status code 0 here, so a thrown error can never become a non-zero
// exit. (Hint: process.exit(...).)
