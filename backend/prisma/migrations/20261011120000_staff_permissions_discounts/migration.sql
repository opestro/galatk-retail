-- CreateEnum
CREATE TYPE "StaffPermission" AS ENUM ('MANAGE_CATALOG', 'EDIT_PRICE', 'GIVE_DISCOUNT');

-- AlterTable
ALTER TABLE "StaffUser" ADD COLUMN "permissions" "StaffPermission"[] DEFAULT ARRAY[]::"StaffPermission"[];

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SaleLine" ADD COLUMN "listPrice" DECIMAL(10,2);
