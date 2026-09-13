-- Adds a real soft-delete marker to Venue, separate from the existing `status` enum. Deleting a
-- venue is meant to be final and irreversible; deactivating it (VenueStatus.INACTIVE) is meant
-- to be a reversible pause. Both were previously conflated into the same `status` field.
ALTER TABLE "venues" ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "venues_deleted_at_idx" ON "venues"("deleted_at");
