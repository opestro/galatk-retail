-- AlterTable: add unitCost columns (unrelated prior in-progress schema change)
ALTER TABLE "Product" ADD COLUMN     "unitCost" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "SaleLine" ADD COLUMN     "unitCost" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "OnlineOrderLine" ADD COLUMN     "unitCost" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable: global Customer identity
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- AlterTable: add nullable customerId first so we can backfill before enforcing NOT NULL
ALTER TABLE "Client" ADD COLUMN     "customerId" TEXT;

-- Data backfill: one Customer per existing Client, matched by phone.
-- Existing Client.phone was globally unique before this migration, so this is lossless.
INSERT INTO "Customer" ("id", "name", "phone", "email", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "name", "phone", "email", "createdAt", "updatedAt"
FROM "Client";

UPDATE "Client" c
SET "customerId" = cu."id"
FROM "Customer" cu
WHERE cu."phone" = c."phone";

-- Enforce NOT NULL now that every row has a customerId
ALTER TABLE "Client" ALTER COLUMN "customerId" SET NOT NULL;

-- DropIndex: phone is no longer globally unique on Client, it's per-shop now
DROP INDEX "Client_phone_key";

-- CreateIndex
CREATE INDEX "Client_customerId_idx" ON "Client"("customerId");
CREATE UNIQUE INDEX "Client_shopId_phone_key" ON "Client"("shopId", "phone");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
