-- Owner profile / contact reference fields
ALTER TABLE "users"
  ADD COLUMN "whatsapp_phone" TEXT,
  ADD COLUMN "facebook_url" TEXT,
  ADD COLUMN "instagram_url" TEXT,
  ADD COLUMN "tiktok_url" TEXT;

-- Space types: admin-managed catalog replacing the VenueSpaceType enum
CREATE TABLE "space_types" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "icon" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "space_types_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "space_types_key_key" ON "space_types"("key");
CREATE INDEX "space_types_is_active_idx" ON "space_types"("is_active");

-- Use types: admin-managed catalog replacing the VenueUseType enum
CREATE TABLE "use_types" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "icon" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "use_types_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "use_types_key_key" ON "use_types"("key");
CREATE INDEX "use_types_is_active_idx" ON "use_types"("is_active");

-- venues.space_type (enum) -> venues.space_type_id (FK, nullable)
ALTER TABLE "venues" DROP COLUMN "space_type";
ALTER TABLE "venues" ADD COLUMN "space_type_id" TEXT;
CREATE INDEX "venues_space_type_id_idx" ON "venues"("space_type_id");
ALTER TABLE "venues" ADD CONSTRAINT "venues_space_type_id_fkey"
  FOREIGN KEY ("space_type_id") REFERENCES "space_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- venue_uses.use_type (enum) -> venue_uses.use_type_id (FK, required)
DROP INDEX IF EXISTS "venue_uses_use_type_idx";
DROP INDEX IF EXISTS "venue_uses_venue_id_use_type_key";
ALTER TABLE "venue_uses" DROP COLUMN "use_type";
ALTER TABLE "venue_uses" ADD COLUMN "use_type_id" TEXT NOT NULL;
CREATE INDEX "venue_uses_use_type_id_idx" ON "venue_uses"("use_type_id");
CREATE UNIQUE INDEX "venue_uses_venue_id_use_type_id_key" ON "venue_uses"("venue_id", "use_type_id");
ALTER TABLE "venue_uses" ADD CONSTRAINT "venue_uses_use_type_id_fkey"
  FOREIGN KEY ("use_type_id") REFERENCES "use_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enums are no longer referenced by any column
DROP TYPE IF EXISTS "VenueSpaceType";
DROP TYPE IF EXISTS "VenueUseType";
