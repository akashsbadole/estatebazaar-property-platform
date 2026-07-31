/*
  Warnings:

  - Added the required column `slug` to the `Property` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "isNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "area" INTEGER NOT NULL,
    "furnishing" TEXT NOT NULL DEFAULT 'UNFURNISHED',
    "bedrooms" INTEGER NOT NULL DEFAULT 0,
    "bathrooms" INTEGER NOT NULL DEFAULT 0,
    "parking" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isVerifiedListing" BOOLEAN NOT NULL DEFAULT false,
    "tourImages" TEXT,
    "contactPhone" TEXT,
    "contactPref" TEXT NOT NULL DEFAULT 'BOTH',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Property_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Insert with generated slugs (lowercase title + first 8 chars of id)
INSERT INTO "new_Property" ("area", "bathrooms", "bedrooms", "categoryId", "city", "contactPhone", "contactPref", "createdAt", "description", "furnishing", "id", "isNegotiable", "isVerifiedListing", "latitude", "location", "longitude", "ownerId", "parking", "pincode", "price", "state", "status", "title", "tourImages", "type", "updatedAt", "viewCount", "slug")
SELECT "area", "bathrooms", "bedrooms", "categoryId", "city", "contactPhone", "contactPref", "createdAt", "description", "furnishing", "id", "isNegotiable", "isVerifiedListing", "latitude", "location", "longitude", "ownerId", "parking", "pincode", "price", "state", "status", "title", "tourImages", "type", "updatedAt", "viewCount",
       lower(replace(replace(replace("title", ' ', '-'), ',', ''), '.', '')) || '-' || substr("id", 1, 8)
FROM "Property";
DROP TABLE "Property";
ALTER TABLE "new_Property" RENAME TO "Property";
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");
CREATE INDEX "Property_ownerId_idx" ON "Property"("ownerId");
CREATE INDEX "Property_categoryId_idx" ON "Property"("categoryId");
CREATE INDEX "Property_status_idx" ON "Property"("status");
CREATE INDEX "Property_city_idx" ON "Property"("city");
CREATE INDEX "Property_slug_idx" ON "Property"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;