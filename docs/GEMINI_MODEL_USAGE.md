# Gemini 모델 사용 현황 정리

## 📌 페르소나 생성 (generateCharacters 함수)

| 작업 | 모델 | 용도 | 비용 |
|------|------|------|------|
| **1. 참조 이미지 분석** | `gemini-2.5-flash` | 업로드된 참조 이미지의 얼굴 특징 분석 (선택사항) | **무료** (현재 Flash 2.5 모델 무료) |
| **2. 대분 분석** | `gemini-2.5-flash` | 대본에서 캐릭터 추출 및 설명 생성 | **무료** |
| **3. 캐릭터 이미지 생성 (배경)** | `gemini-2.5-flash-image-preview` | 각 캐릭터의 실제 이미지 생성 (배경) | **무료** (Preview 모델 무료 제공) |
| **4. 안전 단어 재시도** | `gemini-2.5-flash-image-preview` | 콘텐츠 정책 위반 시 재생성 | **무료** |
| **5. Fallback 생성** | `gemini-2.5-flash-image-preview` | 실패 시 다국화된 프롬프트로 재생성 | **무료** |

### 재생성 (regenerateCharacterImage)
- `gemini-2.5-flash-image-preview` - 캐릭터 이미지 재생성 | **무료**
- `gemini-2.5-flash-image-preview` - Fallback 재생성 | **무료**

---

## 📌 영상소스 생성 (generateStoryboard 함수)

| 작업 | 모델 | 용도 | 비용 |
|------|------|------|------|
| **1. 대분 장면 분석** | `gemini-2.5-flash` | 대본을 여러 시각적 장면으로 분할 | **무료** |
| **2. 스토리보드 이미지 생성 (배경)** | `gemini-2.5-flash-image-preview` | 각 장면의 실제 이미지 생성 (배경) | **무료** |
| **3. 안전 단어 재시도** | `gemini-2.5-flash-image-preview` | 콘텐츠 정책 위반 시 재생성 | **무료** |

### 재생성 (regenerateStoryboardImage)
- `gemini-2.5-flash-image-preview` - 스토리보드 이미지 재생성 | **무료**
- `gemini-2.5-flash-image-preview` - 안전 단어 재시도 | **무료**

---

## 💰 비용 정보 (2025년 11월 기준)

### Gemini 2.5 Flash 모델
- **텍스트 입력**: 무료 (일일 한도 내)
- **텍스트 출력**: 무료 (일일 한도 내)
- **무료 한도**: 
  - 분당 15 요청 (RPM)
  - 일일 1,500 요청 (RPD)
  - 분당 100만 토큰 (TPM)
  - 일일 1,500만 토큰 (TPD)

### Gemini 2.5 Flash Image Preview 모델
- **이미지 생성**: **완전 무료** (Preview 기간)
- **제한 사항**: 
  - 분당 2 요청 (RPM)
  - 일일 50 요청 (RPD)
- **참고**: Preview 모델이므로 향후 유료화 가능성 있음

### 현재 앱 비용 구조
✅ **완전 무료**: 현재 모든 기능이 Gemini API 무료 티어 내에서 작동  
⚠️ **주의사항**: 
- 이미지 생성은 RPM 2개로 제한되어 한 번에 여러 이미지 생성 시 대기 시간 발생
- 일일 50개 이미지 생성 제한
- Preview 모델 종료 시 유료 전환 필요

### 예상 유료 전환 시 비용 (참고)
만약 Gemini Image Preview가 종료되면:
- **Imagen 3** 사용 시: 이미지당 약 $0.04 (약 50원)
- 하루 50개 생성 시: 약 $2 (약 2,500원)
- 월간 1,500개 생성 시: 약 $60 (약 75,000원)

---

## 📊 API 호출 패턴

### 페르소나 1개 생성 시
1. 텍스트 분석 API 호출: 1회
2. 이미지 생성 API 호출: 1회
3. 실패 시 추가 호출: 최대 2회 (재시도 + Fallback)

**총 비용**: **무료** (현재)

### 영상소스 5개 생성 시
1. 텍스트 분석 API 호출: 1회
2. 이미지 생성 API 호출: 5회 (RPM 제한으로 약 2.5분 소요)

**총 비용**: **무료** (현재)

### 카메라 앵글 변환 시
- 현재 미사용 (클라이언트 측 Canvas API로 처리)
- **비용**: $0

---

## 🔄 최적화 제안

1. **배치 처리**: RPM 제한을 고려한 큐 시스템 구현
2. **캐싱**: 동일한 프롬프트 재사용 시 로컬 캐싱
3. **Preview 모델 모니터링**: 유료 전환 전 대체 솔루션 준비
4. **Fallback 전략**: Imagen 3, DALL-E 3 등 대체 API 준비

---

## 📝 참고 링크
- [Gemini API Pricing](https://ai.google.dev/pricing)
- [Gemini 2.5 Flash Documentation](https://ai.google.dev/gemini-api/docs/models/gemini-v2)
- [Image Generation Preview](https://ai.google.dev/gemini-api/docs/imagen)
