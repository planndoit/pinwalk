-- Phase C: crews
CREATE TABLE IF NOT EXISTS public.crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  area_code TEXT NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 20
    CHECK (max_members >= 2 AND max_members <= 20),
  leader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  invite_token TEXT NOT NULL UNIQUE,
  image_data BYTEA,
  image_mime TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'dissolved')),
  dissolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crews_name_active_unique
  ON public.crews (lower(name))
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_crews_status_area
  ON public.crews (status, area_code);

CREATE INDEX IF NOT EXISTS idx_crews_leader
  ON public.crews (leader_id);

CREATE TABLE IF NOT EXISTS public.crew_members (
  crew_id UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (crew_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS crew_members_user_unique
  ON public.crew_members (user_id);

CREATE INDEX IF NOT EXISTS idx_crew_members_crew
  ON public.crew_members (crew_id);

CREATE TABLE IF NOT EXISTS public.crew_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS crew_join_requests_user_pending_unique
  ON public.crew_join_requests (user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_crew_join_requests_crew_pending
  ON public.crew_join_requests (crew_id)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.landmark_crew_scores (
  landmark_id UUID NOT NULL REFERENCES public.landmarks(id) ON DELETE CASCADE,
  crew_id UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  score_reached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (landmark_id, crew_id)
);

CREATE INDEX IF NOT EXISTS idx_landmark_crew_scores_rank
  ON public.landmark_crew_scores (landmark_id, score DESC, score_reached_at ASC);

ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landmark_crew_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crews_select_active" ON public.crews;
CREATE POLICY "crews_select_active"
  ON public.crews FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "crew_members_select" ON public.crew_members;
CREATE POLICY "crew_members_select"
  ON public.crew_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crews c
      WHERE c.id = crew_id AND c.status = 'active'
    )
  );

DROP POLICY IF EXISTS "crew_join_requests_select_own" ON public.crew_join_requests;
CREATE POLICY "crew_join_requests_select_own"
  ON public.crew_join_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "landmark_crew_scores_select" ON public.landmark_crew_scores;
CREATE POLICY "landmark_crew_scores_select"
  ON public.landmark_crew_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.landmarks l
      WHERE l.id = landmark_id AND l.map_visible = TRUE
    )
  );
