-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NOVO', 'ENVIADO', 'RESPONDEU', 'REUNIAO', 'FECHOU', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "WebsiteType" AS ENUM ('none', 'social', 'real');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "city" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "websiteType" "WebsiteType" NOT NULL DEFAULT 'none',
    "rating" DOUBLE PRECISION,
    "reviewsCount" INTEGER,
    "mapsUrl" TEXT,
    "pagespeedScore" INTEGER,
    "status" "LeadStatus" NOT NULL DEFAULT 'NOVO',
    "score" INTEGER,
    "scoreReason" TEXT,
    "hook" TEXT,
    "message" TEXT,
    "notes" TEXT,
    "contactedAt" TIMESTAMP(3),
    "nextFollowupAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_placeId_key" ON "Lead"("placeId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_nextFollowupAt_idx" ON "Lead"("nextFollowupAt");
