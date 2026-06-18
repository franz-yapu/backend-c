-- CreateIndex
CREATE INDEX "bids_auctionId_coffeeLotId_createdAt_idx" ON "public"."bids"("auctionId", "coffeeLotId", "created_at");
