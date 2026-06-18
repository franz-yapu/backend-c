-- CreateTable
CREATE TABLE "public"."translation_overrides" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "translation_overrides_locale_idx" ON "public"."translation_overrides"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "translation_overrides_locale_key_key" ON "public"."translation_overrides"("locale", "key");
