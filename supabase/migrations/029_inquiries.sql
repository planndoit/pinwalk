-- 회원 문의
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'answered', 'closed')),
  admin_reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_user_created
  ON public.inquiries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inquiries_status_created
  ON public.inquiries (status, created_at DESC);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inquiries_select_own" ON public.inquiries;
CREATE POLICY "inquiries_select_own"
  ON public.inquiries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 회원 탈퇴 시 이력 FK가 막지 않도록 정리
ALTER TABLE public.crews
  ALTER COLUMN leader_id DROP NOT NULL;

ALTER TABLE public.crews
  DROP CONSTRAINT IF EXISTS crews_leader_id_fkey;
ALTER TABLE public.crews
  ADD CONSTRAINT crews_leader_id_fkey
  FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.pins
  DROP CONSTRAINT IF EXISTS pins_conquered_by_fkey;
ALTER TABLE public.pins
  ADD CONSTRAINT pins_conquered_by_fkey
  FOREIGN KEY (conquered_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.random_points
  DROP CONSTRAINT IF EXISTS random_points_claimed_by_fkey;
ALTER TABLE public.random_points
  ADD CONSTRAINT random_points_claimed_by_fkey
  FOREIGN KEY (claimed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
