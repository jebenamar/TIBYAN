# Sources des données et droits de réutilisation

> Principe directeur : **aucun texte coranique ni texte de Tafsir n'est généré, reformulé ou complété.**
> Les versets sans explication dans une source sont signalés comme manquants dans l'interface.

## 1. Texte coranique — Tanzil Project

| | |
|---|---|
| Fournisseur | [tanzil.net](https://tanzil.net) |
| Textes | Uthmani (affichage) + simple-clean (copie, index) — 6 236 versets |
| Licence | **Creative Commons Attribution 3.0** — copie verbatim autorisée, **modification interdite**, attribution et lien vers tanzil.net obligatoires |
| Vérifications à l'import | en-tête de licence présent, 6 236 lignes, alignement verset par verset avec le référentiel des 114 sourates |

Conformité : le texte est stocké et affiché tel quel. La forme normalisée (`searchText`) est un **index de recherche dérivé**, jamais affiché.
La basmala que Tanzil inclut au début du verset 1 (sourates 2–114 sauf 9) est **présentée** sur une ligne séparée ; les caractères ne sont pas modifiés (testé dans `tests/unit/arabic.test.ts`).

Métadonnées des sourates : Tanzil `quran-data.xml` (CC BY) pour les nombres de versets, noms traduits (fr/en/es) depuis l'API Quran.com — contrôle croisé des nombres de versets entre les deux fournisseurs à la génération (`pnpm data:surah-meta`).

## 2. Tafsirs

| Ouvrage | Fournisseur retenu | Statut licence | Couverture | Remarques d'import |
|---|---|---|---|---|
| التفسير الميسر | Tanzil `ar.muyassar` | Non commercial | 6 236 / 6 236 | 605 entrées couvrant plusieurs versets |
| تفسير السعدي | GitHub `meibassam/mosahaf-tafseer` | **Non vérifié** | 6 186 / 6 236 | 50 versets vides chez le fournisseur |
| تفسير ابن كثير | API Quran.com (ressource 14) | **Non vérifié** | 6 205 / 6 236 | 19 sourates avec versets absents chez le fournisseur |
| تفسير الطبري | API Quran.com (15) | **Non vérifié** | 6 196 / 6 236 | |
| تفسير القرطبي | API Quran.com (90) | **Non vérifié** | 6 235 / 6 236 | |
| تفسير البغوي | API Quran.com (94) | **Non vérifié** | 6 236 / 6 236 | |
| تفسير الجلالين | Tanzil `ar.jalalayn` | Non commercial | 6 236 / 6 236 | |

Rapports détaillés par source : `reports/import/<slug>.json` ; contrôle global : `reports/import/_validation.json` (`pnpm data validate`).

### Signification des statuts

- **Non commercial** : le fournisseur l'écrit explicitement (Tanzil : *« for non-commercial purposes only »*).
- **Non vérifié** : texte publiquement accessible mais **aucune licence de redistribution trouvée**. Usage d'étude personnel uniquement tant qu'une autorisation écrite des ayants droit n'a pas été obtenue.
- Aucune source n'est classée « ouverte » : l'ancienneté d'un ouvrage ne rend pas automatiquement libre son **édition numérique**.

### Points d'attention juridiques

- **Al-Wasit** (M. S. Tantawi) a été **retiré** : le texte fourni par Quran.com (et son miroir spa5k) est décalé d'un à trois versets dans une quarantaine d'entrées (ex. sourates 17 et 69), et l'ouvrage est une œuvre moderne probablement protégée.
- **Al-Muyassar** est une œuvre moderne du Complexe du Roi Fahd ; Tanzil la diffuse pour un usage non commercial.
- **As-Sa'di** (†1376 H / 1956) : le statut varie selon les pays et l'édition source n'est pas déclarée.
- **Avant toute mise en ligne publique ou commerciale**, obtenir les autorisations (Complexe du Roi Fahd, Quran Foundation, éditeurs) et mettre à jour `scripts/import/sources.ts` (`license`, `licenseStatus`, `edition`).

## 3. Choix des fournisseurs (comparaison de qualité)

Tests réalisés avant import (novembre 2026) :

- **As-Sa'di via Quran.com** : 282 enregistrements pour 286 versets dans Al-Baqara, et **décalage** autour de 2:106–111 (le texte attaché à 2:108 commente 2:106). Le jeu mosahaf-tafseer est correctement aligné sur ces versets → mosahaf retenu pour As-Sa'di.
- **Ibn Kathir via mosahaf-tafseer** : texte de 2:255 **tronqué** au début (17 977 caractères, commence au milieu d'un hadith) contre 29 829 caractères complets via Quran.com → Quran.com retenu pour Ibn Kathir et les autres ouvrages longs.
- **Muyassar / Jalalayn** : Tanzil, seule source avec une licence explicite.

Le système d'import permet de changer de fournisseur par ouvrage (`adapter` dans `sources.ts`) ou d'importer un fichier vérifié (JSON, JSONL, CSV, requête SQL).

## 4. Sources examinées non utilisées

| Source | Constat |
|---|---|
| qurancomplex.gov.sa/quran-dev | Polices et données officielles ; pas de fichier de Tafsir structuré exploitable trouvé — à revoir pour une édition officielle du Muyassar. |
| api.quranpedia.net | Accessible ; non intégrée dans ce MVP (conditions de réutilisation à vérifier). |
| alfurqan.online/docs | Accessible ; non intégrée (conditions à vérifier). |
| PDF | Exclus par principe : pas d'extraction automatique sans validation de la qualité et des droits. |

## 5. Contrôles d'intégrité

À l'import (`scripts/import/prepare.ts`) : assainissement HTML par liste blanche, plages dans les bornes réelles de chaque sourate, chevauchements rejetés, versets manquants **signalés et jamais comblés**, débuts suspects (troncature) signalés, empreinte SHA-256 par entrée.
En base : contraintes `CHECK` (plages valides, contenu non vide), unicité (source, sourate, verset de début).
Ré-imports idempotents : une sourate inchangée n'est pas réécrite ; une sourate modifiée est remplacée dans une transaction.
