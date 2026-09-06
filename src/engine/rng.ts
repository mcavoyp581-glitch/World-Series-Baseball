export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function nextSeed(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function rollFrom(seed: number): { value: number; seed: number } {
  const next = nextSeed(seed);
  return { value: next / 4294967296, seed: next };
}

export function pick<T>(seed: number, items: readonly T[]): { item: T; seed: number } {
  const rolled = rollFrom(seed);
  const item = items[Math.floor(rolled.value * items.length)] ?? items[0];
  return { item, seed: rolled.seed };
}

export function clamp(n: number, min = 1, max = 99): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}
