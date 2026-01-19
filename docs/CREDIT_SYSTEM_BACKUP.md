# 크레딧 시스템 백업 문서

## 📦 백업 위치
- **Git 브랜치**: `feature/credit-system-backup`
- **GitHub URL**: https://github.com/angibeom0985-arch/youtube/tree/feature/credit-system-backup

## 🎯 크레딧 시스템 개요

### 주요 기능
- 초기 크레딧: 12개
- 무료 체험 기간: 3일
- 일일 리셋: 매일 자정 12개로 리셋
- 이미지 생성 비용: 5 크레딧/이미지
- Pre-deduction + Refund 패턴: 실패 시 자동 환불

## 📁 관련 파일 목록

### Backend API
1. **`api/_lib/creditService.ts`**
   - 크레딧 차감 및 검증 로직
   - `checkAndDeductCredits()`: 인증, 프로필 생성, 일일 리셋, 차감
   - 상수: `INITIAL_CREDITS=12`, `INITIAL_PERIOD_DAYS=3`, `IMAGE_CREDIT_COST=5`

2. **`api/YOUTUBE/user/credits-deduct.ts`**
   - POST `/api/YOUTUBE/user/credits-deduct`
   - deduct: `{ cost: number }`
   - refund: `{ action: "refund", cost: number }`

### Database
3. **`docs/SETUP_CREDITS_DATABASE.sql`**
   - `profiles` 테이블 스키마
   - `handle_new_user()` 트리거 함수
   - RLS (Row Level Security) 정책

### Frontend
4. **`youtube_image/ui/App.tsx`**
   - `deductCredits()`: 크레딧 차감 함수
   - `refundCredits()`: 크레딧 환불 함수
   - `handleGeneratePersonas()`: pre-deduction + refund 패턴 적용
   - 기타 생성 함수들 (일부만 refund 패턴 적용됨)

### Documentation
5. **`docs/CREDITS_SYSTEM_FIX_REPORT.md`**
   - 크레딧 시스템 수정 내역
   - 테스트 시나리오
   - 배포 체크리스트

## 🔄 복원 방법

### 크레딧 시스템 다시 적용하기
```bash
# 백업 브랜치로 이동
git checkout feature/credit-system-backup

# main에 머지
git checkout main
git merge feature/credit-system-backup

# 또는 특정 파일만 가져오기
git checkout feature/credit-system-backup -- api/_lib/creditService.ts
git checkout feature/credit-system-backup -- api/YOUTUBE/user/credits-deduct.ts
```

## ⚙️ 설정 필요 사항

### Supabase 설정
1. SQL Editor에서 `SETUP_CREDITS_DATABASE.sql` 실행
2. Environment Variables 확인:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Vercel 환경 변수
- 위 Supabase 키들이 설정되어 있어야 함

## 🚀 사용자 API 키 방식 전환

크레딧 시스템을 비활성화하고 사용자가 직접 API 키를 입력하는 방식으로 전환:

### 변경 필요 사항
1. **Frontend**: 
   - `deductCredits()` 호출 제거
   - API 키 입력 UI 추가
   - localStorage에 API 키 저장

2. **Backend**:
   - `creditService.ts` 사용 중단
   - API 키 검증 로직 추가

3. **Database**:
   - credits 필드 사용 안 함 (테이블은 유지)

## 📝 참고사항

- 백업 시점: 2026년 1월 20일
- 마지막 커밋: `feature/credit-system-backup` 브랜치
- 완전히 구현된 기능: 페르소나 생성 (pre-deduction + refund)
- 부분 구현: 나머지 이미지 생성 기능들 (deduction만 있음)

## 🔗 관련 링크
- [크레딧 시스템 백업 브랜치](https://github.com/angibeom0985-arch/youtube/tree/feature/credit-system-backup)
- [크레딧 시스템 수정 보고서](./CREDITS_SYSTEM_FIX_REPORT.md)
- [데이터베이스 설정 SQL](./SETUP_CREDITS_DATABASE.sql)
