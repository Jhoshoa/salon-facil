-- CreateTable
CREATE TABLE "venue_rental_item_categories" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_rental_item_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venue_rental_item_categories_venue_id_idx" ON "venue_rental_item_categories"("venue_id");

-- CreateIndex
CREATE UNIQUE INDEX "venue_rental_item_categories_venue_id_name_key" ON "venue_rental_item_categories"("venue_id", "name");

-- AddForeignKey
ALTER TABLE "venue_rental_item_categories" ADD CONSTRAINT "venue_rental_item_categories_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Fase 1 never reached main/production -- any row here is leftover test/dev fixture data, not
-- real user data, so this clears the table instead of writing a backfill for the new required
-- FK column.
DELETE FROM "venue_rental_items";

-- DropIndex
DROP INDEX "venue_rental_items_venue_id_category_idx";

-- AlterTable
ALTER TABLE "venue_rental_items" DROP COLUMN "category",
ADD COLUMN "category_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "venue_rental_items_venue_id_category_id_idx" ON "venue_rental_items"("venue_id", "category_id");

-- AddForeignKey
ALTER TABLE "venue_rental_items" ADD CONSTRAINT "venue_rental_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "venue_rental_item_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
