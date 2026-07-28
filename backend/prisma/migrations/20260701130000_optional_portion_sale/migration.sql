-- Allow credit portions from adjustments (no linked sale)
ALTER TABLE "ClientCreditPortion" ALTER COLUMN "saleId" DROP NOT NULL;
