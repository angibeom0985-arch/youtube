# 관리자 페이지 내용 편집 API

## 개요
관리자 페이지에서 웹사이트의 가이드 페이지를 편집하고 저장할 수 있는 API입니다.

## 엔드포인트
`/api/YOUTUBE/admin/page-content`

## 요청 방법

### 1. 페이지 내용 불러오기 (GET)
```
GET /api/YOUTUBE/admin/page-content?pageType={pageType}
```

**Query Parameters:**
- `pageType` (required): 페이지 타입
  - `api-guide-aistudio`: AI 스튜디오 API 발급방법
  - `api-guide-cloudconsole`: 클라우드 콘솔 API 발급방법

**성공 응답 (200):**
```json
{
  "page_type": "api-guide-aistudio",
  "content": "<html content>",
  "mode": "basic",
  "updated_at": "2024-02-08T...",
  "created_at": "2024-02-08T..."
}
```

**데이터 없음 (200):**
```json
{
  "page_type": "api-guide-aistudio",
  "content": "",
  "mode": "basic",
  "message": "No content found for this page"
}
```

### 2. 페이지 내용 저장하기 (POST)
```
POST /api/YOUTUBE/admin/page-content?pageType={pageType}
Content-Type: application/json
```

**Query Parameters:**
- `pageType` (required): 페이지 타입

**Request Body:**
```json
{
  "content": "<html content>",
  "mode": "basic",
  "username": "admin"
}
```

**성공 응답 (200):**
```json
{
  "success": true,
  "message": "Page content saved successfully",
  "page_type": "api-guide-aistudio",
  "updated_at": "2024-02-08T..."
}
```

## 오류 응답

**400 Bad Request:**
```json
{
  "error": "Invalid request",
  "message": "pageType query parameter is required"
}
```

**400 Bad Request (잘못된 페이지 타입):**
```json
{
  "error": "Invalid page type",
  "message": "Allowed page types: api-guide-aistudio, api-guide-cloudconsole"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Database not configured",
  "message": "Supabase configuration is missing"
}
```

## 데이터베이스 구조

### guides 테이블
```sql
create table guides (
  page_type text primary key,
  data jsonb not null,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
```

**data 필드 구조:**
```json
{
  "content": "HTML 내용",
  "mode": "basic | html",
  "updated_by": "사용자명"
}
```

## 보안 사항

### 현재 구현
- ✅ CORS 설정됨
- ✅ 페이지 타입 화이트리스트 검증
- ✅ 요청 본문 유효성 검사
- ⚠️ 프론트엔드 인증만 사용 중 (sessionStorage)

### 향후 개선 사항
- [ ] JWT 토큰 기반 인증 추가
- [ ] Supabase RLS 정책 강화
- [ ] 관리자 권한 테이블 추가
- [ ] 요청 제한(Rate Limiting) 추가

## 사용 예시

### JavaScript (Fetch API)
```javascript
// 페이지 내용 불러오기
const response = await fetch('/api/YOUTUBE/admin/page-content?pageType=api-guide-aistudio');
const data = await response.json();
console.log(data.content);

// 페이지 내용 저장하기
const saveResponse = await fetch('/api/YOUTUBE/admin/page-content?pageType=api-guide-aistudio', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: '<h1>새로운 내용</h1>',
    mode: 'html',
    username: 'admin'
  })
});
const saveResult = await saveResponse.json();
console.log(saveResult.message);
```

## 관리자 페이지 사용법

1. `/admin.html` 접속
2. 로그인 (akb0811 / rlqja0985!)
3. 페이지 선택 드롭다운에서 편집할 페이지 선택
4. 내용이 자동으로 로드됨
5. 기본모드 또는 HTML모드로 편집
6. "저장" 버튼 클릭
7. 데이터베이스에 저장됨

## 문제 해결

### 페이지 내용이 로드되지 않는 경우
1. 브라우저 콘솔에서 API 요청 확인
2. Supabase 연결 확인
3. 환경 변수 확인 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

### 저장이 실패하는 경우
1. 콘솔에서 오류 메시지 확인
2. content가 비어있지 않은지 확인
3. pageType이 올바른지 확인
4. Supabase 테이블 권한 확인
