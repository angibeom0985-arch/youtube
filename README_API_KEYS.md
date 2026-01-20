# API 키 사용 현황 정리

## 📋 요약

| API 키 | 필수 여부 | 용도 | 발급처 |
|--------|----------|------|--------|
| GEMINI_API_KEY | ✅ 필수 | 대본 생성, 분석, 이미지 | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| YOUTUBE_API_KEY | ✅ 필수 | 모멘텀 헌터 | [Google Cloud](https://console.cloud.google.com/) |
| GROQ_API_KEY | ⚪ 선택 | 어뷰징 감지 | [Groq Console](https://console.groq.com/) |
| SUPABASE_* | ⚪ 선택 | 사용량 추적 | [Supabase](https://supabase.com/) |
| ADMIN_* | ⚪ 선택 | 관리자 페이지 | 직접 설정 |

## 🔑 필수 API 키

### 1. GEMINI_API_KEY
사용 위치:
- `/api/gemini.ts` - 메인 API 엔드포인트
- `/image/services/geminiService.ts` - 이미지 앱

기능:
- YouTube 영상 대본 분석
- 새로운 영상 기획 생성
- 아이디어 키워드 생성
- 챕터별 대본 작성
- 이미지 프롬프트 생성

비용:
- 무료: 15 requests/minute
- 유료: $0.00025 per 1K characters

### 2. YOUTUBE_API_KEY (신규 추가)
사용 위치:
- `/api/benchmarking/search.ts` - 모멘텀 헌터 API

기능:
- 유튜브 영상 검색
- 영상 메타데이터 조회
- 채널 구독자 수 조회
- 조회수/모멘텀 분석

할당량:
- 무료: 10,000 units/day
- 검색: 100 units per request
- 상세 정보: 1 unit per video

모멘텀 헌터 1회 실행 시 사용량:
- 검색 요청: ~100 units
- 영상 정보: ~100 units (100개 영상 기준)
- 채널 정보: ~2 units
- 총 약 200-300 units/scan

## ⚪ 선택 API 키

### 3. GROQ_API_KEY
사용 위치:
- `/api/_lib/groq.ts`
- `/api/abuse/check.ts`

기능:
- AI 기반 유해 콘텐츠 감지
- 19금, 폭력, 혐오 표현 필터링
- Llama 3.1 70B 모델 사용

없을 경우:
- 어뷰징 감지 기능 비활성화
- 나머지 기능은 정상 동작

### 4. SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY
사용 위치:
- `/api/_lib/supabase.ts`
- `/api/_lib/usageLimit.ts`

기능:
- 사용자별 요청 횟수 추적
- IP 기반 사용량 제한
- 어뷰징 기록 저장

없을 경우:
- 사용량 제한 없이 동작
- 통계 및 로그 없음

### 5. ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SESSION_SECRET
사용 위치:
- `/api/_lib/adminAuth.ts`
- `/api/admin/login.ts`
- `/api/admin/abuse.ts`

기능:
- 관리자 페이지 로그인
- 어뷰징 기록 조회
- 시스템 통계 확인

없을 경우:
- 관리자 페이지 접근 불가
- 일반 기능은 정상 동작

## 📊 API 사용 패턴 분석

### 대본 생성 1회 실행 시
```
GEMINI_API_KEY 사용:
1. 대본 분석: ~3,000 characters
2. 키워드 생성: ~500 characters  
3. 기획안 생성: ~2,000 characters
4. 대본 작성: ~5,000 characters
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
총 약 10,000 characters ≈ $0.0025
```

### 모멘텀 헌터 1회 실행 시
```
YOUTUBE_API_KEY 사용:
1. 검색 (50개): 100 units
2. 영상 상세 (100개): 100 units
3. 채널 정보 (10개): 2 units
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
총 약 200 units (하루 10,000 units 중)
```

### 이미지 생성 1회 실행 시
```
GEMINI_API_KEY 사용:
1. 장면 분석: ~2,000 characters
2. 프롬프트 생성: ~3,000 characters
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
총 약 5,000 characters ≈ $0.00125
```

## 🔒 보안 가이드

### DO (해야 할 것)
✅ `.env.local` 파일 사용  
✅ Vercel 환경변수로 배포  
✅ API 키를 서버사이드에서만 사용  
✅ 정기적으로 키 교체  
✅ IP/도메인 제한 설정 (가능한 경우)  

### DON'T (하면 안 되는 것)
❌ Git에 API 키 커밋  
❌ 클라이언트 사이드에서 키 사용  
❌ 코드에 하드코딩  
❌ 공개 포럼에 키 공유  
❌ 같은 키를 여러 프로젝트에 사용  

## 🚀 최적화 팁

### Gemini API 비용 절감
1. 응답 길이 제한 설정
2. 캐싱 활용 (같은 영상 재분석 방지)
3. 토큰 수 모니터링

### YouTube API 할당량 관리
1. 검색 결과 캐싱
2. 배치 요청 사용 (50개씩)
3. 불필요한 필드 제외
4. 사용량 대시보드 모니터링

## 📈 모니터링

### Gemini API
- [Google AI Studio Usage](https://aistudio.google.com/app/apikey)
- 일일/월별 사용량 확인
- 속도 제한 확인

### YouTube API
- [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)
- Quotas 페이지에서 실시간 사용량
- 할당량 초과 시 알림 설정

### Groq API
- [Groq Console](https://console.groq.com/usage)
- 요청 수 및 토큰 사용량
- 무료: 14,400 requests/day

## 🆘 문제 해결

### "API key not valid" 오류
1. 키 복사 시 공백 포함 여부 확인
2. API 활성화 상태 확인 (YouTube Data API v3)
3. 키 제한 설정 확인 (IP, HTTP referrer)

### "Quota exceeded" 오류
1. Google Cloud Console에서 할당량 확인
2. 다음날까지 대기 (자정 PST 기준)
3. 할당량 증가 요청 또는 유료 전환

### "Gemini API error: 500" 오류
1. API 키 유효성 확인
2. 요청 크기 확인 (너무 큰 대본)
3. 속도 제한 확인 (15 RPM)
4. Gemini API 상태 페이지 확인

## 📝 체크리스트

### 초기 설정
- [ ] GEMINI_API_KEY 발급 완료
- [ ] YOUTUBE_API_KEY 발급 완료
- [ ] YouTube Data API v3 활성화 완료
- [ ] .env.local 파일 생성 완료
- [ ] Vercel 환경변수 설정 완료

### 선택 기능
- [ ] GROQ_API_KEY 설정 (어뷰징 감지)
- [ ] SUPABASE 설정 (사용량 추적)
- [ ] 관리자 계정 설정

### 보안
- [ ] .gitignore에 .env.local 포함 확인
- [ ] API 키 노출 여부 확인
- [ ] IP/도메인 제한 설정 (선택)

### 테스트
- [ ] 대본 생성 테스트 완료
- [ ] 모멘텀 헌터 테스트 완료
- [ ] 이미지 생성 테스트 완료
- [ ] 에러 핸들링 확인

## 📚 관련 문서

- [빠른 시작 가이드](API_KEYS_QUICKSTART.md)
- [상세 API 문서](API_KEYS_GUIDE.md)
- [배포 가이드](DEPLOYMENT.md)
- [관리자 가이드](ADMIN_GUIDE.md)
