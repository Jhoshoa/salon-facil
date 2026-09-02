-- Departamento: Bolivia's 9 departamentos, a closed/constitutionally-fixed set
CREATE TYPE "Departamento" AS ENUM (
  'LA_PAZ', 'SANTA_CRUZ', 'COCHABAMBA', 'ORURO', 'POTOSI', 'CHUQUISACA', 'TARIJA', 'BENI', 'PANDO'
);

-- Municipios: admin-managed catalog replacing the free-text venues.city
CREATE TABLE "municipios" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "departamento" "Departamento" NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "municipios_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "municipios_key_key" ON "municipios"("key");
CREATE INDEX "municipios_departamento_idx" ON "municipios"("departamento");
CREATE INDEX "municipios_is_active_idx" ON "municipios"("is_active");

-- Seed the departmental capitals (+ El Alto, distinct from La Paz city) as a starting catalog.
-- Admins can add more municipios later via the catalog manager UI.
INSERT INTO "municipios" ("id", "key", "name", "departamento", "sort_order") VALUES
  (gen_random_uuid()::text, 'LA_PAZ', 'La Paz', 'LA_PAZ', 0),
  (gen_random_uuid()::text, 'EL_ALTO', 'El Alto', 'LA_PAZ', 1),
  (gen_random_uuid()::text, 'SANTA_CRUZ_DE_LA_SIERRA', 'Santa Cruz de la Sierra', 'SANTA_CRUZ', 2),
  (gen_random_uuid()::text, 'COCHABAMBA', 'Cochabamba', 'COCHABAMBA', 3),
  (gen_random_uuid()::text, 'ORURO', 'Oruro', 'ORURO', 4),
  (gen_random_uuid()::text, 'POTOSI', 'Potosi', 'POTOSI', 5),
  (gen_random_uuid()::text, 'SUCRE', 'Sucre', 'CHUQUISACA', 6),
  (gen_random_uuid()::text, 'TARIJA', 'Tarija', 'TARIJA', 7),
  (gen_random_uuid()::text, 'TRINIDAD', 'Trinidad', 'BENI', 8),
  (gen_random_uuid()::text, 'COBIJA', 'Cobija', 'PANDO', 9);

-- venues.city/state (free text) -> venues.municipio_id (FK, required)
ALTER TABLE "venues" ADD COLUMN "municipio_id" TEXT;

UPDATE "venues" SET "municipio_id" = (SELECT "id" FROM "municipios" WHERE "key" = 'LA_PAZ') WHERE "city" = 'La Paz';
UPDATE "venues" SET "municipio_id" = (SELECT "id" FROM "municipios" WHERE "key" = 'EL_ALTO') WHERE "city" = 'El Alto';
-- Safety net for any other pre-existing city value: fall back to El Alto (the platform's
-- original home city) rather than leaving a required FK null.
UPDATE "venues" SET "municipio_id" = (SELECT "id" FROM "municipios" WHERE "key" = 'EL_ALTO') WHERE "municipio_id" IS NULL;

ALTER TABLE "venues" ALTER COLUMN "municipio_id" SET NOT NULL;
DROP INDEX IF EXISTS "venues_city_idx";
ALTER TABLE "venues" DROP COLUMN "city";
ALTER TABLE "venues" DROP COLUMN "state";

CREATE INDEX "venues_municipio_id_idx" ON "venues"("municipio_id");
ALTER TABLE "venues" ADD CONSTRAINT "venues_municipio_id_fkey"
  FOREIGN KEY ("municipio_id") REFERENCES "municipios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
