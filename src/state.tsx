import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ProgressState, Settings, Status, Word } from './core/types';
import {
  applyAnswer, bulkKnown, emptyState, loadState, parseState, saveState,
  serialize, setSettings, setStatus, toggleFlag,
} from './core/store';
import { counts as computeCounts, estimate, practiceStreak } from './core/stats';
import type { Counts, Eta } from './core/stats';
import { WORDS } from './data';

interface AppCtx {
  st: ProgressState;
  words: Word[];
  counts: Counts;
  eta: Eta;
  streak: number;
  answer: (id: string, ok: boolean) => void;
  flag: (id: string) => void;
  status: (id: string, s: Status) => void;
  bulk: (ids: string[]) => void;
  patchSettings: (p: Partial<Settings>) => void;
  exportState: () => string;
  importState: (json: string) => boolean;
  reset: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<ProgressState>(() => loadState(localStorage));

  // Persistance débouncée
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => saveState(localStorage, st), 250);
    return () => clearTimeout(timer.current);
  }, [st]);

  const answer = useCallback((id: string, ok: boolean) => setSt((s) => applyAnswer(s, id, ok, Date.now())), []);
  const flag = useCallback((id: string) => setSt((s) => toggleFlag(s, id)), []);
  const status = useCallback((id: string, v: Status) => setSt((s) => setStatus(s, id, v, Date.now())), []);
  const bulk = useCallback((ids: string[]) => setSt((s) => bulkKnown(s, ids, Date.now())), []);
  const patchSettings = useCallback((p: Partial<Settings>) => setSt((s) => setSettings(s, p)), []);
  const exportState = useCallback(() => serialize(st), [st]);
  const importState = useCallback((json: string): boolean => {
    const parsed = parseState(json);
    if (!parsed) return false;
    setSt(parsed);
    return true;
  }, []);
  const reset = useCallback(() => setSt(emptyState()), []);

  const counts = useMemo(() => computeCounts(WORDS, st), [st]);
  const { eta, streak } = useMemo(() => {
    const now = Date.now();
    return { eta: estimate(counts, st, now), streak: practiceStreak(st, now) };
  }, [counts, st]);

  const value = useMemo<AppCtx>(() => ({
    st, words: WORDS, counts, eta, streak,
    answer, flag, status, bulk, patchSettings, exportState, importState, reset,
  }), [st, counts, eta, streak, answer, flag, status, bulk, patchSettings, exportState, importState, reset]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp hors AppProvider');
  return v;
}

/** Formatage local des nombres et dates (UI en français). */
export const fmtInt = (n: number): string => n.toLocaleString('fr-FR');

export const fmtDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export const fmtRate = (perDay: number): string =>
  perDay >= 10 ? String(Math.round(perDay)) : (Math.round(perDay * 10) / 10).toLocaleString('fr-FR');
