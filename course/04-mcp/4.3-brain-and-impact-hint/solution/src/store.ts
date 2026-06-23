/**
 * store.ts — a plain-JSON, file-backed store. NO database, NO native modules.
 *
 * Teaching point: "persistence" does not require SQLite. A single JSON file,
 * loaded once and saved on change, is enough to hold a code index. That keeps
 * `npm install` from ever compiling anything — this checkpoint can't be bricked
 * by a node-gyp build on a fresh Mac.
 *
 * The store holds (mirroring the reference's shape):
 *   - files:   path -> { summary, symbols }   (what each file is + what it exports)
 *   - imports: path -> string[]               (raw import targets seen in that file)
 *   - brain:   note[]                         (cross-session memory — used in 4.3)
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Summary + exported symbol names for one source file. */
export interface FileEntry {
  /** Cheap human summary: first comment/docstring, or first few code lines. */
  summary: string;
  /** Exported symbol names found by regex. */
  symbols: string[];
}

/** One persistent note (the "brain"). Unused until 4.3, but in the shape now. */
export interface BrainNote {
  text: string;
  tags: string[];
  ts: string;
}

/** The whole on-disk shape. */
export interface StoreData {
  /** Repo path that was last indexed, for display. */
  root: string | null;
  /** Relative path -> file summary + symbols. */
  files: Record<string, FileEntry>;
  /** Relative path -> list of raw import targets it references. */
  imports: Record<string, string[]>;
  /** Persistent notes (4.3). */
  brain: BrainNote[];
}

function emptyData(): StoreData {
  return { root: null, files: {}, imports: {}, brain: [] };
}

/**
 * Resolve where the JSON store lives.
 *
 * Order: $CONTEXT_LAYER_STORE, else `<package-dir>/.store/brain.json`.
 * Never a hardcoded home path — the package is relocatable.
 */
export function resolveStorePath(): string {
  const override = process.env.CONTEXT_LAYER_STORE;
  if (override && override.trim()) return override;
  // At runtime this file is dist/store.js, so the package dir is one level up.
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgDir = join(here, "..");
  return join(pkgDir, ".store", "brain.json");
}

/** A loaded store that knows how to persist itself back to disk. */
export class Store {
  readonly path: string;
  data: StoreData;

  private constructor(path: string, data: StoreData) {
    this.path = path;
    this.data = data;
  }

  /** Load from disk, or start empty if the file is missing or corrupt. */
  static load(path: string = resolveStorePath()): Store {
    if (!existsSync(path)) return new Store(path, emptyData());
    try {
      const raw = readFileSync(path, "utf8");
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      // Be tolerant: fill in any missing top-level keys.
      const data: StoreData = {
        root: parsed.root ?? null,
        files: parsed.files ?? {},
        imports: parsed.imports ?? {},
        brain: parsed.brain ?? [],
      };
      return new Store(path, data);
    } catch {
      // A corrupt file must not crash the server; start fresh in memory.
      return new Store(path, emptyData());
    }
  }

  /** Write the current data back to disk (creates the dir if needed). */
  save(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    // Atomic write: serialize to a temp file, then rename over the real path.
    // rename() is atomic on POSIX, so a crash mid-write can't truncate the
    // store — a reader sees either the old file or the complete new one.
    const tmp = this.path + ".tmp";
    writeFileSync(tmp, JSON.stringify(this.data, null, 2), "utf8");
    renameSync(tmp, this.path);
  }
}
