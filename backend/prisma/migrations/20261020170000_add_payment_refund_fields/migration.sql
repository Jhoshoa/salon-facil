-- AlterTable
ALTER TABLE "payments" ADD COLUMN "refunded_at" TIMESTAMP(3),
ADD COLUMN "refund_reason" TEXT,
ADD COLUMN "refunded_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_refunded_by_id_fkey" FOREIGN KEY ("refunded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
