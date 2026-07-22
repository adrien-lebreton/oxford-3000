# Oxford 3000, document de conception

**Date** : 2026-07-21 · **Statut** : v1 en place, revue au fil de l'eau

## Objectif

App cross-plateforme pour apprendre les 3000 mots de l'American Oxford 3000 (PDF officiel OUP), sous forme de flashcards :

- savoir combien de mots sont connus et restants, et estimer la date à laquelle la liste sera terminée ;
- réviser par tirage aléatoire (15 mots par défaut) pour vérifier si on les connaît ;
- marquer les mots qu'on ne retient pas sur le long terme ;
- chaque mot : prononciation (IPA + audio), traduction française, définition anglaise simple, phrase d'exemple.

## Choix d'architecture

Trois approches comparées :

1. **PWA React + Vite + TypeScript** *(retenue)* : une seule base de code, tourne dans le navigateur sur Mac, Windows, iOS et Android, installable sur l'écran d'accueil, hors-ligne via service worker, aucun compte ni build natif. Testable immédiatement.
2. Expo / React Native : vraie app native et web, mais exige simulateurs et builds, avec EAS (payant) pour distribuer ; lourd pour un outil personnel.
3. Tauri/Electron : desktop seulement, ne couvre pas le mobile.

La logique cœur (données, progression, stats) est isolée dans des modules TypeScript purs sans dépendance React, donc portable vers Expo plus tard si besoin. Les données de progression restent locales (localStorage) avec export/import JSON pour la sauvegarde et le transfert entre appareils.

**Dépendances** : react, react-dom, vite, @vitejs/plugin-react, typescript, vitest, vite-plugin-pwa. Pas de routeur ni de state manager (peu de vues, le contexte React suffit).

## Données

### Pipeline (hors app, dossiers `scripts/` et `data/`)

1. `pdftotext` sur le PDF officiel → `data/raw.txt` (une entrée par ligne).
2. `scripts/parse.mjs` → `data/base.json` : **3000 entrées exactement** (A1 : 900, A2 : 800, B1 : 700, B2 : 600, conforme aux comptes officiels). Gère les entrées coupées sur deux lignes, les niveaux collés (`adj.B1`), la coquille `noun.` du PDF, les homographes (`close1`/`close2`), les notes (`bank (money)`) et les collisions de casse (`it`/`IT` → `it`, `it-abbr`).
3. Enrichissement par lots de 250 : IPA General American, traduction française (sens principaux), définition anglaise simple (12 mots max), phrase d'exemple (8 à 14 mots, vocabulaire A2/B1) → `data/chunks/out-NN.json`.
4. `scripts/merge.mjs` : fusion et validation (couverture exacte des 3000 ids, IPA entre `/…/` et charset IPA, champs non vides, présence du mot dans l'exemple avec avertissement sinon) → `src/data/words.json`, embarqué dans le bundle.

### Schéma d'une entrée

```json
{ "id": "bank-money", "word": "bank", "note": "money", "hom": null,
  "senses": [{ "pos": "n.", "level": "A1" }], "level": "A1", "ord": 210,
  "ipa": "/bæŋk/", "fr": "banque", "def": "a place that keeps money for people",
  "ex": "I need to go to the bank to get some cash." }
```

**Sens secondaires** (ajout du 2026-07-21) : `def` et `ex` couvrent le sens principal ; les mots polysémiques (environ 706 : plusieurs groupes de sens, ou « ; » dans `fr`, comme `stage` = scène (n.) / organiser (v.)) portent en plus `alt: [{pos, def, ex}]`, 1 à 2 blocs, un par sens secondaire, générés par une seconde passe (`scripts/chunk-alt.mjs` → `data/chunks/alt-out-NN.json`, fusion et validation dans `merge.mjs`). Affichage : blocs compacts sous l'exemple principal (verso de carte, fiche mot), séparés par un filet pointillé, étiquetés par la catégorie grammaticale en italique.

`level` = niveau minimal parmi les sens, sert au filtrage. `ord` = ordre alphabétique de la liste officielle.

## Modèle de progression (localStorage, clé `oxford3000.v1`)

```ts
{ version: 1,
  settings: { dailyGoal: 20, autoAudio: false, sessionSize: 15 },
  words: { [id]: { s: 0|1|2, streak, lapses, flag, auto, last } },
  events: [ [id, ts, ok(0|1), src('rev'|'bulk')] ] }
```

- **Statuts** : 0 = nouveau (jamais vu), 1 = en cours (raté au moins une fois récemment), 2 = connu.
- **Règles** : réponse « Je connais » → statut 2, `streak+1`. « Pas encore » → statut 1, `streak=0`, `lapses+1`. Un mot connu raté redevient « en cours » (il ne compte plus comme connu).
- **Mots difficiles** : `flag` manuel (toggle sur la carte et dans la liste), plus auto-marquage quand `lapses ≥ 2` (une seule fois, `auto=true` ; si l'utilisateur retire le flag, il n'est pas reposé).
- **Marquage en masse** (« je connais déjà tous ces mots » depuis la liste filtrée ou l'onglet Trier) : événements `src='bulk'`, exclus du calcul de rythme pour ne pas fausser l'estimation.

## Algorithmes

- **Tirage de session** : filtre selon le mode (Tous, Non connus = statuts 0+1, Difficiles = flag, Jamais vus = statut 0), croisé avec un niveau optionnel, puis mélange Fisher-Yates, prend N (défaut 15, réglable 5 à 30). Pool plus petit que N : on prend tout.
- **Estimation de fin** : rythme = transitions nettes vers « connu » (événements `rev` uniquement) sur les 14 derniers jours ÷ jours écoulés dans la fenêtre (au moins 1). Moins de 5 transitions dans la fenêtre : repli sur l'objectif quotidien réglable (`dailyGoal`, défaut 20 mots/jour). Estimation = restants ÷ rythme → date affichée, avec le rythme en toutes lettres. Jamais de division par zéro grâce au repli.
- **Régression** : un mot connu raté fait baisser le compteur de connus (le total « connus » est toujours dérivé de l'état courant, pas cumulé).

## Écrans (4 onglets + réglages)

1. **Accueil** : anneau de progression (connus / 3000), tuiles restants, difficiles, rythme et date estimée de fin, répartition par niveau (A1 à B2, mini-barres connu/total), CTA « Réviser 15 mots ».
2. **Réviser** : écran de config (nombre de mots ; mode, « Jamais vus » par défaut ; niveau A1 à B2 croisé avec le mode, compteurs dynamiques ; repli en cascade Jamais vus → Non connus → Tous pour le CTA de l'accueil), puis pile de cartes. Recto : mot, catégories, niveaux, IPA, bouton audio ; tap ou espace pour retourner ; verso : traduction française, définition anglaise, exemples (mot surligné) ; boutons « Pas encore » / « Je connais », toggle difficile ; barre de progression x/N ; écran de fin avec score, liste des ratés et relance sur les ratés. Raccourcis clavier : Espace/Entrée retourner, ← pas encore, → je connais, F difficile, P audio.
3. **Trier** (ajout du 2026-07-21) : tri rapide de la phase de démarrage. Les mots jamais vus défilent un par un dans l'ordre de la liste (mot, IPA, catégorie et traduction visibles d'emblée : on trie, on ne teste pas), filtre par niveau avec compteurs, deux gros boutons « Passer » (session seulement, le mot reviendra) et « Je le connais » (statut connu, `src='bulk'`, hors calcul du rythme), annulation du dernier marquage, compteur de session. Clavier : → je connais, ← passer, U annuler, P audio. Logique pure `triagePool()` dans `draw.ts`, testée.
4. **Mots** : recherche (mot ou traduction), filtres niveau, statut et difficiles, liste légère ; chaque ligne montre le mot, l'IPA, la traduction et un badge de statut ; tap vers la fiche détaillée (carte complète, historique, toggles statut et difficile) ; action de masse « Tout marquer connu » sur le filtre courant (avec confirmation, `src='bulk'`).
5. **Réglages** (modale) : objectif par jour, taille de session, audio auto, export/import JSON de la progression, remise à zéro (double confirmation).

**Audio** : Web Speech API (`speechSynthesis`), voix en-US, débit 0.9. Disponible hors-ligne sur macOS, iOS et Android, aucun fichier à embarquer.

**Langue de l'UI** : français. Mobile d'abord (usage principal au téléphone), clavier au desktop.

## Déploiement

GitHub Pages : `npm run deploy` construit avec la base `/oxford-3000/` et pousse `dist/` sur la branche `gh-pages`. URL : <https://adrien-lebreton.github.io/oxford-3000/>.

## Tests (vitest)

Modules purs testés : transitions de statut (connu, raté, en cours, streak, lapses, auto-flag), tirages (taille, unicité, respect du filtre et du niveau, pool insuffisant, file de tri), estimation (rythme sur fenêtre de 14 jours, repli objectif, exclusion du bulk, régression), sérialisation et migration du store (état vide, version inconnue, import invalide rejeté). Le pipeline de données est validé par les assertions de `merge.mjs` (couverture 3000/3000, formats).

## Risques et limites assumées

- Progression par appareil (pas de sync cloud) : export/import JSON fourni. Une sync future passerait par un petit backend, hors périmètre v1.
- Qualité IPA et traductions : générées par lots avec validation automatique (format, couverture) et relecture d'échantillons ; correctifs ponctuels possibles dans les chunks puis re-fusion.
- `speechSynthesis` varie selon l'OS (voix différentes) ; bouton silencieux si l'API est absente.
- Sur iOS, la PWA s'installe via « Ajouter à l'écran d'accueil » (pas de bannière automatique) ; documenté dans le README.
