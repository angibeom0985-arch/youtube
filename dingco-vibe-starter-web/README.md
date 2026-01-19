# 🚀 딩코딩코 올인원 스타터킷

수강생들의 개발 시간을 **70% 단축**시키는 완성형 개발 환경

> 📚 **인프런 강의 전용 스타터킷**  
> 이 프로젝트는 [비개발자 4주만에 수익화 서비스 만들기: AI 바이브 코딩 웹+앱 ALL IN ONE](https://www.inflearn.com/course/%EB%B9%84%EA%B0%9C%EB%B0%9C%EC%9E%90-4%EC%A3%BC%EB%A7%8C%EC%97%90-%EC%88%98%EC%9D%B5%ED%99%94-%EC%84%9C%EB%B9%84%EC%8A%A4-%EB%A7%8C%EB%93%A4) 강의의 공식 스타터킷입니다.

## 📋 개요

딩코딩코 올인원 스타터킷은 강의 수강생들이 환경 설정에 시간을 낭비하지 않고, **바로 핵심 기능 개발에 집중**할 수 있도록 만들어진 완성형 스타터킷입니다.

### ✨ 핵심 기능
- 🔐 **Supabase 인증** - 이메일/소셜 로그인, 회원가입
- 💳 **토스페이먼츠 결제** - 카드 결제, 간편결제, 결제 승인
- 🎨 **Shadcn/ui 컴포넌트** - 모던하고 접근성 좋은 UI
- 🚀 **SEO 최적화** - 동적 메타태그, 사이트맵, 구조화된 데이터
- 📱 **반응형 디자인** - 모든 디바이스 지원
- 🔧 **개발 도구** - ESLint, Prettier, Husky 완전 설정

## 🛠️ 기술 스택

### Frontend
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Shadcn/ui**

### Backend & 인증
- **Supabase** (PostgreSQL + Auth)
- **토스페이먼츠** API
- **Row Level Security** (RLS)

### 도구 & 배포
- **Vercel** 배포
- **ESLint + Prettier** 코드 품질
- **Husky + Commitlint** Git 훅
- **Cursor Rules** AI 개발 지원

## 🚀 빠른 시작

### 1. 프로젝트 설정
```bash
# 프로젝트 복제
git clone [repository-url]
cd dingco-vibecoding-web-starter-kit

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 열어 실제 값으로 수정

# 개발 서버 실행
npm run dev
```

### 2. 브라우저에서 확인
- 홈페이지: [http://localhost:3000](http://localhost:3000)
- 인증 페이지: [http://localhost:3000/auth](http://localhost:3000/auth)
- 결제 페이지: [http://localhost:3000/payment](http://localhost:3000/payment)

## 📁 프로젝트 구조

```
src/
├── app/                 # Next.js App Router
│   ├── auth/           # 인증 페이지
│   ├── payment/        # 결제 페이지
│   └── api/            # API 라우트
├── components/          # UI 컴포넌트
│   ├── auth/           # 인증 컴포넌트
│   ├── payment/        # 결제 컴포넌트
│   ├── seo/            # SEO 컴포넌트
│   └── ui/             # Shadcn/ui 컴포넌트
├── lib/                # 유틸리티 & 설정
├── hooks/              # 커스텀 훅
├── contexts/           # React 컨텍스트
└── types/              # TypeScript 타입
```

## 🎯 개발 가이드

### 커밋 규칙
```bash
# 형식: feat|fix|docs|style|refactor|test|chore: 작업 내용
git commit -m "feat: 토스페이먼츠 결제 시스템 구현"
git commit -m "fix: Supabase 인증 오류 수정"
```

### 코드 스타일
- ✅ **TypeScript 필수**
- ✅ **ESLint + Prettier** 자동 적용
- ✅ **컴포넌트 재사용성** 고려
- ✅ **한글 주석** 권장

## 🌐 배포

### Vercel 배포
1. Vercel 계정 연결
2. 환경 변수 설정
3. 자동 배포 활성화

### 필수 환경 변수
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 토스페이먼츠
NEXT_PUBLIC_TOSS_CLIENT_KEY=your_toss_client_key
TOSS_SECRET_KEY=your_toss_secret_key

# SEO
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## 🤖 Cursor Rules 적용하기

이 프로젝트는 **Cursor AI 에디터**에 최적화된 개발 규칙을 제공합니다.

### 1. Cursor Rules 자동 적용
```bash
# Cursor 에디터에서 프로젝트 열기
cursor .

# .cursor/rules/ 폴더의 규칙들이 자동으로 적용됩니다
```

### 2. 포함된 AI 개발 규칙
- 🏗️ **프로젝트 구조** - 파일 구조와 네이밍 컨벤션
- 📝 **TypeScript 코딩** - 타입 안전성과 베스트 프랙티스
- 🔐 **Supabase 인증** - 인증 시스템 구현 가이드
- 💳 **토스페이먼츠** - 결제 시스템 연동 방법
- 🚀 **SEO 최적화** - 검색엔진 최적화 전략

### 3. AI 어시스턴트 활용
Cursor의 AI 어시스턴트에게 다음과 같이 요청하세요:
```
"Supabase 인증 컴포넌트를 만들어줘"
"토스페이먼츠 결제 버튼을 구현해줘"
"SEO 메타태그를 추가해줘"
```

## 📖 추가 문서

- 📝 [개발 진행 상황](./TODO.md)
- 🤖 [Cursor AI 규칙](./.cursor/rules/)
- 📋 [환경 변수 예시](./.env.example)

## 🤝 라이선스

MIT License © 2025 dingcodingco

---

<div align="center">

**Made with ❤️ by [딩코딩코](https://www.inflearn.com/users/408812/@dingcodingco)**

🎓 **인프런에서 더 많은 강의를 만나보세요!**

</div>
