# 🔑 API 키 발급 가이드 - 개요

## 📋 이 가이드는 누구를 위한 것인가요?

이 가이드는 **웹사이트를 직접 운영하려는 사용자**를 위한 것입니다.
서비스를 이용하는 일반 사용자가 아닌, **자신만의 서버에서 웹사이트를 구동**하고자 하는 분들을 대상으로 합니다.

## 🎯 필요한 API 키 요약

이 웹사이트를 운영하려면 다음 API 키가 필요합니다:

### ✅ 필수 API 키 (2개만!)

| API 키 | 용도 | 발급처 | 예상 비용 |
|--------|------|--------|----------|
| **1. Gemini API** | AI 대본 생성, 분석 | Google AI Studio | 무료~저렴 |
| **2. Google Cloud API** | YouTube 검색 + TTS/STT | Google Cloud Console | 무료~저렴 |

> 💡 **중요**: Google Cloud Console에서 발급한 **하나의 API 키**로 YouTube Data API, Text-to-Speech, Speech-to-Text를 **모두** 사용할 수 있습니다!

### ⚪ 선택 API 키 (고급 기능용)

| API 키 | 용도 | 발급처 | 예상 비용 |
|--------|------|--------|----------|
| **Groq API** | 콘텐츠 안전 검사 | Groq Console | 무료 할당량 제공 |
| **Supabase** | 사용자 데이터 관리 | Supabase | 무료 플랜 가능 |

## 📖 가이드 구성

이 가이드는 다음과 같은 순서로 구성되어 있습니다:

1. **[필수] Gemini API 키 발급** (`02_gemini_api.md`)
   - Google AI Studio에서 발급
   - 대본 생성 및 AI 분석 기능에 필요
   - 무료 할당량으로 시작 가능

2. **[필수] Google Cloud API 키 발급** (`03_youtube_api.md`)
   - Google Cloud Console에서 발급
   - **하나의 키**로 YouTube + TTS/STT 모두 사용
   - 영상 검색, 음성 변환 등 모든 기능 포함
   - 무료 할당량으로 시작 가능

3. **[고급] Google Cloud API 추가 설정** (`04_google_cloud_api.md`)
   - TTS/STT 사용 시 결제 계정 연결 방법
   - 음성 변환 기능이 필요한 경우만 참고
   - 사용한 만큼만 과금

4. **[선택] 기타 API 키 발급** (`05_optional_apis.md`)
   - Groq API (콘텐츠 안전 검사)
   - Supabase (데이터베이스)
   - 관리자 인증 설정

5. **환경 변수 설정** (`06_environment_setup.md`)
   - `.env` 파일 작성 방법
   - API 키 보안 관리
   - 배포 시 주의사항

## 💰 예상 비용

### 소규모 운영 (월 100명 이하 사용)
- **Gemini API**: 무료 (할당량 내)
- **YouTube Data API**: 무료 (할당량 내)
- **Google Cloud API**: $0~$5 (TTS/STT 사용 시)
- **총 예상**: $0~$5/월

### 중규모 운영 (월 500~1,000명 사용)
- **Gemini API**: $5~$20/월
- **YouTube Data API**: 무료~$10/월 (추가 할당량)
- **Google Cloud API**: $20~$50/월
- **총 예상**: $25~$80/월

## ⚠️ 시작하기 전 준비사항

### 1. Google 계정
모든 Google API는 Google 계정이 필요합니다.
- 개인 Gmail 계정 사용 가능
- 조직 계정 권장 (비즈니스 운영 시)

### 2. 신용카드 (선택)
- Gemini API: **신용카드 불필요** (무료 사용 가능)
- YouTube Data API: **신용카드 불필요** (무료 할당량)
- Google Cloud API (TTS/STT): **신용카드 필요** (결제 계정 연결)

### 3. 시간
- 필수 API 키 발급: 약 15~20분
- 전체 설정 (선택 포함): 약 30~40분

## 🚀 빠른 시작

최소한의 기능으로 시작하려면:

1. **Gemini API 키만 발급** → 대본 생성 기능 사용 가능
2. **YouTube Data API 키 추가** → 영상 검색 기능 추가

이 두 가지만으로도 핵심 기능을 사용할 수 있습니다!

---

**다음 단계**: [02_gemini_api.md](02_gemini_api.md) - Gemini API 키 발급하기
