/**
 * Edit history — the READ side of file-edits.json.
 *
 * On UserPromptSubmit, if the user's prompt names a file that's been edited
 * several times already (this session, or across many sessions), inject a short
 * warning with recent edit summaries. The point: when you're about to touch a
 * file for the fifth time, the model should know that — repeated churn on one
 * file is a signal something deeper is off.
 *
 * rolling-log.mjs writes file-edits.json; this module only reads it.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Same storage root as rolling-log, derived from this file's location.
const HOOK_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FILE_EDITS_DB = join(HOOK_ROOT, "logs", "file-edits.json");

/**
 * If the prompt mentions a file with edit history, return a warning string
 * (recent edits + high-churn note), or null.
 */
export async function checkEditHistory(event, config, _apiKey) {
  try {
    const { session_id, prompt } = event;
    if (!session_id || !prompt) return null;
    if (!existsSync(FILE_EDITS_DB)) return null;

    const db = JSON.parse(readFileSync(FILE_EDITS_DB, "utf-8"));
    const threshold = config.rolling_log?.summarizeAfterEdits || 2;

    const mentionedFiles = extractFilePaths(prompt);
    const warnings = [];

    for (const filePath of mentionedFiles) {
      const fileData = db.files[filePath];
      if (!fileData) continue;

      const sessionEdits = fileData.sessions[session_id];
      const editCount = sessionEdits?.count || 0;

      if (editCount >= threshold) {
        const editSummaries = sessionEdits.edits
          .map((e) => e.summary)
          .filter(Boolean)
          .slice(-5);

        let warning = `FILE HISTORY: \`${filePath}\` has been edited ${editCount}x this session`;
        if (editSummaries.length > 0) {
          warning += `\nRecent changes:\n${editSummaries
            .map((s, i) => `  ${i + 1}. ${s}`)
            .join("\n")}`;
        }
        warnings.push(warning);
      }
    }

    const highChurnWarning = checkHighChurnFiles(db, session_id, mentionedFiles);
    if (highChurnWarning) warnings.push(highChurnWarning);

    return warnings.length > 0 ? warnings.join("\n\n") : null;
  } catch (err) {
    if (process.env.DEBUG) console.error("[edit-history]", err);
    return null;
  }
}

/** Pull plausible file paths out of a prompt (backticks + path-like tokens). */
function extractFilePaths(prompt) {
  const paths = new Set();

  const backtickMatches = prompt.match(/`([^`]+\.[a-zA-Z]{1,4})`/g) || [];
  backtickMatches.forEach((m) => paths.add(m.replace(/`/g, "")));

  const pathPattern = /(?:^|\s|["'`])([a-zA-Z0-9_\-./]+\.[a-zA-Z]{1,4})(?:\s|$|["'`])/g;
  let match;
  while ((match = pathPattern.exec(prompt)) !== null) {
    const p = match[1];
    if (!p.includes("://") && !p.startsWith(".") && p.includes("/")) {
      paths.add(p);
    }
  }

  return Array.from(paths);
}

/** Flag files edited many times across many sessions — likely architectural pain. */
function checkHighChurnFiles(db, _sessionId, mentionedFiles) {
  const highChurn = [];

  for (const filePath of mentionedFiles) {
    const fileData = db.files[filePath];
    if (!fileData) continue;

    const sessionCount = Object.keys(fileData.sessions).length;
    const totalEdits = fileData.editCount;

    if (totalEdits >= 10 && sessionCount >= 3) {
      highChurn.push(`${filePath} (${totalEdits} edits across ${sessionCount} sessions)`);
    }
  }

  if (highChurn.length > 0) {
    return `HIGH CHURN FILES (may need architectural attention):\n${highChurn
      .map((f) => `  • ${f}`)
      .join("\n")}`;
  }
  return null;
}

/** Detailed history for one file (handy for tooling/inspection). */
export function getDetailedFileHistory(filePath, options = {}) {
  if (!existsSync(FILE_EDITS_DB)) return null;
  try {
    const db = JSON.parse(readFileSync(FILE_EDITS_DB, "utf-8"));
    const fileData = db.files[filePath];
    if (!fileData) return null;

    const result = {
      filePath,
      totalEdits: fileData.editCount,
      firstEdit: fileData.firstEdit,
      lastEdit: fileData.lastEdit,
      sessionCount: Object.keys(fileData.sessions).length,
      sessions: {},
    };

    if (options.includeSessions) {
      for (const [sid, data] of Object.entries(fileData.sessions)) {
        result.sessions[sid] = {
          editCount: data.count,
          edits: data.edits.map((e) => ({
            timestamp: e.timestamp,
            summary: e.summary || "(no summary)",
          })),
        };
      }
    }

    return result;
  } catch {
    return null;
  }
}
