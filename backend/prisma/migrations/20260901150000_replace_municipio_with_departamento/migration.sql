-- Municipio added no real narrowing power (almost every departamento maps to a single
-- practical municipio today), so drop the catalog table and store departamento directly on
-- venues instead — district (free text) remains the finer-grained location field.

ALTER TABLE "venues" ADD COLUMN "departamento" "Departamento";

UPDATE "venues" v
SET "departamento" = m."departamento"
FROM "municipios" m
WHERE m."id" = v."municipio_id";

ALTER TABLE "venues" ALTER COLUMN "departamento" SET NOT NULL;

ALTER TABLE "venues" DROP CONSTRAINT "venues_municipio_id_fkey";
DROP INDEX IF EXISTS "venues_municipio_id_idx";
ALTER TABLE "venues" DROP COLUMN "municipio_id";

CREATE INDEX "venues_departamento_idx" ON "venues"("departamento");

DROP TABLE "municipios";
