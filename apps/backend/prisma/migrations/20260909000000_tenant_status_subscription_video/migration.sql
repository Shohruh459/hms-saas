-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "region" TEXT,
ADD COLUMN     "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "subscriptionEndsAt" TIMESTAMP(3),
ADD COLUMN     "videoApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "videoUrl" TEXT;

