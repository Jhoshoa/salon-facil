-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_RESPONSE';

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN "owner_response" TEXT,
ADD COLUMN "owner_response_at" TIMESTAMP(3);
