/**
 * brain_search — query the persistent "brain", a list of notes on disk.
 * brain_remember — write a note so the brain isn't empty.
 *
 * Teaching point: cross-session memory is just a list the model can append to
 * and search. There is no embedding model here — ranking is a transparent
 * keyword/substring score so a learner can see exactly why a note matched.
 */

import type { Store, BrainNote } from "../store.js";

export interface BrainSearchArgs {
  query: string;
  /** Max notes to return (default 5). */
  limit?: number;
}

export interface BrainRememberArgs {
  text: string;
  tags?: string[];
}

interface ScoredNote extends BrainNote {
  score: number;
}

/** Split a query into lowercased word tokens. */
function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9_]+/gi) ?? [];
}

/**
 * Score a note against query tokens.
 *   +2 for each query token found in a tag (tags are high-signal)
 *   +1 for each query token found anywhere in the text
 *   +1 bonus if the whole raw query appears as a substring of the text
 */
function scoreNote(
  note: BrainNote,
  queryTokens: string[],
  rawQuery: string,
): number {
  const text = note.text.toLowerCase();
  const tags = note.tags.map((t) => t.toLowerCase());
  let score = 0;
  for (const tok of queryTokens) {
    if (tags.some((tag) => tag.includes(tok))) score += 2;
    if (text.includes(tok)) score += 1;
  }
  if (rawQuery.trim() && text.includes(rawQuery.toLowerCase().trim()))
    score += 1;
  return score;
}

export function brainSearch(store: Store, args: BrainSearchArgs): string {
  if (typeof args.query !== "string" || !args.query.trim()) {
    throw new Error("brain_search requires a non-empty `query` (string).");
  }
  const limit = args.limit && args.limit > 0 ? args.limit : 5;
  const tokens = tokenize(args.query);

  const scored: ScoredNote[] = store.data.brain
    .map((n) => ({ ...n, score: scoreNote(n, tokens, args.query) }))
    .filter((n) => n.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return JSON.stringify(
    { query: args.query, matches: scored, total: store.data.brain.length },
    null,
    2,
  );
}

export function brainRemember(store: Store, args: BrainRememberArgs): string {
  if (typeof args.text !== "string" || !args.text.trim()) {
    throw new Error("brain_remember requires a non-empty `text` (string).");
  }
  const note = store.remember(args.text.trim(), args.tags ?? []);
  return JSON.stringify(
    { remembered: note, total: store.data.brain.length },
    null,
    2,
  );
}
