-- CreateEnum
CREATE TYPE "CalendarBlockStatus" AS ENUM ('TENTATIVE', 'CONFIRMED', 'BLOCKED');

-- AlterTable
ALTER TABLE "calendar_blocks" ADD COLUMN     "status" "CalendarBlockStatus" NOT NULL DEFAULT 'BLOCKED',
ADD COLUMN     "use_type_id" TEXT;

-- Backfill: existing rows were only ever told apart by whether `reason` happened to be filled
-- in (owner-calendar.tsx read a block with a reason as "booked", one without as "blocked") --
-- preserve that exact same read as an explicit status instead of an inference. Rows with no
-- reason already got the right value from the column default above, so there's nothing to do
-- for them.
UPDATE "calendar_blocks" SET "status" = 'CONFIRMED' WHERE "reason" IS NOT NULL;

-- CreateIndex
CREATE INDEX "calendar_blocks_use_type_id_idx" ON "calendar_blocks"("use_type_id");

-- AddForeignKey
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_use_type_id_fkey" FOREIGN KEY ("use_type_id") REFERENCES "use_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
