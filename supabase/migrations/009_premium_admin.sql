-- profiles: 마지막 접속 시각
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- 관리자 설정 (비밀번호 변경 등)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 공통코드
CREATE TABLE IF NOT EXISTS public.common_code_groups (
  group_code TEXT PRIMARY KEY,
  group_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.common_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code TEXT NOT NULL REFERENCES public.common_code_groups(group_code) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_code, code)
);

-- 프리미엄 홍보 요청
CREATE TABLE IF NOT EXISTS public.premium_promotion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_code TEXT NOT NULL,
  store_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  benefit TEXT NOT NULL,
  promo_text TEXT NOT NULL,
  promo_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  admin_note TEXT,
  premium_place_id UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 프리미엄 장소
CREATE TABLE IF NOT EXISTS public.premium_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code TEXT NOT NULL,
  store_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  contact_name TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  benefit TEXT NOT NULL,
  promo_text TEXT NOT NULL,
  promo_link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  promotion_request_id UUID REFERENCES public.premium_promotion_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.premium_promotion_requests
  DROP CONSTRAINT IF EXISTS premium_promotion_requests_premium_place_id_fkey;

ALTER TABLE public.premium_promotion_requests
  ADD CONSTRAINT premium_promotion_requests_premium_place_id_fkey
  FOREIGN KEY (premium_place_id) REFERENCES public.premium_places(id) ON DELETE SET NULL;

-- 프리미엄 쿠폰
CREATE TABLE IF NOT EXISTS public.premium_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  premium_place_id UUID NOT NULL REFERENCES public.premium_places(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  benefit TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 사용자 쿠폰함
CREATE TABLE IF NOT EXISTS public.user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES public.premium_coupons(id) ON DELETE CASCADE,
  premium_place_id UUID NOT NULL REFERENCES public.premium_places(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'used')),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  UNIQUE (user_id, coupon_id)
);

-- 지도 위 쿠폰 스폰 (프리미엄 영역 진입 시)
CREATE TABLE IF NOT EXISTS public.premium_coupon_spawns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES public.premium_coupons(id) ON DELETE CASCADE,
  premium_place_id UUID NOT NULL REFERENCES public.premium_places(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'claimed', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_premium_places_active ON public.premium_places(is_active);
CREATE INDEX IF NOT EXISTS idx_premium_places_lat_lng ON public.premium_places(lat, lng);
CREATE INDEX IF NOT EXISTS idx_premium_promotion_requests_status ON public.premium_promotion_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_premium_coupons_place ON public.premium_coupons(premium_place_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user ON public.user_coupons(user_id, status);
CREATE INDEX IF NOT EXISTS idx_premium_coupon_spawns_user ON public.premium_coupon_spawns(user_id, status);
CREATE INDEX IF NOT EXISTS idx_common_codes_group ON public.common_codes(group_code, sort_order);

-- 공통코드 시드
INSERT INTO public.common_code_groups (group_code, group_name, description)
VALUES ('PREMIUM_CATEGORY', '프리미엄 장소 카테고리', '프리미엄 깃발/장소 분류')
ON CONFLICT (group_code) DO NOTHING;

INSERT INTO public.common_codes (group_code, code, name, sort_order)
VALUES
  ('PREMIUM_CATEGORY', 'RESTAURANT', '식당', 1),
  ('PREMIUM_CATEGORY', 'CAFE', '카페', 2),
  ('PREMIUM_CATEGORY', 'BAR', '주점', 3),
  ('PREMIUM_CATEGORY', 'RETAIL', '소매/매장', 4),
  ('PREMIUM_CATEGORY', 'SERVICE', '서비스', 5),
  ('PREMIUM_CATEGORY', 'OTHER', '기타', 99)
ON CONFLICT (group_code, code) DO NOTHING;

-- RLS: 읽기 전용 공개 데이터
ALTER TABLE public.common_code_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.common_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_promotion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_coupon_spawns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "common_code_groups_select" ON public.common_code_groups;
CREATE POLICY "common_code_groups_select"
  ON public.common_code_groups FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "common_codes_select" ON public.common_codes;
CREATE POLICY "common_codes_select"
  ON public.common_codes FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "premium_places_select_active" ON public.premium_places;
CREATE POLICY "premium_places_select_active"
  ON public.premium_places FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "premium_coupons_select_active" ON public.premium_coupons;
CREATE POLICY "premium_coupons_select_active"
  ON public.premium_coupons FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "user_coupons_select_own" ON public.user_coupons;
CREATE POLICY "user_coupons_select_own"
  ON public.user_coupons FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "premium_coupon_spawns_select_own" ON public.premium_coupon_spawns;
CREATE POLICY "premium_coupon_spawns_select_own"
  ON public.premium_coupon_spawns FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "premium_promotion_requests_select_own" ON public.premium_promotion_requests;
CREATE POLICY "premium_promotion_requests_select_own"
  ON public.premium_promotion_requests FOR SELECT
  USING (requester_user_id = auth.uid());
