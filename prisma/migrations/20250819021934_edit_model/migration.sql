/*
  Warnings:

  - You are about to drop the column `harvest_date` on the `coffee_lots` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `coffee_lots` table. All the data in the column will be lost.
  - You are about to drop the column `quality` on the `coffee_lots` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."CoffeeProcess" ADD VALUE 'PULPED';
ALTER TYPE "public"."CoffeeProcess" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "public"."coffee_lots" DROP COLUMN "harvest_date",
DROP COLUMN "origin",
DROP COLUMN "quality",
ADD COLUMN     "acidity" TEXT,
ADD COLUMN     "aftertaste" TEXT,
ADD COLUMN     "body" TEXT,
ADD COLUMN     "community" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "drying_system" TEXT,
ADD COLUMN     "flavor" TEXT,
ADD COLUMN     "fragrance_aroma" TEXT,
ADD COLUMN     "harvest_year" INTEGER,
ADD COLUMN     "isSpecialty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "municipality" TEXT,
ADD COLUMN     "position" INTEGER,
ADD COLUMN     "producer_name" TEXT,
ADD COLUMN     "production_system" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "quantity_lbs" DOUBLE PRECISION,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "shade_type" TEXT,
ADD COLUMN     "variety" TEXT;
