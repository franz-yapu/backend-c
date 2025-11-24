/*
  Warnings:

  - You are about to drop the column `sellerId` on the `coffee_lots` table. All the data in the column will be lost.
  - Added the required column `seller` to the `coffee_lots` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."coffee_lots" DROP CONSTRAINT "coffee_lots_sellerId_fkey";

-- AlterTable
ALTER TABLE "public"."coffee_lots" DROP COLUMN "sellerId",
ADD COLUMN     "seller" TEXT NOT NULL;
