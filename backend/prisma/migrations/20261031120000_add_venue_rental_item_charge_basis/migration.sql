-- CreateEnum
CREATE TYPE "RentalItemChargeBasis" AS ENUM ('PER_DAY', 'PER_EVENT');

-- AlterTable
ALTER TABLE "venue_rental_items" ADD COLUMN "charge_basis" "RentalItemChargeBasis" NOT NULL DEFAULT 'PER_DAY';
