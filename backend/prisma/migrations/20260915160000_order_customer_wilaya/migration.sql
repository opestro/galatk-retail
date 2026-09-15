-- AlterTable
ALTER TABLE "OnlineOrder" ADD COLUMN "customerWilaya" TEXT;

-- CreateIndex
CREATE INDEX "OnlineOrder_shopId_customerWilaya_idx" ON "OnlineOrder"("shopId", "customerWilaya");
