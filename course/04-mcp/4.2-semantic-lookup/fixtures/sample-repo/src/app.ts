/**
 * app.ts — the sample app's entry point. It imports the logger, so it is a
 * downstream CONSUMER of logger.ts. That import edge is what impact_check finds.
 */

import { log } from "./logger.js";

export function main(): void {
  log("info", "sample app starting");
}

main();
