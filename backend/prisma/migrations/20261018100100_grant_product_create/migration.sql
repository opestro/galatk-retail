-- Old MANAGE_CATALOG (now PRODUCT_VIEW) also allowed adding products. Kept for existing grants.
-- Separate migration: a freshly added enum value cannot be used in the transaction that adds it.
UPDATE "StaffUser"
SET "permissions" = array_append("permissions", 'PRODUCT_CREATE'::"StaffPermission")
WHERE 'PRODUCT_VIEW'::"StaffPermission" = ANY("permissions");
