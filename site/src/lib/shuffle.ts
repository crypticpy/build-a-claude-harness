// Deterministic, content-preserving option ordering.
//
// Quiz options are authored in a fixed order (often with the correct answer in
// the same slot), which lets a reader pass every quiz by position alone. We
// permute each question's options by a per-question seed so the correct answer
// lands in a different slot from one question to the next, while keeping every
// option's id stable. Grading (o.id === correct), the data-correct wiring, and
// the answer key all key off ids, so the permutation changes only where each
// option renders, never which one is right.
//
// The order is a pure function of the seed, so the SSR floor and the hydrating
// island render the same sequence and rebuilds are stable (no Math.random).

function seedHash(seed: string): number {
  // FNV-1a over the seed string.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function seededShuffle<T>(items: T[], seed: string): T[] {
  const a = items.slice();
  let h = seedHash(seed) || 1; // xorshift32 must not start at 0
  const next = () => {
    // xorshift32: deterministic PRNG seeded from the question id.
    h ^= h << 13;
    h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    return h / 0x100000000;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
