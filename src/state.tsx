import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ProgressState, Settings, Status, Word } from './core/types';
import {
  applyAnswer, bulkKnown, emptyState, loadState, parseState, saveState,
  serialize, setSettings, setStatus, toggleFlag,
} from './core/store';
import { counts as computeCounts, estimate, practiceStreak } from './core/stats';
import type { Counts, Eta } from './core/stats';
import { mergeStates } from './core/sync';
import { frenchAuthError, getClient, pullRemote, pushRemote, syncConfigured } from './lib/supabase';
import type { Session } from './lib/supabase';
import { WORDS } from './data';

export interface Account {
  /** false tant que src/config.ts n'a pas les clés du projet. */
  configured: boolean;
  email: string | null;
  syncing: boolean;
  lastSync: number | null;
  syncError: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

interface AppCtx {
  st: ProgressState;
  /** Génération de l'état : incrémentée à chaque remplacement en bloc
   *  (remise à zéro, import, fusion de sync) pour que les vues purgent
   *  leur état de session (ex. la pile de tri). */
  gen: number;
  words: Word[];
  counts: Counts;
  eta: Eta;
  streak: number;
  account: Account;
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
  const [gen, setGen] = useState(0);

  // Persistance débouncée
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => saveState(localStorage, st), 250);
    return () => clearTimeout(timer.current);
  }, [st]);

  /* ---------- compte et synchronisation ---------- */

  const [session, setSession] = useState<Session | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const stRef = useRef(st);
  useEffect(() => { stRef.current = st; }, [st]);

  useEffect(() => {
    const c = getClient();
    if (!c) return;
    c.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = c.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // À la connexion : rapatrier la copie distante, fusionner, repousser le résultat
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setSyncing(true);
      setSyncError(null);
      try {
        const remote = await pullRemote(userId);
        if (cancelled) return;
        const merged = remote ? mergeStates(stRef.current, remote) : stRef.current;
        setSt(merged);
        if (remote) setGen((g) => g + 1);
        await pushRemote(userId, merged);
        if (!cancelled) setLastSync(Date.now());
      } catch (e) {
        if (!cancelled) setSyncError(frenchAuthError(e instanceof Error ? e.message : String(e)));
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Connecté : chaque changement part vers la base, avec un délai de regroupement
  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(() => {
      pushRemote(userId, st)
        .then(() => { setLastSync(Date.now()); setSyncError(null); })
        .catch((e) => setSyncError(frenchAuthError(e instanceof Error ? e.message : String(e))));
    }, 2000);
    return () => clearTimeout(t);
  }, [st, userId]);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const c = getClient();
    if (!c) return 'Synchronisation non configurée.';
    const { error } = await c.auth.signInWithPassword({ email, password });
    return error ? frenchAuthError(error.message) : null;
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<string | null> => {
    const c = getClient();
    if (!c) return 'Synchronisation non configurée.';
    const { data, error } = await c.auth.signUp({ email, password });
    if (error) return frenchAuthError(error.message);
    if (!data.session) return 'Compte créé. Confirme ton email puis connecte-toi.';
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await getClient()?.auth.signOut();
    setLastSync(null);
    setSyncError(null);
  }, []);

  const account = useMemo<Account>(() => ({
    configured: syncConfigured,
    email: session?.user.email ?? null,
    syncing,
    lastSync,
    syncError,
    signIn,
    signUp,
    signOut,
  }), [session, syncing, lastSync, syncError, signIn, signUp, signOut]);

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
    setGen((g) => g + 1);
    return true;
  }, []);
  const reset = useCallback(() => { setSt(emptyState()); setGen((g) => g + 1); }, []);

  const counts = useMemo(() => computeCounts(WORDS, st), [st]);
  const { eta, streak } = useMemo(() => {
    const now = Date.now();
    return { eta: estimate(counts, st, now), streak: practiceStreak(st, now) };
  }, [counts, st]);

  const value = useMemo<AppCtx>(() => ({
    st, gen, words: WORDS, counts, eta, streak, account,
    answer, flag, status, bulk, patchSettings, exportState, importState, reset,
  }), [st, gen, counts, eta, streak, account, answer, flag, status, bulk, patchSettings, exportState, importState, reset]);

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
