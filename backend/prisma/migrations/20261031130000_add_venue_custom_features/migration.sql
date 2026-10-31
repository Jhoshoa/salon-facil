-- CreateTable
CREATE TABLE "venue_custom_features" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AmenityCategory" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_custom_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "venue_custom_features_venue_id_name_key" ON "venue_custom_features"("venue_id", "name");

-- CreateIndex
CREATE INDEX "venue_custom_features_venue_id_idx" ON "venue_custom_features"("venue_id");

-- AddForeignKey
ALTER TABLE "venue_custom_features" ADD CONSTRAINT "venue_custom_features_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
