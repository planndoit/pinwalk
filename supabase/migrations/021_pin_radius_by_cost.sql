-- Sync pin radius_meters from invested cost.
-- Defaults match DEFAULT_PIN_RADIUS_BY_COST / PIN_RADIUS_METERS_* env fallbacks.

UPDATE public.pins
SET radius_meters = CASE cost
  WHEN 100 THEN 100
  WHEN 300 THEN 150
  WHEN 500 THEN 200
  WHEN 1000 THEN 300
  ELSE radius_meters
END
WHERE cost IN (100, 300, 500, 1000);
