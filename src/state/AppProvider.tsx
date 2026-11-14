import { useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { AppContext, createInitialState, reducer } from './appState';

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  useEffect(() => {
    if (!state.toast) return;
    const t = window.setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 2600);
    return () => window.clearTimeout(t);
  }, [state.toast]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
