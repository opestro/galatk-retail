-- Display Galatk SKUs as variants under a product family.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "variantLabel" TEXT;

CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"("category");
