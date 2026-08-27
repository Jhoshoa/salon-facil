-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "reminder_7_sent_at" TIMESTAMP(3),
ADD COLUMN "reminder_3_sent_at" TIMESTAMP(3),
ADD COLUMN "reminder_1_sent_at" TIMESTAMP(3);
