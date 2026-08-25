-- Bookings gain an end_date (start date keeps living in event_date) so a single
-- reservation can span more than one day.
ALTER TABLE "bookings" ADD COLUMN "end_date" DATE;

-- Backfill: every existing booking is single-day, so end_date = event_date.
UPDATE "bookings" SET "end_date" = "event_date" WHERE "end_date" IS NULL;

ALTER TABLE "bookings" ALTER COLUMN "end_date" SET NOT NULL;

-- One row per occupied day. The (venue_id, date) unique constraint is what
-- actually prevents a double booking under concurrent requests: creating a
-- Booking + its BookingDate rows happens in one transaction, so a collision on
-- any single day rolls back the whole reservation instead of leaving a partial
-- one behind.
CREATE TABLE "booking_dates" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "applied_price" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_dates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "booking_dates_venue_id_date_key" ON "booking_dates"("venue_id", "date");
CREATE INDEX "booking_dates_booking_id_idx" ON "booking_dates"("booking_id");

ALTER TABLE "booking_dates" ADD CONSTRAINT "booking_dates_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_dates" ADD CONSTRAINT "booking_dates_venue_id_fkey"
    FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one BookingDate per existing booking, mirroring its single day.
INSERT INTO "booking_dates" ("id", "booking_id", "venue_id", "date", "start_time", "end_time", "applied_price", "created_at")
SELECT gen_random_uuid(), "id", "venue_id", "event_date", "start_time", "end_time", "applied_price", now()
FROM "bookings"
WHERE "id" NOT IN (SELECT "booking_id" FROM "booking_dates");
