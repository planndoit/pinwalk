-- 운영 공지 (팝업·공지사항). 읽기·쓰기는 서버 API(service role)만 한다.
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  popup_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_published
  ON public.announcements (published_at DESC)
  WHERE is_published = TRUE;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
