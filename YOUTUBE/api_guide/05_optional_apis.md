# 🔧 선택 API 키 발급하기

## 📌 개요

이 문서는 고급 기능을 위한 선택적 API 키 발급 방법을 안내합니다.
기본 기능만 사용한다면 이 단계를 건너뛰어도 됩니다.

## 🎯 선택 API 목록

| API | 용도 | 필수 여부 | 비용 |
|-----|------|----------|------|
| **Groq API** | 콘텐츠 안전 검사 | ⚪ 선택 | 무료 |
| **Supabase** | 데이터베이스, 사용자 관리 | ⚪ 선택 | 무료 플랜 가능 |

---

## 1️⃣ Groq API 키 발급

### 개요

- **발급처**: Groq Console
- **비용**: 무료 (할당량 제공)
- **소요 시간**: 약 5분
- **신용카드**: 불필요
- **용도**: AI 기반 콘텐츠 안전 검사 (19금, 폭력, 혐오 표현 필터링)

### 기능 설명

Groq API는 Llama 3.1 70B 모델을 사용하여:
- 🚫 부적절한 콘텐츠 감지
- 🔞 19금 콘텐츠 필터링
- 💢 폭력적 표현 감지
- 😡 혐오 발언 감지

**없을 경우**: 콘텐츠 안전 검사 기능이 비활성화되며, 나머지 기능은 정상 작동

### 발급 절차

#### 1단계: Groq Console 접속

1. 브라우저에서 다음 주소로 이동:
   ```
   https://console.groq.com/
   ```

2. 계정 생성:
   - Google 계정으로 가입 (권장)
   - 또는 이메일 주소로 가입

3. 이메일 인증 (필요 시)

#### 2단계: API 키 생성

1. 로그인 후 대시보드로 이동

2. 왼쪽 메뉴에서 **"API Keys"** 클릭

3. **"Create API Key"** 버튼 클릭

4. API 키 이름 입력:
   ```
   youtube-content-safety
   ```

5. **"Create"** 버튼 클릭

6. API 키가 생성되고 표시됩니다:
   ```
   gsk_...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

7. **"Copy"** 버튼 클릭하여 복사

8. ⚠️ **중요**: 안전한 곳에 저장 (나중에 다시 볼 수 없음)

#### 3단계: 환경 변수 설정

나중에 `.env` 파일에 다음과 같이 추가:
```env
GROQ_API_KEY=gsk_...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 무료 할당량

| 모델 | 무료 할당량 | 제한 |
|------|-------------|------|
| Llama 3.1 70B | 30 requests/min | 14,400 requests/day |
| Llama 3.1 8B | 30 requests/min | 14,400 requests/day |

**예상 사용량**:
- 콘텐츠 안전 검사 1회 = 1 request
- 일일 사용 가능 횟수: 14,400회
- 개인 프로젝트에는 충분함

### 확인 방법

#### curl 테스트

```bash
curl -X POST "https://api.groq.com/openai/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.1-70b-versatile",
    "messages": [{"role": "user", "content": "안녕하세요"}],
    "max_tokens": 100
  }'
```

**성공 시**: JSON 응답 반환

### 문제 해결

**"Invalid API key" 오류**:
- API 키를 정확히 복사했는지 확인
- 앞뒤 공백 제거

**"Rate limit exceeded" 오류**:
- 1분당 30 requests 제한 초과
- 잠시 대기 후 재시도

---

## 2️⃣ Supabase API 키 발급

### 개요

- **발급처**: Supabase
- **비용**: 무료 플랜 (월 500MB DB, 2GB 파일 저장소)
- **소요 시간**: 약 10분
- **신용카드**: 불필요 (무료 플랜)
- **용도**: 사용자 데이터, 사용량 추적, 크레딧 시스템

### 기능 설명

Supabase는 다음 기능에 사용됩니다:
- 📊 사용자별 API 요청 횟수 추적
- 💳 크레딧 시스템 (사용량 제한)
- 📈 통계 및 로그
- 🚫 어뷰징 기록 저장

**없을 경우**: 사용량 제한 없이 동작, 통계 및 로그 없음

### 발급 절차

#### 1단계: Supabase 가입

1. 브라우저에서 다음 주소로 이동:
   ```
   https://supabase.com/
   ```

2. **"Start your project"** 버튼 클릭

3. 계정 생성:
   - GitHub 계정으로 가입 (권장)
   - 또는 이메일 주소로 가입

#### 2단계: 프로젝트 생성

1. **"New project"** 버튼 클릭

2. 조직 생성 (첫 가입 시):
   - Organization name: 개인 이름 또는 팀 이름

3. 프로젝트 정보 입력:
   - **Name**: `youtube-script-generator`
   - **Database Password**: 강력한 비밀번호 생성
     - ⚠️ 반드시 저장! (나중에 필요)
   - **Region**: `Northeast Asia (Seoul)`
   - **Pricing Plan**: `Free` 선택

4. **"Create new project"** 버튼 클릭

5. 프로젝트 생성 완료까지 1~2분 대기

#### 3단계: API 키 확인

1. 프로젝트 대시보드로 이동

2. 왼쪽 메뉴에서 **"Settings"** (톱니바퀴 아이콘) 클릭

3. **"API"** 메뉴 선택

4. 다음 정보 확인 및 복사:

   **Project URL**:
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```
   
   **anon public key** (공개 키):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   
   **service_role key** (비밀 키):
   - **"Reveal"** 버튼 클릭하여 표시
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. ⚠️ **중요**: 
   - `service_role key`는 절대 공개하지 말 것
   - 서버 사이드에서만 사용
   - GitHub 등에 업로드 금지

#### 4단계: 데이터베이스 스키마 설정

크레딧 시스템 및 사용량 추적을 위한 테이블 생성:

1. 왼쪽 메뉴에서 **"SQL Editor"** 클릭

2. **"New query"** 버튼 클릭

3. 다음 SQL 실행 (프로젝트의 `SETUP_CREDITS_DATABASE.sql` 파일 참고):

```sql
-- 사용자 크레딧 테이블
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  credits INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 사용 기록 테이블
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  credits_used INTEGER NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
```

4. **"Run"** 버튼 클릭하여 실행

5. 성공 메시지 확인

#### 5단계: Row Level Security (RLS) 설정

보안을 위한 접근 제어 설정:

1. SQL Editor에서 다음 쿼리 실행:

```sql
-- RLS 활성화
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- 서비스 역할만 접근 가능하도록 설정
CREATE POLICY "Service role only" ON user_credits
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON usage_logs
  FOR ALL USING (auth.role() = 'service_role');
```

2. **"Run"** 실행

#### 6단계: 환경 변수 설정

나중에 `.env` 파일에 다음과 같이 추가:

```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 무료 플랜 제한

| 항목 | 무료 플랜 |
|------|-----------|
| Database | 500 MB |
| File Storage | 1 GB |
| Bandwidth | 2 GB/월 |
| API Requests | 무제한 |

**예상 사용량**:
- 소규모 프로젝트: 무료 플랜으로 충분
- 데이터베이스 용량은 수만 명의 사용자 기록 가능

### 확인 방법

#### 방법 1: Supabase Dashboard

1. **"Table Editor"** 메뉴 클릭

2. `user_credits` 테이블 선택

3. 테이블이 정상적으로 생성되었는지 확인

#### 방법 2: API 테스트

```bash
curl "https://YOUR_PROJECT_URL.supabase.co/rest/v1/user_credits?select=*" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**성공 시**: 빈 배열 `[]` 또는 데이터 반환

### 문제 해결

**"Invalid API key" 오류**:
- API 키를 정확히 복사했는지 확인
- `anon` 키가 아닌 `service_role` 키 사용 확인

**"Permission denied" 오류**:
- RLS 정책 확인
- `service_role` 키로 요청하는지 확인

**데이터베이스 연결 오류**:
- 프로젝트가 정상적으로 생성되었는지 확인
- Supabase Dashboard에서 프로젝트 상태 확인

---

## 3️⃣ 관리자 인증 설정

### 개요

- **발급처**: 직접 설정
- **비용**: 무료
- **소요 시간**: 약 2분
- **용도**: 관리자 페이지 접근 제어

### 기능 설명

관리자 인증은 다음 기능에 사용됩니다:
- 🔐 관리자 페이지 로그인
- 📊 어뷰징 기록 조회
- 📈 시스템 통계 확인

**없을 경우**: 관리자 페이지 접근 불가, 일반 기능은 정상 동작

### 설정 방법

환경 변수에 다음을 추가:

```env
# 관리자 계정 (원하는 값으로 설정)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here

# 세션 비밀키 (랜덤 문자열)
ADMIN_SESSION_SECRET=your_random_secret_here
```

### 보안 권장사항

#### 1. 강력한 비밀번호 사용

❌ **약한 비밀번호**:
```
ADMIN_PASSWORD=admin123
ADMIN_PASSWORD=password
```

✅ **강력한 비밀번호**:
```
ADMIN_PASSWORD=Xy9#mK2$pL8@vN4!qR7
```

#### 2. 랜덤 세션 시크릿 생성

다음 명령어로 랜덤 문자열 생성 (PowerShell):

```powershell
# 32바이트 랜덤 문자열 생성
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

또는 온라인 도구 사용:
- https://randomkeygen.com/
- "CodeIgniter Encryption Keys" 사용

#### 3. 정기적인 비밀번호 변경

- 3~6개월마다 비밀번호 변경
- 세션 시크릿도 함께 변경

---

## 📌 요약

### 발급받은 API 키 체크리스트

#### 필수 API
- ✅ Gemini API Key (Google AI Studio)
- ✅ YouTube Data API Key (Google Cloud Console)

#### 선택 API (필요 시)
- ⚪ Google Cloud API Key (TTS/STT - 결제 필요)
- ⚪ Groq API Key (콘텐츠 안전)
- ⚪ Supabase URL & Service Role Key (데이터베이스)
- ⚪ Admin Username/Password (관리자)

### 다음 단계

✅ 필요한 API 키를 모두 발급받았습니다!

**다음으로 이동**: [06_environment_setup.md](06_environment_setup.md) - 환경 변수 설정하기

---

💡 **팁**: 선택 API는 나중에 필요할 때 추가해도 됩니다!
