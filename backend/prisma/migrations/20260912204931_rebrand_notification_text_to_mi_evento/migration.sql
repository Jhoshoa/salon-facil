-- Data-only migration: the app code that generates notification title/content ("Bienvenido a
-- SalonFacil", "Restablece tu contrasena en SalonFacil", "Verifica tu email en SalonFacil",
-- "Gracias por reservar con SalonFacil") was renamed to "Mi Evento", but that text was already
-- persisted into existing rows at creation time and never re-read from source, so old rows keep
-- showing "SalonFacil" until backfilled here.

UPDATE "notifications"
SET "title" = REPLACE("title", 'SalonFacil', 'Mi Evento')
WHERE "title" LIKE '%SalonFacil%';

UPDATE "notifications"
SET "content" = REPLACE("content", 'SalonFacil', 'Mi Evento')
WHERE "content" LIKE '%SalonFacil%';
