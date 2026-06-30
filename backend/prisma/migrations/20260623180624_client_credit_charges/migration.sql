-- CreateEnum
CREATE TYPE "ClientLedgerEntryType" AS ENUM ('SALE_CREDIT', 'PAYMENT', 'PAYMENT_VOID', 'SALE_VOID_REVERSAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ClientPaymentStatus" AS ENUM ('COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShopChargeStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "amountOnCredit" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "creditApprovedById" TEXT;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "creditReminderDays" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "creditLimit" DECIMAL(10,2),
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCreditPortion" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "originalAmount" DECIMAL(10,2) NOT NULL,
    "remainingAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientCreditPortion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPayment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "ClientPaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "recordedById" TEXT NOT NULL,
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "portionId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ClientPaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientLedgerEntry" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "ClientLedgerEntryType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "saleId" TEXT,
    "paymentId" TEXT,
    "recordedById" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditReminderContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contactedById" TEXT NOT NULL,
    "contactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "CreditReminderContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCharge" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "chargeDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "status" "ShopChargeStatus" NOT NULL DEFAULT 'ACTIVE',
    "recordedById" TEXT NOT NULL,
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_phone_key" ON "Client"("phone");

-- CreateIndex
CREATE INDEX "Client_shopId_isActive_name_idx" ON "Client"("shopId", "isActive", "name");

-- CreateIndex
CREATE INDEX "ClientCreditPortion_clientId_remainingAmount_createdAt_idx" ON "ClientCreditPortion"("clientId", "remainingAmount", "createdAt");

-- CreateIndex
CREATE INDEX "ClientPayment_shopId_createdAt_idx" ON "ClientPayment"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientLedgerEntry_clientId_createdAt_idx" ON "ClientLedgerEntry"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "ShopCharge_shopId_chargeDate_idx" ON "ShopCharge"("shopId", "chargeDate");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_creditApprovedById_fkey" FOREIGN KEY ("creditApprovedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCreditPortion" ADD CONSTRAINT "ClientCreditPortion_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCreditPortion" ADD CONSTRAINT "ClientCreditPortion_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPaymentAllocation" ADD CONSTRAINT "ClientPaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "ClientPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPaymentAllocation" ADD CONSTRAINT "ClientPaymentAllocation_portionId_fkey" FOREIGN KEY ("portionId") REFERENCES "ClientCreditPortion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLedgerEntry" ADD CONSTRAINT "ClientLedgerEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLedgerEntry" ADD CONSTRAINT "ClientLedgerEntry_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditReminderContact" ADD CONSTRAINT "CreditReminderContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditReminderContact" ADD CONSTRAINT "CreditReminderContact_contactedById_fkey" FOREIGN KEY ("contactedById") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCharge" ADD CONSTRAINT "ShopCharge_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCharge" ADD CONSTRAINT "ShopCharge_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCharge" ADD CONSTRAINT "ShopCharge_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill existing completed sales: full payment at POS, no credit
UPDATE "Sale" SET "amountPaid" = "total", "amountOnCredit" = 0 WHERE "status" = 'COMPLETED' AND "amountPaid" = 0 AND "amountOnCredit" = 0;
