/*
  Warnings:

  - You are about to drop the `category` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."product" DROP CONSTRAINT "product_category_id_fkey";

-- DropTable
DROP TABLE "public"."category";

-- CreateTable
CREATE TABLE "public"."categoria" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."branding" (
    "id" TEXT NOT NULL,
    "primary_color" TEXT NOT NULL DEFAULT '#CA3636',
    "secondary_color" TEXT NOT NULL DEFAULT '#FF9A24',
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "email_logo_url" TEXT,
    "theme_mode" TEXT NOT NULL DEFAULT 'light',
    "font_family" TEXT,
    "border_radius" TEXT DEFAULT '4px',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."brand_history" (
    "id" TEXT NOT NULL,
    "branding_id" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."brand_history" ADD CONSTRAINT "brand_history_branding_id_fkey" FOREIGN KEY ("branding_id") REFERENCES "public"."branding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
