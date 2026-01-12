# API 키 정리 문서

## 현재 사용 중인 API 키 목록

### 1. GEMINI_API_KEY (필수)
- **용도**: 대본 분석, 기획/대본 생성, 이미지 프롬프트 생성
- **발급처**: [Google AI Studio](https://aistudio.google.com/app/apikey)
- **사용 위치**:
  - `/api/gemini.ts` - 대본 생성 API
  - `/image/services/geminiService.ts` - 이미지 생성 서비스
- **환경변수 파일**:
  - `.env.local` (루트)
  - `image/.env.local` (이미지 앱)

### 2. YOUTUBE_API_KEY (신규 추가)
- **용도**: 모멘텀 헌터 - 유튜브 영상 검색 및 분석
- **발급처**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- **사용 위치**:
  - `/api/benchmarking/search.ts` - 모멘텀 헌터 API
- **환경변수 파일**:
  - `.env.local` (루트)

### 3. GROQ_API_KEY (선택)
- **용도**: 어뷰징 콘텐츠 감지 (Llama 3.1 모델 사용)
- **발급처**: [Groq Console](https://console.groq.com/keys)
- **사용 위치**:
  - `/api/_lib/groq.ts` - 어뷰징 감지 서비스
- **환경변수 파일**:
  - `.env.local` (루트)
- **비고**: 없으면 어뷰징 감지 기능 비활성화

### 4. SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY (선택)
- **용도**: 사용량 추적 및 어뷰징 방지
- **발급처**: [Supabase Dashboard](https://supabase.com/dashboard)
- **사용 위치**:
  - `/api/_lib/supabase.ts` - DB 연결
  - `/api/_lib/usageLimit.ts` - 사용량 제한
- **환경변수 파일**:
  - `.env.local` (루트)
- **비고**: 없어도 기본 기능 동작, 사용량 추적만 안됨

### 5. ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SESSION_SECRET (선택)
- **용도**: 관리자 페이지 인증
- **사용 위치**:
  - `/api/_lib/adminAuth.ts` - 관리자 인증
  - `/api/admin/*` - 관리자 API
- **환경변수 파일**:
  - `.env.local` (루트)
- **비고**: 관리자 페이지 사용하지 않으면 불필요

## 환경변수 설정 방법

### 로컬 개발 환경

1. 루트 폴더에 `.env.local` 파일 생성:
```bash
# 필수
GEMINI_API_KEY=your_gemini_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here

# 선택 (어뷰징 감지)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-70b-versatile

# 선택 (사용량 추적)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key

# 선택 (관리자 페이지)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password
ADMIN_SESSION_SECRET=your_random_secret_string
ADMIN_SESSION_TTL_MS=43200000

# 기타
ABUSE_HASH_SALT=change_me_to_random_string
ABUSE_LOOKBACK_MS=86400000
AI_RATE_LIMIT_MAX=30
AI_RATE_LIMIT_WINDOW_MS=86400000
```

2. 이미지 앱 폴더에 `image/.env.local` 파일 생성:
```bash
NODE_ENV=development
PORT=3003
GEMINI_API_KEY=your_gemini_api_key_here
```

### Vercel 배포 환경

Vercel 프로젝트 설정 > Environment Variables에서 다음을 추가:

**필수 변수:**
- `GEMINI_API_KEY`
- `YOUTUBE_API_KEY`

**선택 변수 (필요시):**
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `ABUSE_HASH_SALT`

## API 키 발급 가이드

### GEMINI_API_KEY 발급하기
1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. "Get API key" 버튼 클릭
3. "Create API key" 선택
4. 기존 프로젝트 선택 또는 새 프로젝트 생성
5. 생성된 키 복사

### YOUTUBE_API_KEY 발급하기
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. "APIs & Services" > "Credentials" 이동
4. "Create Credentials" > "API key" 선택
5. YouTube Data API v3 활성화:
   - "APIs & Services" > "Library"
   - "YouTube Data API v3" 검색 및 활성화
6. 생성된 키 복사

### GROQ_API_KEY 발급하기
1. [Groq Console](https://console.groq.com/) 접속 (GitHub 로그인)
2. "API Keys" 메뉴 선택
3. "Create API Key" 클릭
4. 키 이름 입력 후 생성
5. 생성된 키 복사 (한 번만 표시됨)

### SUPABASE 설정하기
1. [Supabase](https://supabase.com/) 접속 및 프로젝트 생성
2. Project Settings > API에서 다음 확인:
   - Project URL → `SUPABASE_URL`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
3. 필요한 테이블 생성 (사용량 추적용)

## 보안 주의사항

⚠️ **절대 Git에 커밋하지 마세요!**
- `.env.local` 파일은 `.gitignore`에 포함되어 있음
- API 키가 포함된 파일을 실수로 커밋하지 않도록 주의

⚠️ **클라이언트 사이드에 노출하지 마세요!**
- 모든 API 키는 서버사이드(Vercel Functions)에서만 사용
- 프론트엔드 코드에 하드코딩 금지

⚠️ **정기적으로 키를 교체하세요!**
- API 키가 노출되었다고 의심되면 즉시 재발급
- 주기적으로 키 교체 권장

## 문제 해결

### "GEMINI_API_KEY가 필요합니다" 오류
- `.env.local` 파일에 `GEMINI_API_KEY` 설정 확인
- Vercel 배포 시 환경변수 설정 확인
- 개발 서버 재시작

### "YOUTUBE_API_KEY가 필요합니다" 오류
- `.env.local` 파일에 `YOUTUBE_API_KEY` 설정 확인
- YouTube Data API v3가 활성화되어 있는지 확인
- API 키의 API 제한 설정 확인

### 할당량 초과 오류
- Google Cloud Console에서 할당량 확인
- YouTube Data API v3 할당량: 기본 10,000 units/day
- Gemini API 할당량: [요금제](https://ai.google.dev/pricing)에 따라 다름

## 현재 상태 체크리스트

- [ ] GEMINI_API_KEY 설정 완료
- [ ] YOUTUBE_API_KEY 설정 완료 (모멘텀 헌터 사용 시)
- [ ] GROQ_API_KEY 설정 완료 (어뷰징 감지 사용 시)
- [ ] SUPABASE 설정 완료 (사용량 추적 사용 시)
- [ ] 관리자 인증 설정 완료 (관리자 페이지 사용 시)
- [ ] Vercel 환경변수 설정 완료
- [ ] .env.local 파일이 .gitignore에 포함되어 있는지 확인
