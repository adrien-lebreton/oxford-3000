/**
 * Configuration de la synchronisation (Supabase).
 * L'URL du projet et la clé « anon » sont des valeurs publiques par nature :
 * la sécurité vient des règles RLS côté base (chacun ne lit que sa ligne).
 * Laisser vide pour désactiver complètement le système de compte.
 */
export const SUPABASE_URL: string = 'https://ltmwhzumzmcjnfrcuojc.supabase.co';
export const SUPABASE_ANON_KEY: string = 'sb_publishable_NXY0HdOgtePDWc4MlHwu_w_AAs9Kn3D';
