# 📚 API 키 발급 가이드 - README

## 🎯 가이드 개요

이 디렉터리는 **웹사이트 운영자를 위한 API 키 발급 가이드**입니다.
서비스를 직접 운영하려는 사용자가 필요한 API 키를 쉽게 발급받을 수 있도록 단계별로 안내합니다.

## 📖 가이드 구성

### 1. [개요](01_overview.md)
- 필요한 API 키 요약
- 예상 비용 안내
- 시작하기 전 준비사항

### 2. [Gemini API 키 발급](02_gemini_api.md) ✅ 필수
- Google AI Studio에서 발급
- 대본 생성 및 AI 분석 기능
- 무료 할당량으로 시작 가능

### 3. [YouTube Data API 키 발급](03_youtube_api.md) ✅ 필수
- Google Cloud Console에서 발급
- 영상 검색 및 메타데이터 조회
- 무료 할당량 제공

### 4. [Google Cloud API 키 발급](04_google_cloud_api.md) ⚪ 선택
- Text-to-Speech (TTS)
- Speech-to-Text (STT)
- 결제 계정 연결 필요

### 5. [선택 API 키 발급](05_optional_apis.md) ⚪ 선택
- Groq API (콘텐츠 안전 검사)
- Supabase (데이터베이스)
- 관리자 인증 설정

### 6. [환경 변수 설정](06_environment_setup.md) ✅ 필수
- .env 파일 작성 방법
- API 키 보안 관리
- 배포 시 환경 변수 설정

## 🚀 빠른 시작

### 최소 구성 (15분)

핵심 기능만 사용하려면:

1. **Gemini API 발급** (5분)
   - [02_gemini_api.md](02_gemini_api.md) 참고
   - 대본 생성 기능 활성화

2. **YouTube Data API 발급** (10분)
   - [03_youtube_api.md](03_youtube_api.md) 참고
   - 영상 검색 기능 활성화

3. **환경 변수 설정** (5분)
   - [06_environment_setup.md](06_environment_setup.md) 참고
   - `.env` 파일 작성

### 전체 구성 (40분)

모든 기능을 사용하려면:

1. 필수 API 발급 (15분)
2. Google Cloud API 발급 (15분)
3. 선택 API 발급 (10분)
4. 환경 변수 설정 (5분)

## 💰 예상 비용

### 소규모 운영 (월 100명 이하)
- **총 예상**: $0~$5/월
- 대부분 무료 할당량 내 사용 가능

### 중규모 운영 (월 500~1,000명)
- **총 예상**: $25~$80/월
- Gemini API 및 Google Cloud API 사용량 증가

## ⚠️ 주의사항

### 보안

- ❌ API 키를 GitHub 등 공개 저장소에 업로드 금지
- ❌ 클라이언트 사이드 JavaScript에 직접 노출 금지
- ✅ `.env` 파일에만 저장
- ✅ `.gitignore`에 `.env` 추가

### 비용 관리

- ✅ Google Cloud Console에서 예산 알림 설정
- ✅ API 사용량 모니터링
- ✅ 개발용과 프로덕션용 키 분리

## 🔗 관련 문서

### 프로젝트 문서
- [API 키 사용 현황](../README_API_KEYS.md) - 제작자용 상세 문서
- [배포 가이드](../docs/DEPLOYMENT.md)
- [크레딧 시스템](../docs/CREDITS_SYSTEM_GUIDE.md)

### 외부 링크
- [Google AI Studio](https://aistudio.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Groq Console](https://console.groq.com/)
- [Supabase](https://supabase.com/)

## 📞 도움말

### 문제 해결

각 가이드 문서의 "문제 해결" 섹션을 참고하세요:
- [Gemini API 문제 해결](02_gemini_api.md#-문제-해결)
- [YouTube API 문제 해결](03_youtube_api.md#-문제-해결)
- [환경 변수 문제 해결](06_environment_setup.md#-문제-해결)

### 자주 묻는 질문

**Q: Gemini API와 Google Cloud API는 다른가요?**
- A: 네, 별도의 서비스입니다. Gemini는 Google AI Studio에서, Cloud API는 Google Cloud Console에서 발급받습니다.

**Q: 하나의 API 키로 모든 Google API를 사용할 수 있나요?**
- A: YouTube Data API, TTS, STT는 같은 Google Cloud API 키를 사용할 수 있지만, Gemini API는 별도 키가 필요합니다.

**Q: 무료로 사용할 수 있나요?**
- A: 네, Gemini API와 YouTube Data API는 무료 할당량으로 시작 가능합니다. TTS/STT는 결제 계정 연결이 필요하지만 무료 크레딧($300)이 제공됩니다.

**Q: API 키가 노출되었어요!**
- A: 즉시 해당 API 키를 삭제하고 새로 발급받으세요. GitHub에 올라갔다면 커밋 히스토리에서도 제거해야 합니다.

## 📝 피드백

가이드에 개선이 필요한 부분이나 추가했으면 하는 내용이 있다면:
- GitHub Issues로 제안
- 또는 프로젝트 관리자에게 문의

---

**시작하기**: [01_overview.md](01_overview.md) 문서부터 차례대로 읽어보세요!
