# 🎬 유튜브 롱폼 이미지 생성기 - Admin 가이드

## 🛡️ 콘텐츠 안전성 시스템 관리

### 위험 단어 목록 수정

**파일 위치**: `utils/contentSafety.ts`

```typescript
export const UNSAFE_WORDS_MAP: Record<string, string> = {
  위험단어: "안전한대체어",
  // 100개 이상의 단어 매핑
};
```

**단어 추가 방법**:

1. `UNSAFE_WORDS_MAP`에 새로운 키-값 쌍 추가
2. 긴 단어부터 짧은 단어 순서로 정렬 (자동 정렬됨)
3. `npm run build`로 빌드
4. 배포

**테스트 방법**:

- `test-content-safety.html` 파일을 브라우저에서 열기
- 새로 추가한 단어로 테스트
- F12 콘솔에서 로그 확인

### 알림 메시지 수정

**페르소나 생성**: `App.tsx` 라인 571-599  
**영상 소스 생성**: `App.tsx` 라인 777-803

```typescript
alert(
  `🔄 안전한 이미지 생성을 위해 다음 단어를 자동으로 교체했습니다:\n\n${replacementList}\n\n이제 안전한 텍스트로 이미지를 생성합니다.`
);
```

---

## 🚀 Admin 페이지에서 가이드 수정하기

### 1. Admin 서버 실행

```bash
# Admin 서버와 개발 서버를 동시에 실행
npm run admin
```

실행되면:

- **개발 서버**: http://localhost:3000
- **Admin 서버**: http://localhost:3001
- **Admin 패널**: http://localhost:3001/admin.html

### 2. Admin 패널 접속

1. http://localhost:3001/admin.html 접속
2. 로그인 (기본값: admin / password)
3. 편집할 페이지 선택:
   - "API 키 발급 가이드"
   - "사용법 가이드"

### 3. 가이드 편집하기

#### 📝 기본 모드 (추천)

- WYSIWYG 편집 가능
- 실시간 미리보기 제공
- 초보자도 쉽게 사용 가능

#### 🔧 HTML 모드 (고급 사용자용)

- 직접 HTML 코드 편집
- 문법 하이라이팅 지원
- 세밀한 컨트롤 가능

### 4. 저장 및 적용

1. **저장**: `💾 저장` 버튼 클릭

   - 서버의 실제 HTML 파일에 저장됨
   - 로컬 백업도 자동으로 생성됨

2. **즉시 반영**: 저장하면 바로 웹사이트에 반영됨
   - http://localhost:3000/guides/api-key-guide.html
   - http://localhost:3000/guides/user-guide.html

### 5. 주요 기능

#### ✨ 실시간 동기화

- Admin 페이지에서 수정 → 즉시 가이드 페이지 업데이트
- 로컬 백업 + 서버 파일 동시 저장

#### 🔄 자동 복구

- 서버 연결 실패시 로컬 저장본으로 자동 전환
- 데이터 손실 방지 시스템

#### 📱 반응형 편집기

- 미리보기와 편집 화면 동시 표시
- 실시간 HTML 렌더링

### 6. 단축키

- `Ctrl + S`: 저장
- `Ctrl + P`: 미리보기 새로고침
- `Ctrl + B`: 볼드 (기본 모드)
- `Ctrl + I`: 이탤릭 (기본 모드)

### 7. 문제 해결

#### 서버 연결 오류

```bash
# 포트 3001이 사용중인 경우
netstat -ano | findstr :3001
taskkill /pid <PID> /f

# 서버 재시작
npm run admin
```

#### 변경사항이 반영되지 않는 경우

1. 브라우저 캐시 새로고침 (Ctrl + F5)
2. Admin 서버 재시작
3. 로컬 저장본 확인

### 8. 배포하기

수정 완료 후:

```bash
# 개발 서버 종료 (Ctrl + C)
# 빌드 및 배포
npm run build
git add .
git commit -m "Update guide content via admin panel"
git push origin main
```

## 🛡️ 보안 참고사항

- Admin 패널은 로컬 개발 환경에서만 사용
- 실제 배포 시에는 server.js 제외
- 로그인 정보는 개발용 기본값

## 🎯 Admin 기능 확장

필요시 다음 기능들도 추가 가능:

- 이미지 업로드 관리
- 메타데이터 편집
- 다중 사용자 권한 관리
- 버전 히스토리 추적

---

✅ **이제 Admin 페이지에서 수정한 내용이 실제 가이드 페이지에 즉시 반영됩니다!**
