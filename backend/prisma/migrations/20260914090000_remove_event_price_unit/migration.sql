-- Data migration FIRST: convert every venue still priced as EVENT to DAY before the enum
-- value is removed below (Postgres refuses to drop an enum value while any row still uses it).
-- EVENT charged a flat fee regardless of how many days were booked -- a multi-day booking cost
-- the same as a single day, which is confusing and was a deliberate-but-now-reconsidered design
-- decision (see docs/booking/pricing-and-payments.md). DAY is the closest equivalent and is the
-- conversion that actually fixes the reported symptom: it already sums per day across a range.
UPDATE "venues" SET "price_unit" = 'DAY' WHERE "price_unit" = 'EVENT';
UPDATE "venue_prices" SET "unit" = 'DAY' WHERE "unit" = 'EVENT';

-- AlterEnum
-- Postgres has no ALTER TYPE ... DROP VALUE, so removing one means recreating the type under a
-- new name, repointing every column that used it, then swapping the names back.
BEGIN;
CREATE TYPE "PriceUnit_new" AS ENUM ('HOUR', 'DAY');
ALTER TABLE "venues" ALTER COLUMN "price_unit" DROP DEFAULT;
ALTER TABLE "venues" ALTER COLUMN "price_unit" TYPE "PriceUnit_new" USING ("price_unit"::text::"PriceUnit_new");
ALTER TABLE "venue_prices" ALTER COLUMN "unit" TYPE "PriceUnit_new" USING ("unit"::text::"PriceUnit_new");
ALTER TYPE "PriceUnit" RENAME TO "PriceUnit_old";
ALTER TYPE "PriceUnit_new" RENAME TO "PriceUnit";
DROP TYPE "PriceUnit_old";
ALTER TABLE "venues" ALTER COLUMN "price_unit" SET DEFAULT 'DAY';
COMMIT;
