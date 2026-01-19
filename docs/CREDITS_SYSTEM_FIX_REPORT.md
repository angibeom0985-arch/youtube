# 크레딧 시스템 수정 완료 보고서

## 수정 일시
2026년 1월 19일

## 발견된 문제점

### 1. 회원가입 시 크레딧 부여 불일치
- **문제**: DB 트리거는 초기 크레딧을 100으로 설정하지만, `creditService.ts`는 12만 부여
- **영향**: 신규 회원이 크레딧을 제대로 받지 못할 수 있음

### 2. 크레딧 차감 시점 문제
- **문제**: 이미지 생성 후 크레딧 차감 → 실패 시에도 크레딧 차감됨
- **영향**: 사용자가 결과물 없이 크레딧만 소모

### 3. 초기 기간 설정 오류
- **문제**: `INITIAL_PERIOD_DAYS = 0` → 초기 크레딧 유효기간이 작동하지 않음
- **영향**: 3일 무료 기간이 제공되지 않음

---

## 수정 내용

### 1. 초기 크레딧 통일 (12 크레딧)
**수정된 파일:**
- `api/_lib/creditService.ts`
- `docs/SETUP_CREDITS_DATABASE.sql`

**변경 사항:**
```typescript
// 이전
const INITIAL_CREDITS = 12;
const INITIAL_PERIOD_DAYS = 0;  // ❌ 비활성화 상태

// 이후
const INITIAL_CREDITS = 12;
const INITIAL_PERIOD_DAYS = 3;  // ✅ 3일 기간 활성화
```

```sql
-- 이전
credits INTEGER DEFAULT 100,

-- 이후
credits INTEGER DEFAULT 12,
```

### 2. 크레딧 선차감 + 실패 시 환불 시스템 구현

**새로 생성된 파일:**
- `api/YOUTUBE/user/credits-refund.ts` (환불 API 엔드포인트)

**수정된 파일:**
- `youtube_image/ui/App.tsx` (모든 이미지 생성 함수)

**변경된 로직:**
```typescript
// 이전: 이미지 생성 후 크레딧 차감
생성 → 성공 시 차감 (실패 시에도 차감될 위험)

// 이후: 크레딧 선차감 + 실패 시 환불
선차감 → 생성 → 실패 시 전액 환불 → 성공 시 실제 사용량만 차감
```

**적용된 함수:**
1. ✅ `handleGeneratePersonas` - 페르소나 생성
2. ✅ `handleRegenerateCharacter` - 페르소나 재생성
3. ✅ `handleGenerateVideoSource` - 영상 소스 생성
4. ✅ `handleRegenerateVideoSourceImage` - 영상 소스 재생성
5. ✅ `handleGenerateCameraAngles` - 카메라 앵글 생성

### 3. 환불 시스템 상세 내역

**예시 1: 페르소나 생성**
```typescript
// 예상: 최대 5개 × 5 크레딧 = 25 크레딧 선차감
// 실제 생성: 3개만 성공
// → 3개 × 5 = 15 크레딧만 차감
// → 10 크레딧 자동 환불
```

**예시 2: 카메라 앵글 생성**
```typescript
// 선택: 6개 앵글 × 5 크레딧 = 30 크레딧 선차감
// 실제 성공: 4개만 성공
// → 4개 × 5 = 20 크레딧만 차감
// → 10 크레딧 자동 환불
```

**예시 3: 전체 실패 시**
```typescript
// 선차감: 25 크레딧
// 생성 실패 (0개 생성)
// → 25 크레딧 전액 환불
// → 사용자 메시지: "크레딧이 환불되었습니다"
```

---

## 테스트 시나리오

### 시나리오 1: 신규 회원가입
**예상 결과:**
1. 회원가입 완료
2. DB에 프로필 자동 생성
3. 초기 크레딧 12 지급
4. 3일 유효기간 설정 (`initial_credits_expiry`)
5. 사용자 화면에 "12 크레딧" 표시

**확인 방법:**
```sql
SELECT email, credits, initial_credits_expiry, 
       EXTRACT(DAY FROM (initial_credits_expiry - NOW()))::INTEGER as days_remaining
FROM profiles 
WHERE email = '테스트사용자이메일'
ORDER BY created_at DESC;
```

### 시나리오 2: 페르소나 생성 (정상)
**테스트:**
1. 대본 입력: "20대 여성, 긴 흑발"
2. 페르소나 생성 클릭

**예상 결과:**
- 선차감: 25 크레딧 (최대 5개 예상)
- 실제 생성: 1개 성공
- 최종 차감: 5 크레딧
- 환불: 20 크레딧
- 사용자 메시지: "✅ 페르소나 1개 생성 완료 (5 ⚡ 사용)"

### 시나리오 3: 페르소나 생성 (실패)
**테스트:**
1. 부적절한 입력 또는 API 오류 유발

**예상 결과:**
- 선차감: 25 크레딧
- 생성 실패
- 전액 환불: 25 크레딧
- 사용자 메시지: "❌ 생성 실패 (크레딧이 환불되었습니다)"

### 시나리오 4: 크레딧 부족
**테스트:**
1. 현재 크레딧: 3
2. 영상 소스 생성 시도 (5개 = 25 크레딧 필요)

**예상 결과:**
- 차감 시도 전 차단
- 사용자 메시지: "❌ 크레딧이 부족합니다. (필요: 25, 보유: 3)"
- 크레딧 변동 없음

### 시나리오 5: 일일 크레딧 리셋 (3일 이후)
**테스트:**
1. 회원가입 3일 후
2. 크레딧 5 남음
3. 다음 날 0시 이후 첫 API 호출

**예상 결과:**
- 자동 리셋: 크레딧 12로 충전
- 사용자 메시지: 정상 동작
- DB `last_reset_date` 업데이트

---

## 데이터베이스 업데이트 필요

### 1. Supabase SQL Editor에서 실행
`docs/SETUP_CREDITS_DATABASE.sql` 파일의 내용을 Supabase SQL Editor에서 실행하세요.

**중요 쿼리:**
```sql
-- 기존 사용자들의 초기 크레딧 유효기간 설정
UPDATE public.profiles
SET initial_credits_expiry = COALESCE(last_reset_date, NOW()) + INTERVAL '3 days'
WHERE initial_credits_expiry IS NULL;

-- 트리거 재생성 (초기 크레딧 12로 변경)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. 확인 쿼리
```sql
-- 최근 가입한 사용자들의 크레딧 상태 확인
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
  END as days_remaining,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;
```

---

## 주의사항

### 1. 기존 사용자 영향
- 기존 사용자들은 영향 없음 (크레딧 유지)
- `initial_credits_expiry`가 NULL인 경우 UPDATE 쿼리로 설정 필요

### 2. 환불 시스템
- 환불은 자동으로 처리됨
- 사용자에게 명확한 메시지 표시: "(크레딧이 환불되었습니다)"
- `creditRefresh` 이벤트 발생으로 UI 자동 업데이트

### 3. IP 중복 검사
- 같은 IP에서 여러 계정 생성 시도 시 차단
- 초기 크레딧은 IP당 1회만 지급
- 메시지: "이미 해당 IP에서 계정을 생성했습니다"

---

## 향후 개선 사항

### 1. 크레딧 구매 시스템
- 현재: 무료 크레딧만 제공
- 향후: 결제 시스템 연동 (Stripe, Toss 등)

### 2. 크레딧 사용 내역
- 현재: 실시간 차감만 표시
- 향후: 사용 내역 로그 테이블 추가

### 3. 크레딧 선물 기능
- 현재: 없음
- 향후: 사용자 간 크레딧 선물 기능

---

## 배포 체크리스트

- [x] `creditService.ts` 수정 (초기 크레딧 12, 기간 3일)
- [x] `credits-refund.ts` API 생성
- [x] `App.tsx` 모든 생성 함수 수정
- [x] `SETUP_CREDITS_DATABASE.sql` 업데이트
- [ ] Supabase SQL 실행
- [ ] 신규 회원가입 테스트
- [ ] 각 기능별 크레딧 차감 테스트
- [ ] 환불 시스템 테스트
- [ ] 일일 리셋 테스트 (다음 날 확인)

---

## 문의사항
문제가 발생하거나 추가 수정이 필요한 경우 이 보고서를 참조하여 디버깅하세요.

**주요 로그 위치:**
- 브라우저 콘솔: 크레딧 환불 관련 로그
- Supabase 로그: DB 트리거 및 RLS 정책
- Vercel 로그: API 엔드포인트 오류
