## Code review

**Scope**: 2 files, 31 changed lines

**Blockers**:

- src/auth.js:42 — `verifyToken` is called without `await`, so the route proceeds before verification resolves — every request is treated as authenticated in production.
- src/db.js:88 — user-supplied `name` is concatenated into the SQL string — SQL injection on the search endpoint.

**Non-blockers**:

- src/util.js:12 — the `slice(-5)` magic number could be a named constant; harmless as-is.
