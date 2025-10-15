-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('PRODUCER', 'ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "public"."AuctionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."CoffeeQuality" AS ENUM ('SPECIALTY', 'PREMIUM', 'STANDARD', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "public"."CoffeeProcess" AS ENUM ('WASHED', 'NATURAL', 'HONEY', 'ANAEROBIC');

-- CreateTable
CREATE TABLE "public"."dms" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "userId" TEXT,
    "module" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "company_name" TEXT,
    "phone" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."coffee_lots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "origin" TEXT NOT NULL,
    "harvest_date" TIMESTAMP(3) NOT NULL,
    "quality" "public"."CoffeeQuality",
    "process" "public"."CoffeeProcess",
    "altitude" INTEGER,
    "quantity" DOUBLE PRECISION NOT NULL,
    "cup_score" DOUBLE PRECISION,
    "moisture_content" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "suggested_price" DOUBLE PRECISION,
    "isInAuction" BOOLEAN NOT NULL DEFAULT false,
    "images" TEXT,
    "documents" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sellerId" TEXT NOT NULL,
    "auctionId" TEXT,

    CONSTRAINT "coffee_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auction_coffee_lots" (
    "id" TEXT NOT NULL,
    "starting_price" DOUBLE PRECISION NOT NULL,
    "reserve_price" DOUBLE PRECISION,
    "auctionId" TEXT NOT NULL,
    "coffeeLotId" TEXT NOT NULL,

    CONSTRAINT "auction_coffee_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auctions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "min_increment" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "status" "public"."AuctionStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "adminId" TEXT NOT NULL,
    "sellerId" TEXT,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bids" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auctionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payment_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "auctionId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "file" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "category_id" TEXT NOT NULL,
    "marca_id" TEXT NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."marca" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "public"."role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "public"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auction_coffee_lots_auctionId_coffeeLotId_key" ON "public"."auction_coffee_lots"("auctionId", "coffeeLotId");

-- CreateIndex
CREATE INDEX "auctions_status_isActive_idx" ON "public"."auctions"("status", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "only_one_active_auction" ON "public"."auctions"("isActive");

-- CreateIndex
CREATE INDEX "bids_auctionId_amount_idx" ON "public"."bids"("auctionId", "amount");

-- AddForeignKey
ALTER TABLE "public"."dms" ADD CONSTRAINT "dms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user" ADD CONSTRAINT "user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."coffee_lots" ADD CONSTRAINT "coffee_lots_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coffee_lots" ADD CONSTRAINT "coffee_lots_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "public"."auctions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."auction_coffee_lots" ADD CONSTRAINT "auction_coffee_lots_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "public"."auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."auction_coffee_lots" ADD CONSTRAINT "auction_coffee_lots_coffeeLotId_fkey" FOREIGN KEY ("coffeeLotId") REFERENCES "public"."coffee_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."auctions" ADD CONSTRAINT "auctions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."auctions" ADD CONSTRAINT "auctions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bids" ADD CONSTRAINT "bids_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "public"."auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bids" ADD CONSTRAINT "bids_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "public"."auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product" ADD CONSTRAINT "product_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "public"."marca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
