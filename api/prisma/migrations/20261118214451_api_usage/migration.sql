-- CreateTable
CREATE TABLE "ApiUsage" (
    "provider" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("provider","period")
);
