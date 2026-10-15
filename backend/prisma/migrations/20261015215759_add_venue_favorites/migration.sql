-- CreateTable
CREATE TABLE "venue_favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venue_favorites_venue_id_idx" ON "venue_favorites"("venue_id");

-- CreateIndex
CREATE UNIQUE INDEX "venue_favorites_user_id_venue_id_key" ON "venue_favorites"("user_id", "venue_id");

-- AddForeignKey
ALTER TABLE "venue_favorites" ADD CONSTRAINT "venue_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_favorites" ADD CONSTRAINT "venue_favorites_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
