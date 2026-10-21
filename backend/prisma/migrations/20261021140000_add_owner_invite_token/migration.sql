-- CreateTable
CREATE TABLE "owner_invite_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owner_invite_tokens_token_hash_key" ON "owner_invite_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "owner_invite_tokens_user_id_idx" ON "owner_invite_tokens"("user_id");

-- CreateIndex
CREATE INDEX "owner_invite_tokens_expires_at_idx" ON "owner_invite_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "owner_invite_tokens" ADD CONSTRAINT "owner_invite_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
