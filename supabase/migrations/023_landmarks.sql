-- 랜드마크 (TourAPI 큐레이션 + 수동 등록). premium_places 와 별도.
CREATE TABLE IF NOT EXISTS public.landmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'tourapi'
    CHECK (source IN ('tourapi', 'manual')),
  tour_content_id TEXT,
  tour_content_type_id TEXT,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  image_url TEXT,
  tel TEXT,
  overview TEXT,
  area_code TEXT,
  sigungu_code TEXT,
  source_modified_at TEXT,
  radius_meters INTEGER NOT NULL DEFAULT 200
    CHECK (radius_meters > 0),
  map_visible BOOLEAN NOT NULL DEFAULT FALSE,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS landmarks_tour_content_id_uidx
  ON public.landmarks (tour_content_id)
  WHERE tour_content_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_landmarks_map_visible
  ON public.landmarks (map_visible)
  WHERE map_visible = TRUE;

CREATE INDEX IF NOT EXISTS idx_landmarks_lat_lng
  ON public.landmarks (lat, lng);

CREATE INDEX IF NOT EXISTS idx_landmarks_name
  ON public.landmarks (name);

ALTER TABLE public.landmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "landmarks_select_map_visible" ON public.landmarks;
CREATE POLICY "landmarks_select_map_visible"
  ON public.landmarks FOR SELECT
  USING (map_visible = TRUE);
