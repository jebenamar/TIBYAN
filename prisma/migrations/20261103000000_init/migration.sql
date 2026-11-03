CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('OPEN', 'NON_COMMERCIAL', 'UNVERIFIED');

-- CreateTable
CREATE TABLE "Surah" (
    "id" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "nameArabic" TEXT NOT NULL,
    "nameTransliterated" TEXT NOT NULL,
    "nameTranslated" JSONB NOT NULL,
    "versesCount" INTEGER NOT NULL,
    "revelationPlace" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,

    CONSTRAINT "Surah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ayah" (
    "id" SERIAL NOT NULL,
    "surahId" INTEGER NOT NULL,
    "numberInSurah" INTEGER NOT NULL,
    "globalNumber" INTEGER NOT NULL,
    "textArabic" TEXT NOT NULL,
    "textSimple" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "tsv" tsvector GENERATED ALWAYS AS (to_tsvector('arabic', "searchText")) STORED,

    CONSTRAINT "Ayah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TafsirSource" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "titleArabic" TEXT NOT NULL,
    "titleLatin" TEXT NOT NULL,
    "authorArabic" TEXT NOT NULL,
    "authorLatin" TEXT NOT NULL,
    "description" TEXT,
    "edition" TEXT,
    "publisher" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "licenseStatus" "LicenseStatus" NOT NULL,
    "licenseNotes" TEXT,
    "version" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "importedAt" TIMESTAMP(3),
    "entryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TafsirSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TafsirEntry" (
    "id" SERIAL NOT NULL,
    "tafsirSourceId" INTEGER NOT NULL,
    "surahId" INTEGER NOT NULL,
    "ayahStart" INTEGER NOT NULL,
    "ayahEnd" INTEGER NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "contentArabic" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "tsv" tsvector GENERATED ALWAYS AS (to_tsvector('arabic', "searchText")) STORED,
    "reference" TEXT,
    "importVersion" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,

    CONSTRAINT "TafsirEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" SERIAL NOT NULL,
    "tafsirSourceId" INTEGER,
    "kind" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "stats" JSONB,
    "issues" JSONB,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Surah_number_key" ON "Surah"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Ayah_globalNumber_key" ON "Ayah"("globalNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Ayah_surahId_numberInSurah_key" ON "Ayah"("surahId", "numberInSurah");

-- CreateIndex
CREATE UNIQUE INDEX "TafsirSource_slug_key" ON "TafsirSource"("slug");

-- CreateIndex
CREATE INDEX "TafsirEntry_surahId_ayahStart_ayahEnd_idx" ON "TafsirEntry"("surahId", "ayahStart", "ayahEnd");

-- CreateIndex
CREATE UNIQUE INDEX "TafsirEntry_tafsirSourceId_surahId_ayahStart_key" ON "TafsirEntry"("tafsirSourceId", "surahId", "ayahStart");

-- AddForeignKey
ALTER TABLE "Ayah" ADD CONSTRAINT "Ayah_surahId_fkey" FOREIGN KEY ("surahId") REFERENCES "Surah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TafsirEntry" ADD CONSTRAINT "TafsirEntry_tafsirSourceId_fkey" FOREIGN KEY ("tafsirSourceId") REFERENCES "TafsirSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TafsirEntry" ADD CONSTRAINT "TafsirEntry_surahId_fkey" FOREIGN KEY ("surahId") REFERENCES "Surah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_tafsirSourceId_fkey" FOREIGN KEY ("tafsirSourceId") REFERENCES "TafsirSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- ───────────── Hand-written: integrity & search ─────────────
ALTER TABLE "Surah" ADD CONSTRAINT "Surah_number_range" CHECK ("number" BETWEEN 1 AND 114 AND "id" = "number");
ALTER TABLE "Surah" ADD CONSTRAINT "Surah_verses_positive" CHECK ("versesCount" > 0);
ALTER TABLE "Ayah" ADD CONSTRAINT "Ayah_number_positive" CHECK ("numberInSurah" > 0);
ALTER TABLE "Ayah" ADD CONSTRAINT "Ayah_global_range" CHECK ("globalNumber" BETWEEN 1 AND 6236);
ALTER TABLE "TafsirEntry" ADD CONSTRAINT "TafsirEntry_range_valid" CHECK ("ayahStart" > 0 AND "ayahEnd" >= "ayahStart");
ALTER TABLE "TafsirEntry" ADD CONSTRAINT "TafsirEntry_content_not_empty" CHECK (length(btrim("contentArabic")) > 0);

CREATE INDEX "Ayah_tsv_idx" ON "Ayah" USING GIN ("tsv");
CREATE INDEX "Ayah_searchText_trgm_idx" ON "Ayah" USING GIN ("searchText" gin_trgm_ops);
CREATE INDEX "Surah_searchText_trgm_idx" ON "Surah" USING GIN ("searchText" gin_trgm_ops);
CREATE INDEX "TafsirEntry_tsv_idx" ON "TafsirEntry" USING GIN ("tsv");
CREATE INDEX "TafsirEntry_source_surah_idx" ON "TafsirEntry" ("tafsirSourceId", "surahId", "ayahStart", "ayahEnd");
