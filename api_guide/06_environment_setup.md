# ⚙️ 환경 변수 설정하기

## 📌 개요

이제 발급받은 API 키들을 프로젝트에 설정할 차례입니다.
`.env` 파일을 통해 안전하게 API 키를 관리하는 방법을 안내합니다.

## 🎯 환경 변수란?

환경 변수는:
- 🔑 API 키, 비밀번호 등 민감한 정보를 저장
- 🔒 코드와 분리하여 보안 강화
- 🌍 배포 환경별로 다른 값 설정 가능

## 📝 .env 파일 생성

### 1단계: 프로젝트 루트에 .env 파일 생성

프로젝트 최상위 디렉터리에 `.env` 파일을 생성합니다:

```
c:\KB\Website\Youtube\
├── .env          ← 여기에 생성
├── package.json
├── README.md
├── api/
├── youtube_script/
└── ...
```

### 2단계: .env 파일 내용 작성

발급받은 API 키에 따라 다음 템플릿을 복사하여 작성:

```env
# ===========================================
# 필수 API 키
# ===========================================

# Gemini API (Google AI Studio)
# 발급처: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSy...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# YouTube Data API (Google Cloud Console)
# 발급처: https://console.cloud.google.com/
YOUTUBE_API_KEY=AIzaSy...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx


# ===========================================
# 선택 API 키 (필요한 경우만)
# ===========================================

# Google Cloud API (TTS/STT) - 선택사항
# YouTube API 키와 같은 키 사용 가능
# GOOGLE_CLOUD_API_KEY=AIzaSy...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Groq API (콘텐츠 안전 검사) - 선택사항
# 발급처: https://console.groq.com/
# GROQ_API_KEY=gsk_...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase (데이터베이스) - 선택사항
# 발급처: https://supabase.com/
# SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 관리자 인증 - 선택사항
# ADMIN_USERNAME=admin
# ADMIN_PASSWORD=your_secure_password_here
# ADMIN_SESSION_SECRET=your_random_secret_here
```

### 3단계: 실제 값으로 교체

위 템플릿에서 `xxx...` 부분을 실제 발급받은 API 키로 교체합니다.

#### 예시 (실제 값으로 채운 모습):

```env
# 필수 API 키
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
YOUTUBE_API_KEY=AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY

# 선택 API 키 (사용하는 것만 주석 해제)
GROQ_API_KEY=gsk_ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ
```

> ⚠️ **주의**: 위 키는 예시입니다. 실제 발급받은 API 키로 교체하세요.

## ✅ .gitignore 설정

### 중요: .env 파일을 Git에 커밋하지 않기

`.env` 파일에는 민감한 정보가 들어있으므로 절대 GitHub 등 공개 저장소에 업로드하면 안 됩니다.

### 1단계: .gitignore 파일 확인

프로젝트 루트의 `.gitignore` 파일을 열어 다음 내용이 있는지 확인:

```gitignore
# Environment variables
.env
.env.local
.env.development
.env.production

# Vercel
.vercel

# API Keys
**/api-keys.json
gen-lang-client-*.json
```

### 2단계: .gitignore에 없다면 추가

`.gitignore` 파일이 없다면 생성하고 위 내용을 추가합니다.

### 3단계: 이미 커밋된 .env 파일 제거

만약 실수로 `.env` 파일을 이미 커밋했다면:

```bash
# Git 캐시에서 제거 (파일은 유지)
git rm --cached .env

# 변경사항 커밋
git commit -m "Remove .env from git tracking"

# GitHub에서 API 키 재발급 (보안을 위해 필수!)
```

## 📋 .env.example 파일 생성

다른 개발자나 미래의 자신을 위해 `.env.example` 파일을 생성하는 것이 좋습니다:

### 1단계: .env.example 파일 생성

```env
# ===========================================
# 필수 API 키
# ===========================================

# Gemini API (Google AI Studio)
# 발급처: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=

# YouTube Data API (Google Cloud Console)
# 발급처: https://console.cloud.google.com/
YOUTUBE_API_KEY=


# ===========================================
# 선택 API 키 (필요한 경우만)
# ===========================================

# Google Cloud API (TTS/STT)
# GOOGLE_CLOUD_API_KEY=

# Groq API (콘텐츠 안전 검사)
# GROQ_API_KEY=

# Supabase (데이터베이스)
# SUPABASE_URL=
# SUPABASE_SERVICE_ROLE_KEY=

# 관리자 인증
# ADMIN_USERNAME=
# ADMIN_PASSWORD=
# ADMIN_SESSION_SECRET=
```

### 2단계: .env.example은 Git에 커밋

`.env.example`은 실제 키가 없으므로 Git에 커밋해도 안전합니다:

```bash
git add .env.example
git commit -m "Add .env.example template"
```

## 🔧 환경별 설정

### 개발 환경 (로컬)

**파일**: `.env` 또는 `.env.development`

```env
# 개발용 API 키
GEMINI_API_KEY=AIzaSy...개발용키...
YOUTUBE_API_KEY=AIzaSy...개발용키...

# 디버그 모드
DEBUG=true
```

### 프로덕션 환경 (배포)

**Vercel 배포 시**:

1. Vercel Dashboard 접속

2. 프로젝트 선택

3. **Settings > Environment Variables** 클릭

4. 환경 변수 추가:
   - Name: `GEMINI_API_KEY`
   - Value: `AIzaSy...`
   - Environment: `Production`, `Preview`, `Development` 선택

5. 각 API 키에 대해 반복

**Netlify 배포 시**:

1. Netlify Dashboard 접속

2. 프로젝트 선택

3. **Site settings > Environment variables** 클릭

4. **Add a variable** 클릭하여 추가

## ✅ 설정 확인

### 방법 1: 콘솔 로그로 확인 (개발 중)

`api/test-env.ts` 파일 생성:

```typescript
// 환경 변수 확인용 (배포 시 삭제)
export default function handler(req, res) {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasYouTube = !!process.env.YOUTUBE_API_KEY;
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasSupabase = !!process.env.SUPABASE_URL;

  res.status(200).json({
    gemini: hasGemini ? '✅ 설정됨' : '❌ 없음',
    youtube: hasYouTube ? '✅ 설정됨' : '❌ 없음',
    groq: hasGroq ? '✅ 설정됨' : '⚪ 선택사항',
    supabase: hasSupabase ? '✅ 설정됨' : '⚪ 선택사항',
  });
}
```

브라우저에서 접속:
```
http://localhost:3000/api/test-env
```

### 방법 2: 실제 기능 테스트

1. **프로젝트 실행**:
   ```bash
   npm run dev
   ```

2. **브라우저에서 접속**:
   ```
   http://localhost:3000
   ```

3. **대본 생성 기능 테스트**:
   - YouTube URL 입력
   - 대본 생성 클릭
   - 정상 작동 확인

### 방법 3: 터미널에서 직접 확인 (PowerShell)

```powershell
# .env 파일 내용 확인 (키는 숨김)
Get-Content .env | ForEach-Object {
    if ($_ -match '^(\w+)=(.+)$') {
        $key = $matches[1]
        $valueLength = $matches[2].Length
        Write-Host "$key = $('*' * [Math]::Min(10, $valueLength))... ($valueLength chars)"
    }
}
```

## 🔒 보안 모범 사례

### 1. API 키 노출 방지

❌ **절대 하지 말 것**:
```javascript
// 클라이언트 사이드 JavaScript에 직접 노출
const apiKey = 'AIzaSyC1234...';  // 위험!
```

✅ **올바른 방법**:
```javascript
// 서버 사이드에서만 사용
const apiKey = process.env.GEMINI_API_KEY;
```

### 2. 환경 변수 접근 제한

**클라이언트에서 접근 가능한 변수**:
- Next.js: `NEXT_PUBLIC_` 접두사 필요
- Vite: `VITE_` 접두사 필요

```env
# 클라이언트에서 접근 가능 (공개 가능한 정보만)
NEXT_PUBLIC_API_URL=https://api.example.com

# 서버에서만 접근 가능 (API 키 등)
GEMINI_API_KEY=AIzaSy...
```

### 3. API 키 분리

**개발용과 프로덕션용 키 분리**:
```env
# 개발 환경
GEMINI_API_KEY=AIzaSy...개발용...

# 프로덕션 환경 (Vercel 등에 별도 설정)
GEMINI_API_KEY=AIzaSy...프로덕션용...
```

### 4. API 키 제한 설정

- **HTTP 리퍼러 제한**: 특정 도메인만 사용 가능
- **IP 주소 제한**: 특정 서버 IP만 사용 가능
- **API 범위 제한**: 필요한 API만 활성화

### 5. 정기적인 키 교체

- 3~6개월마다 API 키 재발급
- 특히 팀에서 개발자가 퇴사한 경우 즉시 교체

## 🔧 문제 해결

### "Environment variable not found" 오류

**원인**: `.env` 파일이 제대로 로드되지 않음

**해결 방법**:
1. `.env` 파일이 프로젝트 루트에 있는지 확인
2. 파일 이름이 정확히 `.env`인지 확인 (`.env.txt` 등이 아님)
3. 서버 재시작: `npm run dev` 중지 후 다시 실행

### 환경 변수가 undefined

**원인**: 변수 이름 오타 또는 값이 설정되지 않음

**해결 방법**:
1. `.env` 파일에서 변수 이름 확인
2. 공백이나 따옴표 확인:
   ```env
   # ❌ 잘못된 예
   GEMINI_API_KEY = "AIzaSy..."
   
   # ✅ 올바른 예
   GEMINI_API_KEY=AIzaSy...
   ```
3. 코드에서 변수 이름 확인:
   ```javascript
   process.env.GEMINI_API_KEY  // 정확한 이름
   ```

### Vercel 배포 시 환경 변수 오류

**원인**: Vercel에 환경 변수가 설정되지 않음

**해결 방법**:
1. Vercel Dashboard > Settings > Environment Variables
2. 모든 필수 환경 변수 추가
3. 프로젝트 재배포

### .env 파일이 Git에 업로드됨

**원인**: `.gitignore`에 `.env`가 없음

**해결 방법**:
1. `.gitignore`에 `.env` 추가
2. Git 캐시에서 제거:
   ```bash
   git rm --cached .env
   git commit -m "Remove .env from git"
   ```
3. **즉시 API 키 재발급** (보안상 중요!)

## 📌 체크리스트

### 설정 완료 확인

- [ ] `.env` 파일 생성
- [ ] 필수 API 키 입력 (Gemini, YouTube)
- [ ] 선택 API 키 입력 (필요 시)
- [ ] `.gitignore`에 `.env` 포함 확인
- [ ] `.env.example` 파일 생성 (선택)
- [ ] 로컬에서 프로젝트 실행 테스트
- [ ] API 키 제한사항 설정 (보안)
- [ ] Vercel/Netlify에 환경 변수 설정 (배포 시)

## 🚀 다음 단계

✅ 환경 변수 설정이 완료되었습니다!

이제 프로젝트를 실행할 준비가 되었습니다:

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 브라우저에서 접속
# http://localhost:3000
```

### 추가 가이드

- **배포 가이드**: `docs/DEPLOYMENT.md`
- **크레딧 시스템 설정**: `docs/CREDITS_SYSTEM_GUIDE.md`
- **관리자 페이지**: `docs/ADMIN_GUIDE.md`

---

💡 **팁**: 문제가 발생하면 `.env` 파일의 공백, 따옴표, 변수 이름을 먼저 확인하세요!
