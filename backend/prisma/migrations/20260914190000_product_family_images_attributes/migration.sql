-- Product families (catalog parents), images, and variant attribute uniqueness.
-- Existing Product rows remain the sellable SKUs referenced by stock, sales, and orders.

CREATE TABLE "ProductFamily" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "availableOnline" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductFamily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductFamily_slug_key" ON "ProductFamily"("slug");

CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductImage_familyId_sortOrder_idx" ON "ProductImage"("familyId", "sortOrder");

ALTER TABLE "ProductImage"
    ADD CONSTRAINT "ProductImage_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "ProductFamily"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "familyId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "attributes" JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "attributesKey" TEXT NOT NULL DEFAULT 'default';

-- One family per distinct category (or first word of the SKU name).
INSERT INTO "ProductFamily" ("id", "name", "slug", "description", "isActive", "availableOnline", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    MIN(family_name),
    slug,
    MIN(description),
    BOOL_OR("isActive"),
    BOOL_OR("availableOnline"),
    NOW(),
    NOW()
FROM (
    SELECT
        COALESCE(NULLIF(TRIM("category"), ''), TRIM(SPLIT_PART("name", ' ', 1))) AS family_name,
        TRIM(BOTH '-' FROM regexp_replace(
            lower(translate(
                COALESCE(NULLIF(TRIM("category"), ''), TRIM(SPLIT_PART("name", ' ', 1))),
                'àáâäãåèéêëìíîïòóôöõùúûüýÿçñÀÁÂÄÃÅÈÉÊËÌÍÎÏÒÓÔÖÕÙÚÛÜÝÇÑ',
                'aaaaaaeeeeiiiiooooouuuuyycnaaaaaaeeeeiiiiooooouuuuyycn'
            )),
            '[^a-z0-9]+',
            ' ',
            'g'
        )) AS slug,
        "description",
        "isActive",
        "availableOnline"
    FROM "Product"
) grouped
GROUP BY slug;

UPDATE "Product" p
SET "familyId" = f."id"
FROM "ProductFamily" f
WHERE f."slug" = TRIM(BOTH '-' FROM regexp_replace(
    lower(translate(
        COALESCE(NULLIF(TRIM(p."category"), ''), TRIM(SPLIT_PART(p."name", ' ', 1))),
        'àáâäãåèéêëìíîïòóôöõùúûüýÿçñÀÁÂÄÃÅÈÉÊËÌÍÎÏÒÓÔÖÕÙÚÛÜÝÇÑ',
        'aaaaaaeeeeiiiiooooouuuuyycnaaaaaaeeeeiiiiooooouuuuyycn'
    )),
    '[^a-z0-9]+',
    ' ',
    'g'
));

-- Parse leftover labels into size/color JSON when possible.
UPDATE "Product"
SET "attributes" = CASE
    WHEN COALESCE(NULLIF(TRIM("variantLabel"), ''), '') = '' THEN '{}'::jsonb
    WHEN lower(SPLIT_PART(TRIM("variantLabel"), ' ', 1)) IN ('xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', '2xl', '3xl', '4xl', 'unique')
        AND NULLIF(TRIM(SUBSTRING(TRIM("variantLabel") FROM POSITION(' ' IN TRIM("variantLabel") || ' '))), '') IS NOT NULL
        THEN jsonb_build_object(
            'size', SPLIT_PART(TRIM("variantLabel"), ' ', 1),
            'color', TRIM(SUBSTRING(TRIM("variantLabel") FROM POSITION(' ' IN TRIM("variantLabel") || ' ')))
        )
    WHEN lower(SPLIT_PART(TRIM("variantLabel"), ' ', 1)) IN ('xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', '2xl', '3xl', '4xl', 'unique')
        THEN jsonb_build_object('size', SPLIT_PART(TRIM("variantLabel"), ' ', 1))
    ELSE jsonb_build_object('color', TRIM("variantLabel"))
END
WHERE "attributes" = '{}'::jsonb;

-- Canonical keys matching backend attributesKey(); suffix id on collisions so the unique index can be applied.
WITH keyed AS (
    SELECT
        id,
        "familyId",
        CASE
            WHEN "attributes" = '{}'::jsonb THEN 'default'
            ELSE (
                SELECT string_agg(key || ':' || val, '|' ORDER BY key)
                FROM (
                    SELECT
                        lower(e.key) AS key,
                        lower(translate(e.value #>> '{}',
                            'àáâäãåèéêëìíîïòóôöõùúûüýÿçñ',
                            'aaaaaaeeeeiiiiooooouuuuyycn'
                        )) AS val
                    FROM jsonb_each("attributes") AS e
                    WHERE coalesce(e.value #>> '{}', '') <> ''
                ) parts
            )
        END AS base_key
    FROM "Product"
),
ranked AS (
    SELECT
        id,
        "familyId",
        base_key,
        ROW_NUMBER() OVER (PARTITION BY "familyId", base_key ORDER BY id) AS rn
    FROM keyed
)
UPDATE "Product" p
SET "attributesKey" = CASE
    WHEN r.rn = 1 THEN r.base_key
    ELSE r.base_key || '#' || p.id
END
FROM ranked r
WHERE p.id = r.id;

ALTER TABLE "Product"
    ADD CONSTRAINT "Product_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "ProductFamily"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Product_familyId_idx" ON "Product"("familyId");

CREATE UNIQUE INDEX "Product_familyId_attributesKey_key" ON "Product"("familyId", "attributesKey");
