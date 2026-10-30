-- AlterTable
ALTER TABLE "venue_rental_items" ADD COLUMN     "is_included" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "price_per_unit" DROP NOT NULL;
