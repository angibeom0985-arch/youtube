# 크레딧 시스템 설정 가이드

## 📋 개요

신규 회원가입 시 **100 크레딧**을 지급하고, **3일간 사용 가능**한 시스템입니다.
3일 이후에는 매일 **30 크레딧**이 자동으로 충전됩니다.

## 🗄️ 데이터베이스 설정

### 1. Supabase SQL Editor에서 실행

`docs/SETUP_CREDITS_DATABASE.sql` 파일의 내용을 복사하여 Supabase SQL Editor에서 실행하세요.

**주요 설정 내용:**
- ✅ `initial_credits_expiry` 컬럼 추가
- ✅ 신규 사용자 자동 프로필 생성 트리거
- ✅ 초기 100 크레딧 + 3일 유효기간 설정
- ✅ RLS (Row Level Security) 정책

### 2. profiles 테이블 구조

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  credits INTEGER DEFAULT 100,
  last_reset_date TIMESTAMP WITH TIME ZONE,
  initial_credits_expiry TIMESTAMP WITH TIME ZONE,  -- 새로 추가
  signup_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 💎 크레딧 정책

### 초기 크레딧 (신규 가입)
- **지급량**: 100 크레딧
- **유효기간**: 3일
- **특징**: 3일 동안은 크레딧이 자동 충전되지 않음

### 일반 크레딧 (3일 이후)
- **일일 충전**: 매일 20 크레딧
- **충전 조건**: 보유 크레딧이 20개 미만일 때만
- **유효기간**: 없음 (계속 누적)

## 📊 크레딧 사용량

| 기능 | 크레딧 | 비고 |
|------|--------|------|
| 영상 분석 | 1 💎 | 가벼운 분석 |
| 아이디어 생성 | 1 💎 | 가벼운 생성 |
| 기획안 작성 | 10 💎 | 상세한 기획안 |
| 챕터 목차 | 5 💎 | 목차 구성 |
| 챕터 대본 | 5 💎 | 챕터별 대본 |
| 벤치마킹 검색 | 5 💎 | 유튜브 검색 |
| 이미지 생성 | 5 💎 | 1장당 |
| TTS | 0.1 💎 | 글자당 (10자 = 1크레딧) |

## 🔧 시스템 작동 방식

### 회원가입 시
1. Supabase Auth에서 사용자 생성
2. 트리거가 자동으로 profiles 테이블에 레코드 생성
3. 초기 크레딧 100개 지급
4. `initial_credits_expiry` = 현재시간 + 3일 설정

### 크레딧 차감 시
1. API 요청 시 `checkAndDeductCredits()` 호출
2. 세션 토큰으로 사용자 인증
3. 현재 크레딧 조회
4. 초기 기간 확인 (3일 이내인지)
5. 크레딧 충분하면 차감, 부족하면 거부

### 일일 리셋 (매일 자정)
1. 날짜 변경 감지
2. `initial_credits_expiry` 확인
   - 3일 이내: 리셋 안 함
   - 3일 이후: 20개 미만이면 20개로 충전

## 🎨 UI 표시

### 초기 기간 중 (3일 이내)
```
🎉 초기 크레딧 기간!
회원가입 축하합니다! 100 크레딧을 사용하실 수 있습니다.

남은 기간: X일

기간 만료 후 매일 20 크레딧이 자동 충전됩니다.
```

### 일반 사용자 (3일 이후)
```
🎁 매일 20 크레딧 무료 충전!
```

## 🔍 확인 방법

### 1. 데이터베이스 확인
```sql
SELECT 
  email,
  credits,
  initial_credits_expiry,
  CASE 
    WHEN initial_credits_expiry > NOW() THEN '초기 기간'
    ELSE '일반 사용자'
  END as status
FROM profiles;
```

### 2. API 테스트
브라우저 개발자 도구(F12) → Console에서 확인:
```
크레딧 조회 시작...
API 응답 상태: 200
크레딧 데이터: {credits: 100, isInInitialPeriod: true, daysRemaining: 2}
```

## ⚠️ 주의사항

1. **IP 중복 체크**: 같은 IP에서 여러 계정 생성 시 첫 번째 계정만 100 크레딧 지급
2. **트리거 실행**: Supabase에서 트리거가 제대로 설정되었는지 확인 필수
3. **RLS 정책**: 사용자는 자신의 프로필만 조회 가능
4. **시간대**: 서버 시간 기준으로 3일 계산

## 🐛 문제 해결

### 크레딧이 0으로 표시되는 경우
1. Supabase에서 SQL 스크립트 실행 여부 확인
2. 트리거가 활성화되어 있는지 확인
3. 기존 사용자는 수동으로 크레딧 업데이트 필요

### 초기 기간이 표시되지 않는 경우
1. `initial_credits_expiry` 필드가 NULL인지 확인
2. 기존 사용자는 아래 쿼리로 업데이트:
```sql
UPDATE profiles
SET initial_credits_expiry = NOW() + INTERVAL '3 days'
WHERE initial_credits_expiry IS NULL;
```

## 📞 지원

문제가 지속되면 다음을 확인하세요:
1. Supabase 로그
2. 브라우저 Console 로그
3. Vercel 배포 로그
