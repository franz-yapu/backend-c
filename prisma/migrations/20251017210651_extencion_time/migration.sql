-- AlterTable
ALTER TABLE "public"."auctions" ADD COLUMN     "extended_times" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "extension_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "extension_minutes" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "original_end_date" TIMESTAMP(3);
