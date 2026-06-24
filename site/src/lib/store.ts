// Persistence that never throws. A try/catch pub/sub under one versioned key,
// in-memory fallback when localStorage is unavailable (private mode, quota,
// SSR), unknown versions ignored. Reading routes stay 0KB-framework; this is
// plain TS loaded only where progress is recorded.
const KEY = "claude-harness-atlas:v1";

export interface AtlasState {
  version: 1;
  visited: Record<string, boolean>; // module/viz ids seen
  predictions: Record<string, string>; // hook-beat commits
  quiz: Record<string, boolean>; // correct-on-first-try
}

const EMPTY: AtlasState = {
  version: 1,
  visited: {},
  predictions: {},
  quiz: {},
};

let memory: AtlasState = structuredCloneSafe(EMPTY);
const listeners = new Set<(s: AtlasState) => void>();

function structuredCloneSafe(s: AtlasState): AtlasState {
  return JSON.parse(JSON.stringify(s));
}

function read(): AtlasState {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return memory;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return memory; // ignore unknown versions
    return { ...EMPTY, ...parsed };
  } catch {
    return memory;
  }
}

function write(s: AtlasState): void {
  memory = s;
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(s));
  } catch {
    /* fail silent: in-memory only */
  }
  listeners.forEach((fn) => {
    try {
      fn(s);
    } catch {
      /* never let a listener break the store */
    }
  });
}

export const store = {
  get(): AtlasState {
    return read();
  },
  markVisited(id: string): void {
    const s = read();
    write({ ...s, visited: { ...s.visited, [id]: true } });
  },
  commitPrediction(id: string, value: string): void {
    const s = read();
    write({ ...s, predictions: { ...s.predictions, [id]: value } });
  },
  recordQuiz(id: string, correct: boolean): void {
    const s = read();
    write({ ...s, quiz: { ...s.quiz, [id]: correct } });
  },
  subscribe(fn: (s: AtlasState) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  export(): string {
    return JSON.stringify(read(), null, 2);
  },
  import(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      if (parsed?.version !== 1) return false;
      write({ ...EMPTY, ...parsed });
      return true;
    } catch {
      return false;
    }
  },
  reset(): void {
    write(structuredCloneSafe(EMPTY));
  },
};
