import raw from './words.json';
import type { Word } from '../core/types';

export const WORDS = raw as unknown as Word[];
