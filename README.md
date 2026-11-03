# تفسير — Tafsir du Saint Coran

Application web (Next.js 16, PWA) de consultation, de recherche et de comparaison des grands Tafsirs du Coran, dans leurs textes arabes originaux : Al-Muyassar, As-Sa'di, Ibn Kathir, At-Tabari, Al-Qurtubi, Al-Baghawi, Al-Jalalayn.

> **Avant toute publication**, lisez [`docs/SOURCES.md`](docs/SOURCES.md) : six des huit tafsirs ont un statut de licence **non vérifié** et ne doivent pas être redistribués publiquement sans autorisation.

## Démarrage rapide (Windows, macOS, Linux — sans Docker)

```bash
pnpm install                 # installe et génère le client Prisma
pnpm db:start                # PostgreSQL 18 local (embedded-postgres) sur :5433 — laisser tourner
pnpm db:migrate              # schéma + index de recherche
pnpm data quran              # texte coranique (Tanzil), ~10 s
pnpm data tafsir all         # 8 tafsirs (~230 Mo téléchargés, mis en cache dans .cache/)
pnpm data validate           # rapport d'intégrité
pnpm dev                     # http://localhost:3000
```

En production, définissez `DATABASE_URL` vers n'importe quel PostgreSQL ≥ 14 (config `arabic` et extension `pg_trgm` requises) et `NEXT_PUBLIC_SITE_URL`.

## Scripts

| Commande | Rôle |
|---|---|
| `pnpm data tafsir <slug> [--surahs 1-10,18] [--dry-run]` | import d'une source avec son adaptateur enregistré |
| `pnpm data tafsir <slug> --file data.json\|data.jsonl\|data.csv` | import d'un fichier structuré |
| `pnpm data tafsir <slug> --sql <url> --query "…"` | import depuis une base SQL (ex. dump restauré) |
| `pnpm test` | tests unitaires (Vitest) |
| `pnpm build && pnpm test:e2e` | tests E2E Playwright (desktop + mobile, hors ligne inclus) |
| `pnpm typecheck` / `pnpm lint` | contrôles statiques |

Format des fichiers importés : `surah`, `ayah` ou `ayah_start`/`ayah_end`, `text` (texte brut) ou `html` (assaini à l'import).

## Fonctionnalités

- **Recherche** (⌘K, `/`, ou la barre du hero) : référence directe `2:255`, `٢:٢٥٥`, `الفاتحة 5`, `al-kahf 10` ; sourates par nom arabe, translittéré, traduit ou numéro ; plein texte dans le Coran et les tafsirs (normalisation arabe + racinisation Snowball, mode exact), filtres par sourate et auteur, surlignage sur le texte original, historique local.
- **Lecture** `/tafsir/2/255?source=ibn-kathir` : verset en Amiri Quran, onglets de tafsir avec disponibilité, plages multi-versets signalées, fiche source (auteur, ouvrage, édition, fournisseur, licence), copie avec attribution, partage, flèches ←/→ adaptées au RTL, préchargement des versets voisins.
- **Comparateur** `/comparer/2/255?sources=ibn-kathir,saadi` : 2–3 colonnes sur desktop, onglets sur mobile, ajout/retrait, lien partageable, aucun jugement automatique.
- **Bibliothèque** : favoris (verset, explication, comparaison), notes personnelles séparées des textes, historique et reprise de lecture — stockés localement, sans compte.
- **Hors ligne** : PWA installable ; téléchargement d'un tafsir complet ou de sourates choisies dans IndexedDB, détection des versions, estimation du stockage, lecteur et recherche **sur les seules données téléchargées**.
- **Interface** en arabe (par défaut, RTL), français, anglais, espagnol ; thèmes clair / sombre / système ; taille, interligne et largeur de lecture.

## Architecture

```
prisma/                 schéma + migration (tsvector générés, CHECK, GIN, pg_trgm)
scripts/db.ts           PostgreSQL local sans Docker
scripts/import/         CLI, adaptateurs (Tanzil, Quran.com, mosahaf, JSON, CSV, SQL),
                        préparation pure (prepare.ts), pipeline idempotent, validation
src/app/                routes (App Router, Server Components) + API (suggest, offline)
src/proxy.ts            404 réels pour les versets hors bornes
src/lib/                normalisation arabe, références, recherche SQL, surlignage,
                        assainissement, préférences, stores locaux, IndexedDB
src/components/         shell, recherche, lecteur, comparateur, hors ligne, UI
public/sw.js            service worker
docs/                   SOURCES.md, DESIGN-SYSTEM.md
```

### Compromis importants

- **Cache Components désactivé** : la langue, le thème et les réglages sont lus dans un cookie par le layout racine pour poser `lang`/`dir`/thème dès le premier octet (pas de flash RTL/LTR). Les pages sont donc rendues dynamiquement ; les données stables sont mémorisées (React `cache` + mémo TTL) et les requêtes restent sous ~50 ms.
- **HTML des tafsirs assaini à l'import** (liste blanche stricte) puis rendu tel quel : la base ne contient que du balisage sûr, et l'on évite un coût d'assainissement à chaque requête.
- **Choix du fournisseur par ouvrage** après comparaison de qualité (voir `docs/SOURCES.md`).
- **Recherche** : index `tsvector` (Snowball arabe) sur une forme normalisée ; les candidats sont plafonnés à 1 500 avant classement pour garder les mots très fréquents rapides.
- **Hors ligne** : les données vivent dans IndexedDB (pas dans le cache du service worker) pour gérer versions, suppression et recherche locale. Une page de verset jamais visitée redirige hors connexion vers le lecteur IndexedDB.
- **Pas d'authentification ni d'administration** (hors périmètre MVP).

## Qualité

56 tests unitaires (normalisation arabe, références, recherche de sourates, surlignage, assainissement, préparation des imports, CSV, préférences, navigation) et 28 tests E2E (14 scénarios × desktop/mobile : parcours A–D, recherche, filtres, textes manquants, RTL/LTR, notes, hors connexion).
