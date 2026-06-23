// This must NEVER run in the clean scenario — there's no .changed marker.
console.error("BUG: gate ran on a clean tree");
process.exit(1);
