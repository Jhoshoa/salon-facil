-- CreateTable
CREATE TABLE "venue_preview_tokens" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_preview_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "venue_preview_tokens_token_hash_key" ON "venue_preview_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "venue_preview_tokens_venue_id_idx" ON "venue_preview_tokens"("venue_id");

-- CreateIndex
CREATE INDEX "venue_preview_tokens_expires_at_idx" ON "venue_preview_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "venue_preview_tokens" ADD CONSTRAINT "venue_preview_tokens_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
