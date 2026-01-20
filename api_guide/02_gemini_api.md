# 🤖 Gemini API 키 발급하기

## 📌 개요

- **발급처**: Google AI Studio
- **비용**: 무료 시작 가능 (할당량 제공)
- **소요 시간**: 약 5분
- **신용카드**: 불필요
- **용도**: AI 대본 생성, 분석, 아이디어 생성

## 🎯 Gemini API의 역할

이 웹사이트에서 Gemini API는 다음 기능에 사용됩니다:

- ✅ YouTube 영상 대본 분석
- ✅ 새로운 영상 기획 생성
- ✅ 아이디어 키워드 생성
- ✅ 챕터별 대본 작성
- ✅ 이미지 프롬프트 생성

## 📝 발급 절차

### 1단계: Google AI Studio 접속

1. 브라우저에서 다음 주소로 이동:
   ```
   https://aistudio.google.com/app/apikey
   ```

2. Google 계정으로 로그인
   - 개인 Gmail 계정 사용 가능
   - 비즈니스 계정도 사용 가능

### 2단계: API 키 생성

1. **"Create API Key"** 버튼 클릭

2. 프로젝트 선택:
   - **기존 Google Cloud 프로젝트가 있는 경우**: 
     - "Create API key in existing project" 선택
     - 드롭다운에서 프로젝트 선택
   
   - **처음 사용하는 경우**:
     - "Create API key in new project" 선택
     - 자동으로 새 프로젝트 생성됨

3. **"Create API key"** 버튼 클릭

### 3단계: API 키 복사

1. 생성된 API 키가 화면에 표시됩니다:
   ```
   AIzaSy...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

2. **"Copy"** 버튼을 클릭하여 복사

3. ⚠️ **중요**: 이 키를 안전한 곳에 저장하세요
   - 메모장에 임시 저장
   - 나중에 `.env` 파일에 설정할 예정

## 🔒 보안 권장사항

### API 키 제한 설정 (선택)

더 안전한 사용을 위해 API 키에 제한을 설정할 수 있습니다:

1. Google AI Studio의 API Keys 페이지에서 키 이름 클릭

2. **"Edit API key restrictions"** 클릭

3. 제한 옵션:
   - **Application restrictions**: 
     - HTTP referrers (웹사이트 도메인 제한)
     - IP addresses (서버 IP 제한)
   
   - **API restrictions**:
     - "Restrict key" 선택
     - "Generative Language API" 만 선택

4. **"Save"** 클릭

### ⚠️ 주의사항

- ❌ GitHub 등 공개 저장소에 API 키 업로드 금지
- ❌ 클라이언트 사이드 JavaScript에 직접 노출 금지
- ✅ 서버 환경 변수(`.env`)에만 저장
- ✅ `.env` 파일을 `.gitignore`에 추가

## 💰 비용 및 할당량

### 무료 할당량

| 모델 | 무료 할당량 | 제한 |
|------|-------------|------|
| Gemini 1.5 Flash | 15 requests/min | 1,500 requests/day |
| Gemini 1.5 Pro | 2 requests/min | 50 requests/day |

### 예상 사용량

**대본 생성 1회 = 약 1 request**

- 소규모 사용 (하루 10회): 완전 무료
- 중규모 사용 (하루 100회): Flash 모델로 충분
- 대규모 사용: 유료 전환 필요 ($0.075 per 1M tokens)

### 할당량 초과 시

무료 할당량을 초과하면:
1. 에러 메시지 발생: `429 Too Many Requests`
2. 1분 후 자동으로 복구됨
3. 또는 유료 플랜으로 업그레이드

## ✅ 확인 방법

API 키가 제대로 작동하는지 확인:

### 방법 1: 간단한 테스트 (터미널)

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"안녕하세요"}]}]}'
```

성공 시 응답 예시:
```json
{
  "candidates": [
    {
      "content": {
        "parts": [{"text": "안녕하세요! 무엇을 도와드릴까요?"}]
      }
    }
  ]
}
```

### 방법 2: 웹사이트에서 테스트

1. `.env` 파일에 API 키 설정 (다음 가이드 참고)
2. 웹사이트 실행
3. 대본 생성 기능 테스트

## 🔧 문제 해결

### "Invalid API key" 오류

- API 키를 정확히 복사했는지 확인
- 앞뒤 공백이 없는지 확인
- Google AI Studio에서 키가 활성화되어 있는지 확인

### "API key expired" 오류

- API 키는 만료되지 않지만, 삭제되었을 수 있음
- Google AI Studio에서 키 상태 확인
- 필요 시 새 키 생성

### "Quota exceeded" 오류

- 무료 할당량 초과
- 1분 후 재시도
- 또는 요청 빈도 줄이기

## 📌 다음 단계

✅ Gemini API 키를 발급받았습니다!

**다음으로 이동**: [03_youtube_api.md](03_youtube_api.md) - YouTube Data API 키 발급하기

발급받은 API 키는 나중에 [06_environment_setup.md](06_environment_setup.md)에서 설정합니다.
