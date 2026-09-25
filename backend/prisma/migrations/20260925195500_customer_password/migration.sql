-- Client-space login: optional password on the global Customer identity.
ALTER TABLE "Customer" ADD COLUMN "passwordHash" TEXT;
