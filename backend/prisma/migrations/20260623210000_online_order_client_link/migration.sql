-- Add online order client link and fulfillment sale reference
ALTER TABLE "OnlineOrder" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "onlineOrderId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Sale_onlineOrderId_key" ON "Sale"("onlineOrderId");
CREATE INDEX IF NOT EXISTS "OnlineOrder_clientId_idx" ON "OnlineOrder"("clientId");

ALTER TABLE "OnlineOrder" ADD CONSTRAINT "OnlineOrder_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Sale" ADD CONSTRAINT "Sale_onlineOrderId_fkey"
  FOREIGN KEY ("onlineOrderId") REFERENCES "OnlineOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
