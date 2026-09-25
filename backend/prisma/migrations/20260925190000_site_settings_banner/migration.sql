-- Singleton row for the public storefront homepage banner (editable in admin settings).
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "bannerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bannerTitle" TEXT NOT NULL,
    "bannerSubtitle" TEXT NOT NULL,
    "bannerImageUrl" TEXT,
    "bannerImageFilename" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SiteSettings" ("id", "bannerEnabled", "bannerTitle", "bannerSubtitle", "updatedAt")
VALUES (
  'default',
  true,
  'Shop from All Our Stores',
  'Browse products from multiple locations. Choose your preferred shop for each item and enjoy flexible pickup or delivery options.',
  CURRENT_TIMESTAMP
);
