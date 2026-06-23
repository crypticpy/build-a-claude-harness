/**
 * brain_search — query the persistent "brain": the lessons your harness has
 * accumulated across sessions in lessons.jsonl (the file Part 2's trace-diagnosis
 * writes to on every compaction).
 *
 * Teaching point: cross-session memory is just a list the model can search.
 * There is no embedding model here — ranking is a transparent keyword score, so
 * a learner can see exactly why a lesson matched. Same idea as the reference's
 * brain_search; we point it at lessons.jsonl to close the loop with Part 2.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface BrainSearchArgs {
  /** Keywords to search for. Required at runtime; typed loose so the registry
   *  can pass raw JSON-RPC args — we validate it below. */
  query?: unknown;
  /** Max lessons to return (default 5). */
  limit?: unknown;
}

/** One lesson row as written by trace-diagnosis (Part 2, lesson 2.4). */
interface LessonEntry {
  timestamp?: string;
  type?: string;
  session_id?: string;
  lessons?: string[];
  stats?: Record<string, unknown>;
}

interface ScoredLesson {
  text: string;
  type: string;
  timestamp: string;
  score: number;
}

/**
 * Resolve lessons.jsonl. Order: $LESSONS_PATH, else `<package-dir>/lessons.jsonl`.
 * Never a hardcoded home path — the package stays relocatable.
 */
function resolveLessonsPath(): string {
  const override = process.env.LESSONS_PATH;
  if (override && override.trim()) return override;
  // At runtime this file is dist/tools/brain-search.js, so the package dir is
  // two levels up.
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "lessons.jsonl");
}

/** Read lessons.jsonl into rows. A missing or corrupt file yields []. */
function loadLessons(path: string): LessonEntry[] {
  if (!existsSync(path)) return [];
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  const rows: LessonEntry[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed) as LessonEntry);
    } catch {
      // Skip a bad line — one corrupt row must not sink the search.
    }
  }
  return rows;
}

/** Split a query into lowercased word tokens. */
function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9_]+/gi) ?? [];
}

/**
 * Score one lesson string against query tokens.
 *   +2 if the query token matches the entry `type` (high signal)
 *   +1 for each query token found in the lesson text
 *   +1 bonus if the whole raw query is a substring of the text
 *
 * ── YOUR JOB (the one blank for this lesson) ────────────────────────────────
 * Fill in the scoring loop. The ranking is intentionally transparent — no
 * embeddings, just keyword counting — so you can see exactly why a lesson
 * matched. Replace the marked TODO with the three rules above. Diff against
 * ../solution if stuck.
 */
function scoreLesson(
  text: string,
  type: string,
  queryTokens: string[],
  rawQuery: string,
): number {
  const lower = text.toLowerCase();
  const typeLower = type.toLowerCase();
  let score = 0;
  for (const tok of queryTokens) {
    // TODO: add +2 if `typeLower` includes `tok`, and +1 if `lower` includes `tok`.
    // Hint:
    //   if (typeLower.includes(tok)) score += 2;
    //   if (lower.includes(tok)) score += 1;
  }
  // TODO: add a +1 bonus if the whole `rawQuery` (trimmed, lowercased) appears
  // as a substring of `lower`.
  // Hint: if (rawQuery.trim() && lower.includes(rawQuery.toLowerCase().trim())) score += 1;
  return score;
}

export function brainSearch(args: BrainSearchArgs): string {
  if (typeof args.query !== "string" || !args.query.trim()) {
    throw new Error("brain_search requires a non-empty `query` (string).");
  }
  const query = args.query;
  const limit =
    typeof args.limit === "number" && args.limit > 0 ? args.limit : 5;
  const tokens = tokenize(query);

  const path = resolveLessonsPath();
  const rows = loadLessons(path);

  // Flatten: each lesson string in each entry becomes its own searchable item.
  const items: { text: string; type: string; timestamp: string }[] = [];
  for (const row of rows) {
    const type = row.type ?? "lesson";
    const timestamp = row.timestamp ?? "";
    for (const text of row.lessons ?? []) {
      if (typeof text === "string" && text.trim()) {
        items.push({ text, type, timestamp });
      }
    }
  }

  const scored: ScoredLesson[] = items
    .map((it) => ({
      ...it,
      score: scoreLesson(it.text, it.type, tokens, query),
    }))
    .filter((it) => it.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return JSON.stringify(
    { query, matches: scored, total: items.length },
    null,
    2,
  );
}
