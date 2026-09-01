-- Tracks the Cloudinary publicId per venue photo so it can be deleted from Cloudinary
-- (not just the DB row) when an owner removes a photo.
ALTER TABLE "venue_media" ADD COLUMN "cloudinary_id" TEXT;
