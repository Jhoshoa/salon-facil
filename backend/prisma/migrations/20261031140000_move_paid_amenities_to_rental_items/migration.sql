-- Amenities with an extra cost become catalog items, the single way to charge for something apart.
-- A flat extra charged once maps exactly to: per event, with a quantity of 1. Bookings are not
-- touched: each one keeps the extras it was quoted in its own selected_extras snapshot.

-- One "Servicios" category per affected venue, reusing it if the owner already has one.
INSERT INTO "venue_rental_item_categories" ("id", "venue_id", "name", "sort_order")
SELECT
  gen_random_uuid()::text,
  affected."venue_id",
  'Servicios',
  COALESCE(
    (SELECT MAX(c."sort_order") + 1 FROM "venue_rental_item_categories" c WHERE c."venue_id" = affected."venue_id"),
    0
  )
FROM (SELECT DISTINCT "venue_id" FROM "venue_amenities" WHERE "is_included" = false) affected
WHERE NOT EXISTS (
  SELECT 1 FROM "venue_rental_item_categories" c
  WHERE c."venue_id" = affected."venue_id" AND LOWER(c."name") = 'servicios'
);

-- An extra with no price was never offered in the quote, only listed. It stays inactive, so the
-- owner keeps it and can set a price, without clients seeing something free that isn't.
INSERT INTO "venue_rental_items" (
  "id", "venue_id", "category_id", "name", "description", "price_per_unit", "is_included",
  "charge_basis", "unit_label", "stock_qty", "is_active", "sort_order"
)
SELECT
  gen_random_uuid()::text,
  va."venue_id",
  (
    SELECT c."id" FROM "venue_rental_item_categories" c
    WHERE c."venue_id" = va."venue_id" AND LOWER(c."name") = 'servicios'
    ORDER BY c."created_at"
    LIMIT 1
  ),
  a."name",
  va."notes",
  COALESCE(va."extra_cost", 0),
  false,
  'PER_EVENT',
  'servicio',
  1,
  COALESCE(va."extra_cost", 0) > 0,
  COALESCE(
    (SELECT MAX(i."sort_order") FROM "venue_rental_items" i WHERE i."venue_id" = va."venue_id"),
    0
  ) + ROW_NUMBER() OVER (PARTITION BY va."venue_id" ORDER BY a."sort_order")
FROM "venue_amenities" va
JOIN "amenities" a ON a."id" = va."amenity_id"
WHERE va."is_included" = false
  AND NOT EXISTS (
    SELECT 1 FROM "venue_rental_items" i
    WHERE i."venue_id" = va."venue_id" AND LOWER(i."name") = LOWER(a."name")
  );

DELETE FROM "venue_amenities" WHERE "is_included" = false;
