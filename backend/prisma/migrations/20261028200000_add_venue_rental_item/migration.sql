-- CreateTable
CREATE TABLE "venue_rental_items" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "photo_url" TEXT,
    "photo_public_id" TEXT,
    "price_per_unit" DECIMAL(12,2) NOT NULL,
    "unit_label" TEXT NOT NULL DEFAULT 'unidad',
    "stock_qty" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_rental_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venue_rental_items_venue_id_idx" ON "venue_rental_items"("venue_id");

-- CreateIndex
CREATE INDEX "venue_rental_items_venue_id_category_idx" ON "venue_rental_items"("venue_id", "category");

-- AddForeignKey
ALTER TABLE "venue_rental_items" ADD CONSTRAINT "venue_rental_items_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
