/*
  Warnings:

  - Added the required column `coffeeLotId` to the `bids` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."product" DROP CONSTRAINT "product_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."product" DROP CONSTRAINT "product_marca_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user" DROP CONSTRAINT "user_role_id_fkey";

-- AlterTable
ALTER TABLE "public"."auction_coffee_lots" ADD COLUMN     "current_price" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."bids" ADD COLUMN     "coffeeLotId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."product" ADD COLUMN     "userId" TEXT,
ALTER COLUMN "category_id" DROP NOT NULL,
ALTER COLUMN "marca_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."user" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT;

-- AddForeignKey
ALTER TABLE "public"."user" ADD CONSTRAINT "user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bids" ADD CONSTRAINT "bids_coffeeLotId_fkey" FOREIGN KEY ("coffeeLotId") REFERENCES "public"."coffee_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product" ADD CONSTRAINT "product_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "public"."marca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product" ADD CONSTRAINT "product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
