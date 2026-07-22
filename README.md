# Oxford 3000

App de flashcards pour apprendre les 3000 mots essentiels de l'anglais (liste *The Oxford 3000, American English*), avec suivi de progression et estimation de la date à laquelle tu connaîtras toute la liste.

App en ligne : <https://adrien-lebreton.github.io/oxford-3000/>

C'est une PWA : elle tourne dans le navigateur sur Mac, Windows, iPhone et Android, s'installe sur l'écran d'accueil et fonctionne hors-ligne.

## Lancer

```bash
npm install
npm run dev
```

```bash
npm run build      # type-check + build de prod dans dist/
npm run preview    # sert le build de prod
npm test           # tests de la logique (vitest)
npm run deploy     # publie sur GitHub Pages
```

### Installer sur téléphone

Ouvre l'app en ligne sur le téléphone, puis :

- iPhone : Safari, bouton Partager, « Sur l'écran d'accueil »
- Android : Chrome propose l'installation (menu, « Installer l'application »)

## Fonctionnalités

- Accueil : mots connus et restants sur 3000, anneau de progression, répartition par niveau (A1 à B2), jours de pratique d'affilée, rythme d'apprentissage et date de fin estimée. Le rythme se mesure sur les 14 derniers jours de révision ; tant qu'il n'y a pas assez d'historique, l'estimation s'appuie sur un objectif quotidien réglable.
- Trier : pour la phase de démarrage. Les mots jamais vus défilent un par un avec leur prononciation et leur traduction, tu tapes « Je le connais » ou « Passer », tu peux annuler le dernier marquage, et tu filtres par niveau. Ce marquage en masse ne fausse pas le calcul du rythme.
- Réviser : tirage aléatoire (15 mots par défaut, réglable de 5 à 30) parmi Jamais vus (par défaut), Non connus, Difficiles ou Tous, croisable avec un filtre de niveau. Carte recto avec le mot, sa catégorie, son niveau, l'IPA et l'audio ; verso avec la traduction française, une définition anglaise simple et une phrase d'exemple par sens. Tu réponds « Je connais » ou « Pas encore ». L'écran de fin liste les ratés et permet de les rejouer.
- Mots difficiles : marque au surligneur les mots que tu ne retiens pas, depuis la carte ou la fiche. Un mot raté deux fois est surligné automatiquement. Un mot connu que tu rates redevient « en cours », le compteur reste honnête.
- Liste des 3000 mots : recherche en anglais ou en français, filtres par niveau, statut et difficiles, fiche détaillée par mot, et action « Tout marquer connu » sur le filtre courant.
- Audio : prononciation par la synthèse vocale du système (voix en-US), hors-ligne, pour le mot comme pour les phrases d'exemple.
- Sauvegarde : la progression vit dans le navigateur (localStorage). Export et import JSON dans les réglages pour changer d'appareil.

## Raccourcis clavier (pendant une session)

| Touche | Action |
|---|---|
| Espace / Entrée | retourner la carte |
| ← | « Pas encore » |
| → | « Je connais » |
| F | surligner difficile |
| P | prononcer le mot |

## Données

- `data/raw.txt` : texte extrait du PDF officiel (`pdftotext`).
- `scripts/parse.mjs` : parse le texte en `data/base.json`. 3000 entrées exactement, validées (A1 900, A2 800, B1 700, B2 600).
- `scripts/chunk.mjs` : découpe en lots de 250 pour l'enrichissement.
- Enrichissement par lots (IPA General American, traduction française, définition anglaise simple, phrase d'exemple), puis validation par script.
- `scripts/chunk-alt.mjs` : seconde passe pour les quelque 700 mots polysémiques (`stage` : scène et organiser). Chaque sens secondaire reçoit un bloc `alt {pos, def, ex}`, affiché sous l'exemple principal.
- `scripts/merge.mjs` : fusionne et valide le tout (couverture exacte, formats IPA, exemples, blocs alt) vers `src/data/words.json`, embarqué dans l'app.

Pour régénérer après correction d'un chunk : `node scripts/merge.mjs`.

## Architecture

- `src/core/` : logique pure sans React, testée avec vitest. `store.ts` (progression, statuts, auto-surlignage), `draw.ts` (tirages et file de tri), `stats.ts` (compteurs, rythme, estimation), `audio.ts` (synthèse vocale).
- `src/ui/` : composants React. `src/state.tsx` : contexte et persistance.
- Document de conception : `docs/design.md`.

## Compte et synchronisation (optionnel)

L'app fonctionne sans compte : mode invité, progression uniquement dans le navigateur. Avec un compte (email et mot de passe, section Compte des réglages), la progression est aussi sauvegardée en base et suit l'utilisateur d'un appareil à l'autre. À la connexion, la copie locale et la copie distante sont fusionnées mot par mot (la version la plus récente gagne), puis chaque changement repart vers la base après un court délai.

Côté infrastructure : un projet Supabase (Postgres + auth), une table `progress` (une ligne par utilisateur, état complet en jsonb) protégée par RLS, voir `scripts/supabase.sql`. Les clés publiques du projet se mettent dans `src/config.ts` ; vides, tout le système de compte disparaît de l'interface.

## Où vit la progression

La progression est dans le localStorage du navigateur qui affiche l'app (clé `oxford3000.v1`). Elle est donc propre à chaque navigateur et à chaque adresse, port compris : `localhost:5188` et `localhost:5173` sont deux stockages différents.

Révise toujours au même endroit, idéalement sur l'app en ligne. Pense à exporter de temps en temps (Réglages, Exporter) ; le dossier `sauvegardes/` est prévu pour ces fichiers et reste hors du dépôt.

## Limites connues et pistes

La progression est par appareil, sans synchronisation : l'export/import JSON fait le pont entre Mac et iPhone. La qualité des voix dépend du système (excellente sur Apple, variable ailleurs). Pour la suite, les pistes naturelles sont une vraie synchronisation, une répétition espacée type SM-2, des statistiques hebdomadaires et un mode où l'on écrit le mot.
