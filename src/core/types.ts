export type Level = 'A1' | 'A2' | 'B1' | 'B2';

export interface Sense {
  pos: string;
  level: Level;
}

/** Définition + exemple pour un sens secondaire d'un mot polysémique. */
export interface AltSense {
  pos: string;
  def: string;
  ex: string;
}

/** Une entrée du lexique embarqué (générée par scripts/merge.mjs). */
export interface Word {
  id: string;
  word: string;
  note: string | null;
  hom: number | null;
  senses: Sense[];
  /** Niveau minimal parmi les sens, sert au filtrage. */
  level: Level;
  /** Position dans la liste officielle (ordre alphabétique). */
  ord: number;
  ipa: string;
  fr: string;
  /** Définition + exemple du sens principal. */
  def: string;
  ex: string;
  /** Sens secondaires (mots polysémiques uniquement). */
  alt?: AltSense[];
}

/** 0 = nouveau (jamais vu), 1 = en cours, 2 = connu. */
export type Status = 0 | 1 | 2;

export interface WordProgress {
  s: Status;
  streak: number;
  lapses: number;
  /** Marqué « difficile » (manuellement ou automatiquement). */
  flag: boolean;
  /** L'auto-marquage n'est posé qu'une seule fois. */
  auto: boolean;
  last: number | null;
}

/** [id, timestamp, réussite, source ('r' révision / 'b' masse), transition]
 *  transition : +1 devient connu, -1 ne l'est plus, 0 sinon. */
export type ReviewEvent = [string, number, 0 | 1, 'r' | 'b', -1 | 0 | 1];

export interface Settings {
  dailyGoal: number;
  autoAudio: boolean;
  sessionSize: number;
}

export interface ProgressState {
  version: 1;
  settings: Settings;
  words: Record<string, WordProgress>;
  events: ReviewEvent[];
}
