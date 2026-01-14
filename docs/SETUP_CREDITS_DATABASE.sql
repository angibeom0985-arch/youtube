-- =============================================
-- 크레딧 시스템 데이터베이스 설정 (통합)
-- =============================================

-- 1. profiles 테이블 생성 (없는 경우에만)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  credits INTEGER DEFAULT 100,
  last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  signup_ip TEXT,
  initial_credits_expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. initial_credits_expiry 컬럼 추가 (이미 테이블이 있는 경우)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS initial_credits_expiry TIMESTAMP WITH TIME ZONE;

-- 3. signup_ip 컬럼 추가 (없는 경우)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS signup_ip TEXT;

-- 4. 신규 사용자 프로필 자동 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits, last_reset_date, initial_credits_expiry)
  VALUES (
    NEW.id,
    NEW.email,
    100,  -- 초기 크레딧
    NOW(),
    NOW() + INTERVAL '3 days'  -- 3일 유효기간
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 트리거 생성 (기존 트리거 삭제 후 재생성)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. RLS (Row Level Security) 정책 설정
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 프로필만 조회 가능
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 사용자는 자신의 프로필만 업데이트 가능
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 7. 기존 사용자들에게 initial_credits_expiry 설정 (NULL인 경우)
UPDATE public.profiles
SET initial_credits_expiry = COALESCE(last_reset_date, NOW()) + INTERVAL '3 days'
WHERE initial_credits_expiry IS NULL;

-- 8. 확인 쿼리 (결과 확인용)
SELECT 
  email,
  credits,
  initial_credits_expiry,
  CASE 
    WHEN initial_credits_expiry > NOW() THEN '초기 기간 중'
    ELSE '일반 사용자'
  END as status,
  CASE 
    WHEN initial_credits_expiry > NOW() 
    THEN EXTRACT(DAY FROM (initial_credits_expiry - NOW()))::INTEGER
    ELSE 0
  END as days_remaining
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

-- ✅ 설정 완료!
-- 이제 신규 회원가입 시 자동으로:
-- - 100 크레딧 지급
-- - 3일 유효기간 설정
-- - profiles 테이블에 자동 등록
