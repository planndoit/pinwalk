-- 회원가입 시 위치기반서비스·개인위치정보 동의 기록
CREATE TABLE IF NOT EXISTS public.location_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  legal_version TEXT NOT NULL,
  agree_location_terms BOOLEAN NOT NULL,
  agree_location_collection BOOLEAN NOT NULL,
  confirm_over_14 BOOLEAN NOT NULL,
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_consents_user_agreed
  ON public.location_consents (user_id, agreed_at DESC);

ALTER TABLE public.location_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "location_consents_select_own"
  ON public.location_consents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
