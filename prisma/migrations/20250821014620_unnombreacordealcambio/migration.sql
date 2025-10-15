/*
  Warnings:

  - The `process` column on the `coffee_lots` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."coffee_lots" DROP COLUMN "process",
ADD COLUMN     "process" TEXT;
