#!/usr/bin/env node
/**
 * broken-hook.mjs — a hook that fails ON PURPOSE, to prove the session survives.
 *
 * doRiskyWork() throws every single time. The point is to show that a thrown
 * error inside a hook does NOT have to become a non-zero exit. The try/catch +
 * process.exit(0) wrapper absorbs the failure: the hook "fails", but it fails
 * SILENTLY and reports success to Claude Code, so your turn is never blocked.
 *
 * Run it and check the exit code:
 *   echo '{}' | node broken-hook.mjs ; echo "exit=$?"
 * You'll see exit=0 even though doRiskyWork() threw.
 */

function doRiskyWork() {
  // Pretend this is real work — reading a file that isn't there, calling a tool
  // that's missing, a typo'd property access. Any of those throws. We force it.
  throw new Error("kaboom: something in this hook went wrong");
}

try {
  doRiskyWork();
  // (Unreached — doRiskyWork always throws. That's the whole demo.)
} catch (err) {
  // Swallowed. Visible only when the user opts into DEBUG; never to the turn.
  if (process.env.DEBUG) console.error("[broken-hook] caught:", err.message);
}

// Always exit 0. THIS is the line that keeps a broken hook from blocking you.
process.exit(0);
