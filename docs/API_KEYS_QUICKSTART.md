# API 키 빠른 설정 가이드

## 최소 요구사항 (필수)

```bash
# .env.local 파일 생성
GEMINI_API_KEY=your_gemini_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here
```

## 1단계: Gemini API 키 발급 (5분)

### 발급 방법
1. 🔗 https://aistudio.google.com/app/apikey 접속
2. 구글 계정으로 로그인
3. **"Get API key"** 버튼 클릭
4. **"Create API key"** 선택
5. 프로젝트 선택 또는 새로 만들기
6. 생성된 키 복사

### 사용처
- ✅ 대본 분석 및 생성
- ✅ 영상 기획 아이디어
- ✅ 이미지 프롬프트 생성

---

## 2단계: YouTube API 키 발급 (10분)

### 발급 방법
1. 🔗 https://console.cloud.google.com/ 접속
2. **새 프로젝트 만들기** (또는 기존 프로젝트 선택)
3. 왼쪽 메뉴에서 **"API 및 서비스" > "라이브러리"** 이동
4. **"YouTube Data API v3"** 검색 후 **활성화**
5. **"API 및 서비스" > "사용자 인증 정보"** 이동
6. **"사용자 인증 정보 만들기" > "API 키"** 클릭
7. 생성된 키 복사

### 사용처
- ✅ 모멘텀 헌터 (영상 검색 및 분석)
- ✅ 채널 통계 조회
- ✅ 영상 메타데이터 가져오기

### 주의사항
⚠️ YouTube API 할당량: **10,000 units/day** (무료)
- 검색 요청: 100 units
- 영상 상세: 1 unit
- 모멘텀 헌터 1회 실행 시 약 200-500 units 사용

---

## 3단계: 환경변수 설정

### 로컬 개발
```bash
# 프로젝트 루트에 .env.local 파일 생성
cp .env.example .env.local

# 발급받은 키 입력
nano .env.local  # 또는 VS Code로 편집
```

### Vercel 배포
1. Vercel 프로젝트 페이지 접속
2. **Settings** > **Environment Variables**
3. 다음 변수 추가:
   - `GEMINI_API_KEY`: Gemini API 키
   - `YOUTUBE_API_KEY`: YouTube API 키
4. **Production**, **Preview**, **Development** 모두 체크
5. **Save** 클릭

---

## 선택 기능 (필요시만 설정)

### 어뷰징 감지 (Groq API)
```bash
# 발급: https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-70b-versatile
```
- 없으면: 어뷰징 감지 기능 비활성화
- 있으면: AI 기반 유해 콘텐츠 자동 차단

### 사용량 추적 (Supabase)
```bash
# 발급: https://supabase.com/dashboard
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```
- 없으면: 사용량 추적 없이 동작
- 있으면: 사용자별 요청 제한 및 통계

---

## 테스트 방법

### 1. 개발 서버 실행
```bash
npm run dev
```

### 2. 기능별 테스트

#### 대본 생성 테스트
1. 홈 화면에서 **"대본 생성"** 클릭
2. YouTube URL 입력 (예: https://www.youtube.com/watch?v=dQw4w9WgXcQ)
3. 분석 시작 → ✅ 정상 동작하면 GEMINI_API_KEY 설정 완료

#### 모멘텀 헌터 테스트
1. 홈 화면에서 **"모멘텀 헌터"** 클릭
2. 검색 키워드 입력 (예: "일상 건강")
3. 모멘텀 스캔 실행 → ✅ 정상 동작하면 YOUTUBE_API_KEY 설정 완료

---

## 문제 해결

### ❌ "GEMINI_API_KEY가 필요합니다"
```bash
# 1. .env.local 파일 확인
cat .env.local

# 2. 키가 올바른지 확인
# 3. 개발 서버 재시작
npm run dev
```

### ❌ "YOUTUBE_API_KEY가 필요합니다"
1. YouTube Data API v3 활성화 확인
2. API 키 제한 설정 확인 (IP, HTTP 리퍼러 등)
3. 할당량 초과 여부 확인

### ❌ "Quota exceeded" (할당량 초과)
- **Gemini API**: [요금제 업그레이드](https://ai.google.dev/pricing)
- **YouTube API**: 
  - 다음날까지 대기 (자정 PST 기준 리셋)
  - 또는 Google Cloud에서 할당량 증가 요청

---

## 보안 체크리스트

- ✅ `.env.local` 파일이 `.gitignore`에 포함되어 있는가?
- ✅ API 키를 코드에 하드코딩하지 않았는가?
- ✅ GitHub 등에 API 키가 노출되지 않았는가?
- ✅ Vercel 환경변수가 올바르게 설정되었는가?

---

## 비용 관리

### Gemini API
- **무료**: 15 RPM (분당 요청)
- **유료**: $0.00025 per 1K characters

### YouTube Data API v3
- **무료**: 10,000 units/day
- **초과 시**: 할당량 증가 요청 또는 유료 전환

### 예상 사용량
- 대본 생성 1회: ~5,000 characters (Gemini)
- 모멘텀 헌터 1회: ~300 units (YouTube)
- 일 100회 사용 시: 충분히 무료 범위 내

---

## 다음 단계

✅ API 키 발급 완료  
✅ 환경변수 설정 완료  
✅ 테스트 성공  

이제 다음을 확인하세요:
- 📖 [배포 가이드](DEPLOYMENT.md)
- 📖 [관리자 가이드](ADMIN_GUIDE.md)
- 📖 [상세 API 문서](API_KEYS_GUIDE.md)
