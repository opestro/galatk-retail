-- CreateEnum
CREATE TYPE "DeliveryService" AS ENUM ('STOPDESK', 'HOME');

-- AlterTable
ALTER TABLE "OnlineOrder" ADD COLUMN "deliveryService" "DeliveryService";

-- CreateTable
CREATE TABLE "WilayaDeliveryRate" (
    "id" TEXT NOT NULL,
    "wilaya" TEXT NOT NULL,
    "stopdeskFee" DECIMAL(10,2) NOT NULL,
    "homeFee" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WilayaDeliveryRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WilayaDeliveryRate_wilaya_key" ON "WilayaDeliveryRate"("wilaya");
