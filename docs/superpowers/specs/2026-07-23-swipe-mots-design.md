# Swipe « Tinder » sur la page Mots — design

Date : 2026-07-23 · Statut : implémenté (session autonome, décisions prises sans aller-retour)

## Demande

Sur la page « Mots », un swipe latéral façon Tinder pour classer chaque mot.
Mapping initial : gauche = « Difficile », droite = « Connu ». **Inversé le
2026-07-23 à la demande de l'utilisateur : gauche = « Connu », droite =
« Difficile »** (les classes CSS séparent depuis le côté d'ancrage `start`/`end`
de la teinte `good`/`hard`).

## Décisions

- **Geste sur chaque ligne** (`.wordrow`), pas sur une pile de cartes : la page Mots
  est une liste ; l'équivalent naturel du swipe Tinder y est le glissement latéral
  de rangée (façon iOS Mail), avec la sémantique Tinder : gauche = négatif
  (difficile), droite = positif (connu).
- **Actions branchées sur le store existant** :
  - gauche → `status(id, 2)` (idempotent si déjà connu ; le fond affiche alors
    « Déjà connu »).
  - droite → `flag(id)` (toggle : si déjà difficile, le fond affiche
    « Retirer » — c'est l'annulation naturelle du geste).
- **Mécanique** : Pointer Events + `touch-action: pan-y` (le scroll vertical reste
  natif). Le geste ne s'engage qu'après ~14 px majoritairement horizontaux.
  Déclenchement au relâcher : course visible ≥ 76 px **ou** pichenette rapide
  (≥ 0,55 px/ms sur ≥ 36 px). Au-delà du seuil, la course devient élastique
  (amortie), plafonnée à 132 px.
- **Retour visuel** : fond coloré révélé sous la ligne — vert `--good` + ✓ pour
  « Connu » (à droite, révélé en glissant à gauche), jaune surligneur `--hl` +
  icône surligneur pour « Difficile » (à gauche, révélé en glissant à droite). Fond doux pendant la course,
  couleur pleine + léger scale du label quand le seuil est armé. Aucune bordure
  (règle « Verre d'Oxford »). Après déclenchement, la ligne revient en place avec
  le ressort `--spring` ; la pastille de statut / le surlignage du mot confirment.
- **Clic préservé** : un tap sans glissement ouvre toujours la fiche ; après un
  swipe, le clic est avalé (garde en phase capture).
- **Accessibilité** : le geste est un raccourci ; la fiche mot reste le chemin
  complet (statut + interrupteur difficile). Les fonds sont `aria-hidden`.

## Composants

- `src/ui/swipe-gesture.ts` — maths pures du geste (amortissement, décision de
  déclenchement), testées dans `swipe-gesture.test.ts`.
- `src/ui/SwipeRow.tsx` — wrapper générique : deux actions (gauche/droite) avec
  label + icône, enfants inchangés. Gère pointeurs, vitesse, capture, suppression
  du clic.
- `src/ui/WordList.tsx` — enveloppe chaque `.wordrow` dans `SwipeRow`.
- `src/styles.css` — `.swiperow`, `.swipe-under`, `.swipe-mover` (la classe
  `.swipe` existante = surligneur, non touchée).

## Écarté

- Swipe sur la fiche (WordSheet) ou pile de cartes dédiée : hors demande.
- Annulation « toast » après swipe droite : la fiche permet déjà de corriger.

## Revue adversariale (après implémentation)

Constats confirmés et corrigés :
- Drag fantôme souris (appui relâché hors rangée → le survol faisait glisser la
  rangée) : garde `e.buttons === 0` hors touch → reset.
- Vélocité périmée (jab puis pause immobile déclenchait quand même) :
  `velocityAtRelease` (TTL 100 ms), amorçage de la mesure à l'engagement,
  lissage 60/40 de l'échantillon instantané.
- `content-visibility` sur `.swiperow` rognait l'ombre des rangées (paint
  containment du wrapper) : retiré du wrapper, conservé sur `.wordrow`.
- Libellé « Retirer « difficile » » trop long pour la course max : « Retirer ».
- Contraste bandeau armé « Connu » (blanc/vert ≈ 2,4:1) : encre `#04351c`.
- Re-rendu des 150+ rangées à chaque swipe : `WordRow` mémoïsé (props scalaires,
  callbacks stables), seule la rangée touchée se re-rend.

Constat accepté sans correctif : en vue filtrée (« Difficiles », statut), la
rangée disparaît instantanément au relâcher (démontage) — c'est le retour visuel
naturel d'une vue filtrée, comme l'archivage iOS Mail.
