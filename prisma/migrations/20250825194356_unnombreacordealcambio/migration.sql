/*
  Warnings:

  - Made the column `starting_price` on table `auction_coffee_lots` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."auction_coffee_lots" ALTER COLUMN "starting_price" SET NOT NULL;
