-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT '익명의 워커',
  points INTEGER NOT NULL DEFAULT 1000,
  last_random_point_spawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- pins
-- user_id 등은 public.profiles를 참조한다.
-- PostgREST 관계 임베딩(profiles(nickname))에 직접 FK가 필요하다.
CREATE TABLE IF NOT EXISTS public.pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'conquered', 'hidden')),
  expires_at TIMESTAMPTZ NOT NULL,
  conquered_by UUID REFERENCES public.profiles(id),
  conquered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- pin_attempts
CREATE TABLE IF NOT EXISTS public.pin_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_pin_id UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
  new_pin_id UUID REFERENCES public.pins(id),
  selected_probability INTEGER NOT NULL CHECK (selected_probability IN (10, 25, 50, 75)),
  cost INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- random_points
CREATE TABLE IF NOT EXISTS public.random_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  points INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'claimed', 'expired')),
  claimed_by UUID REFERENCES public.profiles(id),
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- point_transactions
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('signup_bonus', 'create_pin', 'conquer_attempt', 'random_point_claim', 'admin_adjust')),
  description TEXT,
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pins_status_expires ON public.pins(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_pins_lat_lng ON public.pins(lat, lng);
CREATE INDEX IF NOT EXISTS idx_random_points_user_status ON public.random_points(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pin_attempts_target ON public.pin_attempts(target_pin_id);

-- 신규 사용자 프로필 및 가입 보너스
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, points)
  VALUES (NEW.id, '익명의 워커', 1000);

  INSERT INTO public.point_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 1000, 'signup_bonus', '가입 보너스');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.random_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "pins_select_active"
  ON public.pins FOR SELECT
  USING (status = 'active' AND expires_at > NOW());

CREATE POLICY "pin_attempts_select"
  ON public.pin_attempts FOR SELECT
  USING (true);

CREATE POLICY "random_points_select_own"
  ON public.random_points FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "point_transactions_select_own"
  ON public.point_transactions FOR SELECT
  USING (user_id = auth.uid());
