import { useMemo, useCallback } from "react";

export function useLocalStorageObject<T extends object>(
  key: string,
  defaultValue: T,
  parse: (raw: unknown) => T
): {
  initialValue: T;
  save: (value: T) => void;
  remove: () => void;
} {
  const initialValue = useMemo(() => {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return defaultValue;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return defaultValue;
      const parsed = JSON.parse(raw) as unknown;
      return parse(parsed);
    } catch {
      return defaultValue;
    }
  }, [key, defaultValue, parse]);

  const save = useCallback(
    (value: T) => {
      if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
        return;
      }
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // ignore write errors
      }
    },
    [key]
  );

  const remove = useCallback(() => {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  return { initialValue, save, remove };
}
