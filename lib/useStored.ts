import { useCallback, useMemo, useSyncExternalStore } from "react";

// useState that survives reloads. Values live in memory first and are mirrored to
// localStorage when it's available, so games still work in private windows.

const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

function parse<T>(raw: string | null, initial: T): T {
  if (raw === null) return initial;
  try {
    const v = JSON.parse(raw);
    // Shallow-merge objects so fields added later get their defaults.
    return typeof initial === "object" && initial && !Array.isArray(initial) ? { ...initial, ...v } : v;
  } catch {
    return initial;
  }
}

/** `initial` must be stable (a module constant). Server and first client render both use it. */
export function useStored<T>(key: string, initial: T) {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const value = useMemo(() => parse(raw, initial), [raw, initial]);
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = parse(read(key), initial);
      const json = JSON.stringify(next instanceof Function ? next(prev) : next);
      memory.set(key, json);
      try {
        localStorage.setItem(key, json);
      } catch {}
      listeners.forEach((l) => l());
    },
    [key, initial],
  );
  return [value, set] as const;
}
