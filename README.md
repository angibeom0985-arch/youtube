# 유튜브 영상 제작 AI - 성공 영상의 비밀을 1분에 파헤치다

> "성공한 유튜버들은 무엇을 알고 있습니까? 당신도 모르고 있을 뿐.."

조회수 100만 구독자 1천명인 영상 아이 아닙니다.  
AI가 분석한 성공 영상의 공식을 지금 바로 무료로 받아가세요.

**▶️ 지금 바로 시작: https://youtube.money-hotissue.com**

---

## 🎯 주요 기능

### 1. 모멘텀 헌터 (NEW!)
- 🔍 잠재력 높은 유튜브 영상 빠른 검색
- 📊 채널 규모, 조회 속도, 콘텐츠 길이 분석
- 🎯 구독자 대비 모멘텀이 높은 영상 발굴
- 💡 니치 시장 발견 및 트렌드 분석

### 2. 대본 생성
- 📝 성공 영상 대본 자동 분석
- 💡 AI 기반 새로운 기획안 생성
- 🎬 챕터별 상세 대본 작성
- 🎭 캐릭터별 대사 분리

### 3. 이미지 생성
- 🖼️ 대본 기반 이미지 프롬프트
- 🎨 스토리보드 제작 도구
- 🎯 장면별 최적화 이미지

### 4. TTS 생성
- 🎤 대본을 음성으로 자동 변환
- 🔊 다양한 음성 스타일 지원
- ⚡ 빠른 나레이션 제작

---

## 🚀 빠른 시작

### 사용자 (일반)
1. https://youtube.money-hotissue.com 접속
2. 원하는 기능 선택
3. 바로 시작!

**무료 사용 가능** - 카드 등록 필요 없음

### 개발자 (로컬 환경)

#### 1. 저장소 클론
```bash
git clone https://github.com/angibeom0985-arch/youtube.git
cd youtube
npm install
```

#### 2. API 키 설정 (필수)
```bash
# .env.local 파일 생성
cp .env.example .env.local
```

**.env.local 파일 내용:**
```bash
# 필수 API 키
GEMINI_API_KEY=your_gemini_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here

# 선택 (어뷰징 감지)
GROQ_API_KEY=your_groq_api_key_here

# 선택 (사용량 추적)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
```

**📖 API 키 발급 가이드:**
- [⚡ 빠른 시작 (5분)](docs/API_KEYS_QUICKSTART.md)
- [📚 상세 문서](docs/API_KEYS_GUIDE.md)
- [📊 사용 현황](README_API_KEYS.md)

#### 3. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 http://localhost:5173 열기

#### 4. 프로덕션 빌드
```bash
npm run build
npm run preview
```

---

## 📋 API 키 요약

| API 키 | 필수 여부 | 용도 | 발급처 |
|--------|----------|------|--------|
| GEMINI_API_KEY | ✅ 필수 | 대본 생성, 분석 | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| YOUTUBE_API_KEY | ✅ 필수 | 모멘텀 헌터 | [Google Cloud Console](https://console.cloud.google.com/) |
| GROQ_API_KEY | ⚪ 선택 | 어뷰징 감지 | [Groq Console](https://console.groq.com/) |
| SUPABASE_* | ⚪ 선택 | 사용량 추적 | [Supabase](https://supabase.com/) |

**최소 요구사항:** GEMINI_API_KEY + YOUTUBE_API_KEY 만 있으면 모든 기본 기능 사용 가능!

---

## 🛠️ 기술 스택

### Frontend
- **React 19** - 최신 UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 고속 빌드 도구
- **Tailwind CSS** - 유틸리티 우선 CSS
- **React Router** - 클라이언트 라우팅

### Backend (Serverless)
- **Vercel Functions** - 서버리스 API
- **Google Gemini API** - AI 대본 생성
- **YouTube Data API v3** - 영상 검색/분석
- **Groq API** - AI 어뷰징 감지
- **Supabase** - 데이터베이스

### 개발 도구
- **Monaco Editor** - 코드 편집
- **ESLint + Prettier** - 코드 품질
- **Git** - 버전 관리

---

## 📦 프로젝트 구조

```
youtube/
├── api/                      # Vercel 서버리스 함수
│   ├── gemini.ts            # 대본 생성 API
│   ├── benchmarking/        # 모멘텀 헌터 API
│   │   └── search.ts
│   └── _lib/                # 공통 라이브러리
│       ├── groq.ts          # 어뷰징 감지
│       └── supabase.ts      # DB 연결
├── src/
│   ├── pages/               # 페이지 컴포넌트
│   │   ├── HomePage.tsx
│   │   ├── BenchmarkingPage.tsx
│   │   ├── TtsPage.tsx
│   │   └── ...
│   ├── components/          # 재사용 컴포넌트
│   ├── services/            # API 서비스
│   └── utils/               # 유틸리티 함수
├── docs/                    # 문서
│   ├── API_KEYS_QUICKSTART.md
│   ├── API_KEYS_GUIDE.md
│   └── DEPLOYMENT.md
├── .env.example             # 환경변수 템플릿
└── README_API_KEYS.md       # API 키 사용 현황
```

---

## 🌐 Vercel 배포

### 자동 배포 (권장)
1. GitHub에 코드 푸시
2. [Vercel](https://vercel.com)에서 프로젝트 import
3. 환경변수 설정:
   - `GEMINI_API_KEY`
   - `YOUTUBE_API_KEY`
   - 기타 선택 변수
4. Deploy 버튼 클릭
5. 완료!

### 수동 배포
```bash
npm install -g vercel
vercel --prod
```

**📖 상세 가이드:** [배포 문서](docs/DEPLOYMENT.md)

---

## 💰 비용 안내

### 무료 범위
- **Gemini API**: 15 requests/minute (무료)
- **YouTube API**: 10,000 units/day (무료)
- **Vercel 호스팅**: Hobby 플랜 무료

### 예상 사용량
- 대본 생성 1회: ~10,000 characters ≈ $0.0025
- 모멘텀 헌터 1회: ~200 units (하루 10,000 중)
- **일 100회 사용 가능** (무료 범위 내)

### 비용 초과 시
- Gemini API: $0.00025 per 1K characters
- YouTube API: 할당량 증가 요청 또는 유료 전환

---

## 🔒 보안

### API 키 보호
- ✅ 모든 API 키는 서버사이드에서만 사용
- ✅ `.env.local`은 Git에 커밋되지 않음
- ✅ 클라이언트 코드에 노출 없음

### 데이터 프라이버시
- ✅ 사용자 데이터는 브라우저 localStorage에만 저장
- ✅ 서버에 개인정보 저장 없음
- ✅ 쿠키 사용 없음 (관리자 페이지 제외)

---

## 🐛 문제 해결

### "GEMINI_API_KEY가 필요합니다"
1. `.env.local` 파일에 키가 있는지 확인
2. 개발 서버 재시작
3. [API 키 가이드](docs/API_KEYS_QUICKSTART.md) 참고

### "YOUTUBE_API_KEY가 필요합니다"
1. YouTube Data API v3 활성화 확인
2. API 키 제한 설정 확인
3. 할당량 초과 여부 확인

### "Quota exceeded"
- Gemini: 속도 제한 (15 RPM) 대기
- YouTube: 일일 할당량 (10,000 units) 대기 또는 증가 요청

**📖 더 많은 문제 해결:** [API 키 가이드](docs/API_KEYS_GUIDE.md#문제-해결)

---

## 📚 문서

- [⚡ API 키 빠른 설정 (5분)](docs/API_KEYS_QUICKSTART.md)
- [📖 API 키 상세 가이드](docs/API_KEYS_GUIDE.md)
- [📊 API 사용 현황 정리](README_API_KEYS.md)
- [🚀 배포 가이드](docs/DEPLOYMENT.md)
- [🔧 관리자 가이드](docs/ADMIN_GUIDE.md)

---

## 🤝 기여

버그 리포트, 기능 제안, Pull Request 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 지원

- 📧 이메일: support@money-hotissue.com
- 🐛 버그 리포트: [GitHub Issues](https://github.com/angibeom0985-arch/youtube/issues)
- 📖 사용 가이드: https://youtube.money-hotissue.com/guide

---

## 📄 라이선스

MIT License - 자유롭게 사용하세요!

---

## 🌟 지금 바로 시작하세요!

**▶️ https://youtube.money-hotissue.com**

30초 안에 영상 기획을 시작할 수 있습니다.  
카드 등록 없음. 이메일 없음. 오직 성공만을 위한 AI 도구.

---

**만든 이:** [@angibeom0985-arch](https://github.com/angibeom0985-arch)  
**별점 주시면 감사하겠습니다!** ⭐
