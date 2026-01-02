<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 유튜브 롱폼 이미지 생성기

AI를 활용한 유튜브 콘텐츠 제작 도구

구글 AI 스튜디오에서 제작된 YouTube 롱폼 콘텐츠를 위한 스토리보드 이미지 생성 도구입니다.

View your app in AI Studio: https://ai.studio/apps/drive/1Y3_dlsaZH3pGWj0maZoxmO7zP0MJ6_gl

## 🚀 기능

- **대본 분석**: 한국어 대본을 분석하여 주요 등장인물 추출
- **캐릭터 생성**: Google Gemini AI를 활용한 캐릭터 이미지 생성
- **스토리보드**: 여러 장면의 이미지를 한 번에 생성
- **이미지 다운로드**: 개별 또는 ZIP 파일로 일괄 다운로드
- **🛡️ 콘텐츠 안전 보호**: 100개 이상의 위험 단어 자동 감지 및 안전한 단어로 자동 교체
  - 범죄, 폭력, 부정적 감정 등 민감한 표현 자동 필터링
  - 사용자에게 교체 내역 실시간 알림
  - 페르소나 및 영상 소스 생성 시 자동 적용

## 🛠️ 기술 스택

- **Frontend**: React 19 + TypeScript + Vite
- **AI**: Google Gemini 2.5 Flash API
- **스타일링**: Tailwind CSS
- **배포**: Vercel

## 📋 로컬 실행

**사전 요구사항:** Node.js

1. **의존성 설치**:

   ```bash
   npm install
   ```

2. **환경 변수 설정**:

   - `.env.example` 파일을 `.env`로 복사
   - `GEMINI_API_KEY`를 Google AI Studio에서 발급받은 실제 API 키로 설정

3. **개발 서버 실행**:

   ```bash
   # 일반 실행
   npm run dev
   
   # 백그라운드 실행 (권장 - UI 깨짐 방지)
   # Windows PowerShell:
   .\scripts\start-dev.ps1
   
   # Linux/Mac:
   chmod +x scripts/start-dev.sh && ./scripts/start-dev.sh
   ```

   **⚠️ 중요**: Git 명령 실행 시 개발 서버가 중단되는 것을 방지하려면 백그라운드 스크립트를 사용하세요.

4. **개발 서버 중지** (백그라운드 실행 시):
   ```bash
   # Windows PowerShell:
   .\scripts\stop-dev.ps1
   
   # Linux/Mac:
   ./scripts/stop-dev.sh
   ```

5. **빌드 테스트**:
   ```bash
   npm run build
   npm run preview
   ```

## ⚠️ UI/UX 깨짐 방지

자세한 내용은 `DEPLOYMENT_CHECKLIST.md` 참조

**주요 원인**:
- 개발 서버가 Git 명령 실행 시 자동 중단
- 브라우저/CDN 캐시 문제
- Vercel 배포 실패

**해결 방법**:
- 백그라운드 스크립트로 개발 서버 실행
- 배포 전 로컬 빌드 테스트
- 브라우저 하드 리프레시 (Ctrl+Shift+R)

## 🌐 Vercel 배포 가이드

### 1단계: Vercel 프로젝트 설정

1. [Vercel](https://vercel.com)에 로그인
2. GitHub 저장소를 연결하여 프로젝트 import
3. Framework Preset: **Vite** 선택

### 2단계: 환경 변수 설정

Vercel 대시보드 → Project Settings → Environment Variables에서:

```
Name: GEMINI_API_KEY
Value: your_actual_google_ai_studio_api_key
```

### 3단계: 배포 확인

- Build Command: `npm run build` (자동 설정됨)
- Output Directory: `dist` (자동 설정됨)
- Install Command: `npm install` (자동 설정됨)

### 4단계: 커스텀 도메인 연결 (선택사항)

Vercel 대시보드의 Domains 섹션에서 원하는 도메인 추가

## 📁 주요 파일

- `vercel.json`: Vercel 배포 설정
- `.env.example`: 환경 변수 템플릿
- `vite.config.ts`: 빌드 및 환경 변수 설정
- `services/geminiService.ts`: Google Gemini AI 연동

## 🚨 배포 전 체크리스트

- [ ] `npm run build` 성공 확인
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] Vercel에서 환경 변수 `GEMINI_API_KEY` 설정 완료
- [ ] Google AI Studio API 사용량 한도 확인

## 🔧 문제 해결

**빌드 실패 시:**

- Node.js 버전 18+ 사용 확인
- `npm install` 재실행
- API 키가 올바르게 설정되었는지 확인

**배포 후 오류 시:**

- Vercel 함수 로그 확인
- 환경 변수가 프로덕션 환경에 올바르게 설정되었는지 확인

## 🧪 콘텐츠 안전성 테스트

프로젝트에는 `test-content-safety.html` 파일이 포함되어 있습니다. 브라우저에서 이 파일을 열어:

- 위험 단어 감지 기능 테스트
- 자동 교체 결과 확인
- 다양한 테스트 케이스 실행

**사용 방법:**

1. `test-content-safety.html` 파일을 브라우저에서 엽니다
2. 텍스트 입력란에 테스트할 문장을 입력합니다
3. "🔍 검사하기" 버튼을 클릭합니다
4. 또는 제공된 테스트 케이스를 클릭하여 자동 테스트합니다

## 🔒 콘텐츠 정책 준수

이 애플리케이션은 Google의 콘텐츠 정책을 준수하기 위해:

- **자동 단어 교체**: 100개 이상의 민감한 단어를 안전한 표현으로 자동 변환
- **사용자 알림**: 교체된 단어 목록을 사용자에게 명확히 표시
- **다층 안전망**: 생성 전 검사 → API 레벨 재시도 → 안전한 대체 프롬프트
- **투명성**: 모든 교체 내역을 콘솔 로그와 UI를 통해 확인 가능
