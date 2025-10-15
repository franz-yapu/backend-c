/*
  Warnings:

  - Added the required column `coffeeLotId` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "coffeeLotId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_coffeeLotId_fkey" FOREIGN KEY ("coffeeLotId") REFERENCES "public"."coffee_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
