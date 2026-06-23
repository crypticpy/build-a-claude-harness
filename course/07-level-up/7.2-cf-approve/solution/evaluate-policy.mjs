// evaluate-policy.mjs — a local, no-cost model of cf-approve's decision boundary.
//
// cf-approve auto-approves permission requests by calling an LLM with a system
// prompt that says: "ALLOW unless the request matches one of a few named harms."
// We don't want a checkpoint that makes a real billed call, so this file encodes
// the SAME SHAPE deterministically: a small table of named-harm rules, and a
// DEFAULT-ALLOW fallthrough. Filling in that fallthrough is the lesson — get the
// direction right (allow unless a harm matched), not the reverse.
//
// A "decision" mirrors what cf-approve returns to Claude Code on stdout:
//   { decision: "allow" | "deny", reason: string }
// where "deny" means "don't auto-approve — hand this to the human", not "block".
//
// Usage:
//   node evaluate-policy.mjs fixtures/safe-git-status.json   -> ALLOW, exit 0
//   node evaluate-policy.mjs fixtures/harm-rm-rf-root.json   -> DENY,  exit 1
//   node evaluate-policy.mjs --check fixtures                -> batch self-check

import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

// ── The narrow, explicit, named-harm deny set ───────────────────────────────
// Each rule names a concrete, irreversible harm and a test for it. This is the
// WHOLE deny list — everything not matched here is allowed. Keep it small and
// specific; "feels risky" is not a rule, "names a concrete harm" is.
const DENY_RULES = [
  {
    id: "credential-exfiltration",
    why: "reads a secret and sends it off-machine",
    // a secret source (ssh key, .env, credentials) AND an outbound network sink
    test: (cmd) =>
      /(id_rsa|id_ed25519|\.ssh\/|\.env|credentials|secret|token|\.aws\/)/i.test(cmd) &&
      /(curl|wget|nc |netcat|ssh |scp |https?:\/\/)/i.test(cmd),
  },
  {
    id: "destructive-outside-cwd",
    why: "destructive operation aimed outside the working directory",
    // rm -rf targeting / or a home dir, not a project-relative path
    test: (cmd) =>
      /\brm\s+-[a-z]*r[a-z]*f?\b|\brm\s+-[a-z]*f[a-z]*r?\b/i.test(cmd) &&
      /\s(\/|~|\$HOME|\/Users\/|\/home\/)(\s|$)|\s\/\s*$|\s~\s*$/i.test(` ${cmd} `),
  },
  {
    id: "force-push-protected",
    why: "force-push to a protected branch",
    test: (cmd) =>
      /git\s+push\b/i.test(cmd) &&
      /(--force|-f|--force-with-lease)\b/i.test(cmd) &&
      /\b(main|master|release|production|prod)\b/i.test(cmd),
  },
  {
    id: "privilege-escalation",
    why: "escalates privilege via sudo",
    test: (cmd) => /\bsudo\b/i.test(cmd),
  },
  {
    id: "public-network-listener",
    why: "opens a listener bound to a public interface",
    test: (cmd) => /(0\.0\.0\.0|--host\s+0\.0\.0\.0|-p\s+0\.0\.0\.0)/i.test(cmd),
  },
];

/**
 * Evaluate one permission request against the policy.
 * @param {{tool_name?:string, tool_input?:{command?:string}}} req
 * @returns {{ decision: "allow"|"deny", rule: string|null, reason: string }}
 */
export function evaluate(req) {
  const cmd = req?.tool_input?.command ?? "";

  // Check the request against every named-harm rule.
  for (const rule of DENY_RULES) {
    if (rule.test(cmd)) {
      return { decision: "deny", rule: rule.id, reason: rule.why };
    }
  }

  // DEFAULT-ALLOW: nothing in the narrow deny set matched, so approve.
  // This is the friction-reduction direction — allow unless a concrete harm was
  // named. Do NOT invert this to deny-by-default; that defeats the whole tool.
  return { decision: "allow", rule: null, reason: "no named harm matched" };
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function evalFile(path) {
  const req = JSON.parse(readFileSync(path, "utf-8"));
  return evaluate(req);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (!arg) {
    console.error("usage: node evaluate-policy.mjs <request.json> | --check <fixtures-dir>");
    process.exit(2);
  }

  if (arg === "--check") {
    // Batch mode: filename prefix is the ground truth (safe-* must allow, harm-* must deny).
    const dir = process.argv[3];
    if (!dir) {
      console.error("usage: node evaluate-policy.mjs --check <fixtures-dir>");
      process.exit(2);
    }
    let allowed = 0;
    let denied = 0;
    let misclassified = 0;
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
      const expect = basename(f).startsWith("harm-") ? "deny" : "allow";
      const { decision, rule, reason } = evalFile(join(dir, f));
      const ok = decision === expect;
      if (!ok) misclassified++;
      if (decision === "allow") allowed++;
      else denied++;
      const tag = ok ? "ok" : "MISCLASSIFIED";
      const detail = decision === "deny" ? ` (${rule}: ${reason})` : "";
      console.log(`  [${tag}] ${f} -> ${decision.toUpperCase()}${detail}`);
    }
    if (misclassified === 0) {
      console.log(`POLICY OK — ${allowed} allowed, ${denied} denied, 0 misclassified`);
      process.exit(0);
    }
    console.error(`POLICY FAIL — ${misclassified} misclassified`);
    process.exit(1);
  }

  // Single-file mode.
  const { decision, rule, reason } = evalFile(arg);
  if (decision === "allow") {
    console.log("ALLOW");
    process.exit(0);
  }
  console.log(`DENY (${rule}): ${reason}`);
  process.exit(1);
}
