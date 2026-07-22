import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';
import type { ProgressState } from '../core/types';
import { parseState } from '../core/store';

export type { Session };

/** La synchro n'existe que si le projet est configuré (voir src/config.ts). */
export const syncConfigured = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';

let client: SupabaseClient | null = null;

export function getClient(): SupabaseClient | null {
  if (!syncConfigured) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

/** Progression distante de l'utilisateur, validée ; null si aucune. */
export async function pullRemote(userId: string): Promise<ProgressState | null> {
  const c = getClient();
  if (!c) return null;
  const { data, error } = await c.from('progress').select('state').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return parseState(JSON.stringify(data.state));
}

export async function pushRemote(userId: string, st: ProgressState): Promise<void> {
  const c = getClient();
  if (!c) return;
  const { error } = await c.from('progress').upsert({
    user_id: userId,
    state: st,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** Messages d'erreur Supabase les plus courants, en français. */
export function frenchAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (m.includes('already registered')) return 'Un compte existe déjà avec cet email.';
  if (m.includes('email not confirmed')) return 'Email non confirmé : vérifie ta boîte mail.';
  if (m.includes('password should be at least')) return 'Mot de passe trop court (6 caractères minimum).';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'Adresse email invalide.';
  if (m.includes('fetch')) return 'Connexion impossible : vérifie ta connexion internet.';
  return message;
}
