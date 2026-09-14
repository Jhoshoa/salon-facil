-- CreateEnum
CREATE TYPE "PaymentPolicy" AS ENUM ('FULL_UPFRONT', 'DEPOSIT_THEN_REMAINING');

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "deposit_percentage" DECIMAL(5,2) NOT NULL DEFAULT 30,
ADD COLUMN     "payment_policy" "PaymentPolicy" NOT NULL DEFAULT 'DEPOSIT_THEN_REMAINING';
