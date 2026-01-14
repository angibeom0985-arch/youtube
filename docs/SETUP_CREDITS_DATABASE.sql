-- =============================================
-- 크레딧 시스템 데이터베이스 설정
-- =============================================

-- 1. profiles 테이블에 initial_credits_expiry 컬럼 추가 (없는 경우)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS initial_credits_expiry TIMESTAMP WITH TIME ZONE;

-- 2. 신규 사용자 프로필 자동 생성 함수
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

-- 3. 트리거 생성 (없으면 생성)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. RLS (Row Level Security) 정책 설정
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

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

-- 5. 기존 사용자들에게 initial_credits_expiry 설정 (NULL인 경우)
UPDATE profiles
SET initial_credits_expiry = last_reset_date + INTERVAL '3 days'
WHERE initial_credits_expiry IS NULL;

-- 6. 확인 쿼리
SELECT 
  id,
  email,
  credits,
  initial_credits_expiry,
  CASE 
    WHEN initial_credits_expiry > NOW() THEN '초기 기간 중'
    ELSE '일반 사용자'
  END as status,
  EXTRACT(DAY FROM (initial_credits_expiry - NOW())) as days_remaining
FROM profiles
LIMIT 5;
