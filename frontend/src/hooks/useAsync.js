import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs an async loader; exposes loading/error/data and reload(). Ignores results from stale runs. */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const run = useRef(0);
  const load = useCallback(() => {
    const id = ++run.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve().then(loader).then(
      (data) => { if (id === run.current) setState({ loading: false, error: null, data }); },
      (error) => { if (id === run.current) setState({ loading: false, error, data: null }); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { load(); return () => { run.current++; }; }, [load]);
  return { ...state, reload: load };
}
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
