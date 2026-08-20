-- CreateEnum
CREATE TYPE "VenueSpaceType" AS ENUM ('EVENT_HALL', 'GARDEN', 'TERRACE', 'RESTAURANT', 'BAR', 'AUDITORIUM', 'CONFERENCE_ROOM', 'PHOTO_STUDIO', 'MULTIPURPOSE', 'OUTDOOR_SPACE');

-- CreateEnum
CREATE TYPE "VenueUseType" AS ENUM ('WEDDING', 'BIRTHDAY', 'CORPORATE_EVENT', 'PRIVATE_PARTY', 'GRADUATION', 'CONFERENCE', 'WORKSHOP', 'PHOTO_SHOOT', 'FILMING', 'POP_UP', 'TEAM_BUILDING');

-- CreateEnum
CREATE TYPE "AmenityCategory" AS ENUM ('FACILITY', 'COMFORT', 'AUDIO_VISUAL', 'CATERING_DRINKS', 'PARKING', 'ACCESSIBILITY', 'SAFETY', 'SERVICES');

-- CreateEnum
CREATE TYPE "VenueMediaType" AS ENUM ('IMAGE', 'VIDEO', 'VIRTUAL_TOUR');

-- CreateEnum
CREATE TYPE "PriceUnit" AS ENUM ('EVENT', 'HOUR', 'DAY');

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "allows_multiple_days" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "instant_booking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minimum_hours" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "price_unit" "PriceUnit" NOT NULL DEFAULT 'EVENT',
ADD COLUMN     "space_type" "VenueSpaceType";

-- CreateTable
CREATE TABLE "amenities" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AmenityCategory" NOT NULL,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_amenities" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "amenity_id" TEXT NOT NULL,
    "is_included" BOOLEAN NOT NULL DEFAULT true,
    "extra_cost" DECIMAL(12,2),
    "notes" TEXT,

    CONSTRAINT "venue_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_uses" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "use_type" "VenueUseType" NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "venue_uses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_opening_hours" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "opens_at" TIME NOT NULL,
    "closes_at" TIME NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "venue_opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_media" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "type" "VenueMediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "amenities_key_key" ON "amenities"("key");

-- CreateIndex
CREATE INDEX "amenities_category_idx" ON "amenities"("category");

-- CreateIndex
CREATE INDEX "amenities_is_active_idx" ON "amenities"("is_active");

-- CreateIndex
CREATE INDEX "venue_amenities_venue_id_idx" ON "venue_amenities"("venue_id");

-- CreateIndex
CREATE INDEX "venue_amenities_amenity_id_idx" ON "venue_amenities"("amenity_id");

-- CreateIndex
CREATE UNIQUE INDEX "venue_amenities_venue_id_amenity_id_key" ON "venue_amenities"("venue_id", "amenity_id");

-- CreateIndex
CREATE INDEX "venue_uses_venue_id_idx" ON "venue_uses"("venue_id");

-- CreateIndex
CREATE INDEX "venue_uses_use_type_idx" ON "venue_uses"("use_type");

-- CreateIndex
CREATE UNIQUE INDEX "venue_uses_venue_id_use_type_key" ON "venue_uses"("venue_id", "use_type");

-- CreateIndex
CREATE INDEX "venue_opening_hours_venue_id_idx" ON "venue_opening_hours"("venue_id");

-- CreateIndex
CREATE UNIQUE INDEX "venue_opening_hours_venue_id_day_of_week_key" ON "venue_opening_hours"("venue_id", "day_of_week");

-- CreateIndex
CREATE INDEX "venue_media_venue_id_idx" ON "venue_media"("venue_id");

-- CreateIndex
CREATE INDEX "venue_media_type_idx" ON "venue_media"("type");

-- CreateIndex
CREATE INDEX "venue_media_venue_id_sort_order_idx" ON "venue_media"("venue_id", "sort_order");

-- CreateIndex
CREATE INDEX "venues_space_type_idx" ON "venues"("space_type");

-- CreateIndex
CREATE INDEX "venues_capacity_max_idx" ON "venues"("capacity_max");

-- AddForeignKey
ALTER TABLE "venue_amenities" ADD CONSTRAINT "venue_amenities_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_amenities" ADD CONSTRAINT "venue_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_uses" ADD CONSTRAINT "venue_uses_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_opening_hours" ADD CONSTRAINT "venue_opening_hours_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_media" ADD CONSTRAINT "venue_media_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
