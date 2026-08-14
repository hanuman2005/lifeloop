import { useEffect, useState } from "react";

/** localStorage hook with debounced status mirroring autosave UX. */
export function useLocalStorageState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? ({ ...initial, ...JSON.parse(raw) }) : initial;
    } catch {
      return initial;
    }
  });

  const [status, setStatus] = useState("idle");

  useEffect(() => {
    setStatus("saving");
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
      setStatus("saved");
      const t2 = setTimeout(() => setStatus("idle"), 1400);
      return () => clearTimeout(t2);
    }, 350);
    return () => clearTimeout(t);
  }, [key, value]);

  return { value, setValue, status };
}
