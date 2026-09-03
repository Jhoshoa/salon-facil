-- Facebook/Instagram/TikTok se sacan del perfil de usuario y pasan a ser datos propios de cada
-- local, independientes del perfil (un propietario con varios locales puede tener redes
-- distintas para cada uno, o un local manejado por otra persona). El perfil conserva solo el
-- whatsapp_phone. Confirmado antes de aplicar: ningun usuario tenia estos 3 campos llenos.
--
-- contact_phone es un dato nuevo y separado del whatsapp_phone del perfil, no una copia ni un
-- fallback — cada local completa el suyo si quiere mostrarlo.

ALTER TABLE "users" DROP COLUMN "facebook_url";
ALTER TABLE "users" DROP COLUMN "instagram_url";
ALTER TABLE "users" DROP COLUMN "tiktok_url";

ALTER TABLE "venues" ADD COLUMN "contact_phone" TEXT;
ALTER TABLE "venues" ADD COLUMN "facebook_url" TEXT;
ALTER TABLE "venues" ADD COLUMN "instagram_url" TEXT;
ALTER TABLE "venues" ADD COLUMN "tiktok_url" TEXT;
