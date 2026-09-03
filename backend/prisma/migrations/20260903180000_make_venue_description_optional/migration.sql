-- Descripcion corta, descripcion completa, reglas y politica de cancelacion pasan a ser
-- opcionales en todo el flujo de creacion/publicacion de un local (venue.service.ts ya no las
-- exige para llegar al 100% de completitud). Solo description tenia una restriccion NOT NULL a
-- nivel de base de datos — las otras tres ya eran nullable.

ALTER TABLE "venues" ALTER COLUMN "description" DROP NOT NULL;
