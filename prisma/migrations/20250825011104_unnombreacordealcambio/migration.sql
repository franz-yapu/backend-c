/*
  Warnings:

  - The `phone` column on the `user` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."user" DROP COLUMN "phone",
ADD COLUMN     "phone" INTEGER;
