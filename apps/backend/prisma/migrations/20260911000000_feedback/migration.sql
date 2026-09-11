-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('COMPLAINT', 'SUGGESTION', 'GENERAL');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'RESOLVED');

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roomNumber" TEXT,
    "guestPhone" TEXT,
    "guestName" TEXT,
    "category" "FeedbackCategory" NOT NULL DEFAULT 'GENERAL',
    "message" TEXT NOT NULL,
    "aiSummary" TEXT,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'PENDING',
    "adminReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_tenantId_status_idx" ON "Feedback"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Feedback_guestPhone_idx" ON "Feedback"("guestPhone");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

