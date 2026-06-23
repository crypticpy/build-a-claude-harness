#!/usr/bin/env node
// Stub harness payload — its only job here is to prove install.sh copies the
// hooks/ tree into $CLAUDE_DIR. The real dispatcher is the one you built across
// Parts 1-5.
console.error("[unified-hook] (stub) event:", process.argv[2] || "?");
