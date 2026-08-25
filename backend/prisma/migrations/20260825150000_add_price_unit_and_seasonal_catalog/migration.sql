-- AlterTable
ALTER TABLE "venue_prices" ADD COLUMN "unit" "PriceUnit";

-- CreateTable
CREATE TABLE "suggested_seasonal_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggested_seasonal_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suggested_seasonal_events_is_active_idx" ON "suggested_seasonal_events"("is_active");
