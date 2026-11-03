# Design system — « Islamic Futurism »

Architecture émeraude, filets de laiton, pierre ivoire, verre nocturne. Toutes les couleurs sont des **jetons** (`src/app/globals.css`) ; les composants n'utilisent jamais de valeur hexadécimale directe.

## Couleurs

| Jeton | Clair | Sombre | Usage |
|---|---|---|---|
| `bg` | `#F8F5ED` ivoire | `#071B19` nuit | fond |
| `surface` | `#FFFDF8` blanc chaud | `#0B2421` | surfaces de lecture |
| `primary` | `#063D35` émeraude | `#0C5A4E` | identité, onglet actif |
| `accent` | `#087F6D` jade | `#43C6AB` | actions, liens, citations coraniques dans le tafsir |
| `gold` | `#C9A76A` | `#D6B67A` | décor uniquement (filets, rosace) |
| `gold-ink` | `#85652A` | `#DCBF88` | laiton pour **texte** (contraste AA) |
| `ink` / `ink-soft` / `muted` | | | hiérarchie du texte (muted ≥ 4,5:1) |

Thème : `system` (média-requête), `light` ou `dark` via `data-theme` sur `<html>`, posé côté serveur depuis le cookie de préférences → aucun flash.

## Typographie

| Rôle | Police | Classe |
|---|---|---|
| Versets | Amiri Quran (OFL) | `.quran-text`, `font-quran` |
| Corps du tafsir | Noto Naskh Arabic | `.tafsir-prose`, `font-arabic` |
| Titres, noms de sourates | Amiri | `font-display` |
| Interface latine | Geist | `font-sans` |

Variables de lecture (réglages utilisateur) : `--reader-scale`, `--reader-leading`, `--reader-width`.
Dans `.tafsir-prose`, les citations coraniques (`<q data-quran>`) sont encadrées de ﴿ ﴾ et rendues en Amiri Quran.

## Matériaux et motifs

- `.hairline` — bordure 1 px en dégradé laiton → ligne (lumière rasante sur l'arête haute).
- `.glass` — verre dépoli (barre supérieure, onglets collants, navigation mobile), utilisé avec parcimonie.
- `<PatternLayer>` — treillis khatam à 8 branches, tracé avec un jeton (se thématise seul).
- `<Rosette>` — rosace girih générative (SVG), rotation de 240 s, coupée par `prefers-reduced-motion`.
- `<AyahNumber>` — marqueur de verset octogonal en chiffres arabes-indiens.
- `<Ornament>` — séparateur filet / étoile / filet.

## Composants (`src/components/ui`, style shadcn sur Radix)

`Button` (primary, accent, outline, ghost, gold, link), `Badge`, `Kbd`, `Dialog`, `Popover`, `Tooltip`. `LicenseBadge` traduit le statut de licence d'une source.

## Mise en page

- **Desktop ≥ 1024 px** : barre latérale repliable (état persistant) avec liste filtrable des 114 sourates, recherche globale ⌘K, colonne de lecture + panneau source collant, comparateur en 2–3 colonnes.
- **Tablette** : contenu pleine largeur, onglets de tafsir collants, informations de source sous le texte.
- **Mobile** : barre de navigation inférieure (recherche centrale surélevée), cibles tactiles ≥ 44 px, comparateur en onglets.

## Accessibilité

Lien d'évitement, focus visible (anneau jade), `aria-current` pour la navigation, combobox ARIA complète pour la recherche, `role=status` pour les textes manquants et la connectivité, `lang="ar" dir="rtl"` sur chaque bloc arabe y compris dans l'interface LTR, `prefers-reduced-motion` respecté, aucune information portée par la seule couleur (icônes + libellés de licence).
