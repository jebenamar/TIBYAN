/**
 * Registry of Tafsir sources.
 *
 * RULES
 *  - Only factual bibliographic metadata. Where a provider does not state the
 *    print edition its digital text derives from, `edition` stays null and the
 *    UI says "edition not specified by the provider".
 *  - `licenseStatus` reflects what we could VERIFY, not what is likely:
 *      OPEN            explicit open licence
 *      NON_COMMERCIAL  provider explicitly allows non-commercial use
 *      UNVERIFIED      publicly accessible, no redistribution terms found
 *  - `adapter` is chosen per work after a data-quality comparison
 *    (see docs/SOURCES.md, section "Choix des fournisseurs").
 */
import type { LicenseStatus } from "../../src/generated/prisma/enums";

export type AdapterConfig =
  | { kind: "tanzil"; transId: string }
  | { kind: "qurancom"; resourceId: number }
  | { kind: "mosahaf"; typeName: string };

export interface SourceDefinition {
  slug: string;
  titleArabic: string;
  titleLatin: string;
  authorArabic: string;
  authorLatin: string;
  description: string;
  edition: string | null;
  publisher: string | null;
  sourceUrl: string;
  sourceName: string;
  license: string;
  licenseStatus: LicenseStatus;
  licenseNotes: string;
  version: string;
  sortOrder: number;
  adapter: AdapterConfig;
}

const QURANCOM_NOTE =
  "Texte obtenu via l'API publique Quran.com (v4). Aucune licence de redistribution n'est publiée pour ce texte : usage d'étude personnel et non commercial uniquement, en attendant une autorisation écrite de l'ayant droit.";
const MOSAHAF_NOTE =
  "Jeu de données GitHub meibassam/mosahaf-tafseer : aucune licence ni provenance éditoriale déclarée. Retenu pour cet ouvrage car son alignement verset/commentaire est meilleur que l'alternative testée. Usage d'étude personnel uniquement, en attendant vérification des droits.";

export const SOURCES: SourceDefinition[] = [
  {
    slug: "muyassar",
    titleArabic: "التفسير الميسر",
    titleLatin: "Tafsir Al-Muyassar",
    authorArabic: "نخبة من العلماء — مجمع الملك فهد لطباعة المصحف الشريف",
    authorLatin: "Comité de savants — Complexe du Roi Fahd",
    description: "تفسير مختصر ميسّر أعدّته نخبة من العلماء بإشراف مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة.",
    edition: null,
    publisher: "مجمع الملك فهد لطباعة المصحف الشريف",
    sourceUrl: "https://tanzil.net/trans/ar.muyassar",
    sourceName: "Tanzil.net",
    license: "Tanzil — usage non commercial",
    licenseStatus: "NON_COMMERCIAL",
    licenseNotes:
      "Tanzil indique : « The translations provided at this page are for non-commercial purposes only ». Fichier ar.muyassar, dernière mise à jour déclarée : 7 janvier 2011.",
    version: "tanzil-ar.muyassar-2011-01-07",
    sortOrder: 1,
    adapter: { kind: "tanzil", transId: "ar.muyassar" },
  },
  {
    slug: "saadi",
    titleArabic: "تفسير السعدي",
    titleLatin: "Tafsir As-Sa'di",
    authorArabic: "عبد الرحمن بن ناصر السعدي",
    authorLatin: "ʿAbd al-Raḥmān ibn Nāṣir al-Saʿdī",
    description: "تيسير الكريم الرحمن في تفسير كلام المنان.",
    edition: null,
    publisher: null,
    sourceUrl: "https://github.com/meibassam/mosahaf-tafseer",
    sourceName: "mosahaf-tafseer (GitHub)",
    license: "Non déclarée",
    licenseStatus: "UNVERIFIED",
    licenseNotes: MOSAHAF_NOTE,
    version: "mosahaf-tafseer@master",
    sortOrder: 2,
    adapter: { kind: "mosahaf", typeName: "تفسير السعدي" },
  },
  {
    slug: "ibn-kathir",
    titleArabic: "تفسير ابن كثير",
    titleLatin: "Tafsir Ibn Kathir",
    authorArabic: "إسماعيل بن عمر بن كثير",
    authorLatin: "Ismāʿīl ibn ʿUmar Ibn Kathīr",
    description: "تفسير القرآن العظيم.",
    edition: null,
    publisher: null,
    sourceUrl: "https://api.quran.com/api/v4/tafsirs/14",
    sourceName: "Quran.com API v4 (resource 14)",
    license: "Non déclarée",
    licenseStatus: "UNVERIFIED",
    licenseNotes: QURANCOM_NOTE,
    version: "qurancom-v4-r14",
    sortOrder: 3,
    adapter: { kind: "qurancom", resourceId: 14 },
  },
  {
    slug: "tabari",
    titleArabic: "تفسير الطبري",
    titleLatin: "Tafsir At-Tabari",
    authorArabic: "محمد بن جرير الطبري",
    authorLatin: "Muḥammad ibn Jarīr al-Ṭabarī",
    description: "جامع البيان عن تأويل آي القرآن.",
    edition: null,
    publisher: null,
    sourceUrl: "https://api.quran.com/api/v4/tafsirs/15",
    sourceName: "Quran.com API v4 (resource 15)",
    license: "Non déclarée",
    licenseStatus: "UNVERIFIED",
    licenseNotes: QURANCOM_NOTE,
    version: "qurancom-v4-r15",
    sortOrder: 4,
    adapter: { kind: "qurancom", resourceId: 15 },
  },
  {
    slug: "qurtubi",
    titleArabic: "تفسير القرطبي",
    titleLatin: "Tafsir Al-Qurtubi",
    authorArabic: "محمد بن أحمد القرطبي",
    authorLatin: "Muḥammad ibn Aḥmad al-Qurṭubī",
    description: "الجامع لأحكام القرآن.",
    edition: null,
    publisher: null,
    sourceUrl: "https://api.quran.com/api/v4/tafsirs/90",
    sourceName: "Quran.com API v4 (resource 90)",
    license: "Non déclarée",
    licenseStatus: "UNVERIFIED",
    licenseNotes: QURANCOM_NOTE,
    version: "qurancom-v4-r90",
    sortOrder: 5,
    adapter: { kind: "qurancom", resourceId: 90 },
  },
  {
    slug: "baghawi",
    titleArabic: "تفسير البغوي",
    titleLatin: "Tafsir Al-Baghawi",
    authorArabic: "الحسين بن مسعود البغوي",
    authorLatin: "al-Ḥusayn ibn Masʿūd al-Baghawī",
    description: "معالم التنزيل.",
    edition: null,
    publisher: null,
    sourceUrl: "https://api.quran.com/api/v4/tafsirs/94",
    sourceName: "Quran.com API v4 (resource 94)",
    license: "Non déclarée",
    licenseStatus: "UNVERIFIED",
    licenseNotes: QURANCOM_NOTE,
    version: "qurancom-v4-r94",
    sortOrder: 6,
    adapter: { kind: "qurancom", resourceId: 94 },
  },
  {
    slug: "jalalayn",
    titleArabic: "تفسير الجلالين",
    titleLatin: "Tafsir Al-Jalalayn",
    authorArabic: "جلال الدين المحلي وجلال الدين السيوطي",
    authorLatin: "Jalāl al-Dīn al-Maḥallī & Jalāl al-Dīn al-Suyūṭī",
    description: "تفسير الجلالين.",
    edition: null,
    publisher: null,
    sourceUrl: "https://tanzil.net/trans/ar.jalalayn",
    sourceName: "Tanzil.net",
    license: "Tanzil — usage non commercial",
    licenseStatus: "NON_COMMERCIAL",
    licenseNotes:
      "Tanzil indique : « The translations provided at this page are for non-commercial purposes only ». Fichier ar.jalalayn.",
    version: "tanzil-ar.jalalayn",
    sortOrder: 7,
    adapter: { kind: "tanzil", transId: "ar.jalalayn" },
  },
];

export function getSourceDef(slug: string): SourceDefinition {
  const s = SOURCES.find((x) => x.slug === slug);
  if (!s) throw new Error(`Unknown source "${slug}". Known: ${SOURCES.map((x) => x.slug).join(", ")}`);
  return s;
}
