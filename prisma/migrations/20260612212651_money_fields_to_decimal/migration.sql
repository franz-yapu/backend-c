/*
  Warnings:

  - You are about to alter the column `starting_price` on the `auction_coffee_lots` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `reserve_price` on the `auction_coffee_lots` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `current_price` on the `auction_coffee_lots` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `min_increment` on the `auctions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `amount` on the `bids` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `suggested_price` on the `coffee_lots` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `amount` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.

*/
-- AlterTable
ALTER TABLE "public"."auction_coffee_lots" ALTER COLUMN "starting_price" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "reserve_price" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "current_price" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "public"."auctions" ALTER COLUMN "min_increment" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "public"."bids" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "public"."coffee_lots" ALTER COLUMN "suggested_price" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "public"."transactions" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "bids_auctionId_coffeeLotId_amount_idx" ON "public"."bids"("auctionId", "coffeeLotId", "amount");
