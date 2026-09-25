-- Multiple homepage banner slides with a configurable autoplay interval.
ALTER TABLE "SiteSettings" ADD COLUMN "bannerIntervalMs" INTEGER NOT NULL DEFAULT 5000;

CREATE TABLE "SiteBannerImage" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteBannerImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SiteBannerImage_settingsId_sortOrder_idx" ON "SiteBannerImage"("settingsId", "sortOrder");

ALTER TABLE "SiteBannerImage"
    ADD CONSTRAINT "SiteBannerImage_settingsId_fkey"
    FOREIGN KEY ("settingsId") REFERENCES "SiteSettings"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "SiteBannerImage" ("id", "settingsId", "filename", "url", "mimeType", "sortOrder", "createdAt")
SELECT
    md5(random()::text || clock_timestamp()::text || "id"),
    "id",
    "bannerImageFilename",
    "bannerImageUrl",
    'image/jpeg',
    0,
    CURRENT_TIMESTAMP
FROM "SiteSettings"
WHERE "bannerImageUrl" IS NOT NULL
  AND "bannerImageFilename" IS NOT NULL;

ALTER TABLE "SiteSettings" DROP COLUMN IF EXISTS "bannerImageUrl";
ALTER TABLE "SiteSettings" DROP COLUMN IF EXISTS "bannerImageFilename";
