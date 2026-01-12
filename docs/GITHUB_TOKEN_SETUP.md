# GitHub Token 설정 가이드

Admin 페이지에서 자동 커밋/배포를 위해 GitHub Personal Access Token이 필요합니다.

## 1. GitHub Personal Access Token 생성

1. **GitHub 설정 페이지로 이동**
   - https://github.com/settings/tokens

2. **"Generate new token (classic)" 클릭**

3. **Token 설정**
   - Note: `Youtube Image Admin Auto Commit`
   - Expiration: `No expiration` (또는 원하는 기간)
   - Select scopes:
     - ✅ `repo` (Full control of private repositories)
       - ✅ `repo:status`
       - ✅ `repo_deployment`
       - ✅ `public_repo`
       - ✅ `repo:invite`
       - ✅ `security_events`

4. **"Generate token" 클릭**

5. **생성된 토큰 복사** (다시 볼 수 없으니 안전한 곳에 저장!)
   - 예: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## 2. Vercel 환경 변수 설정

1. **Vercel 대시보드 접속**
   - https://vercel.com/angibeom0985-arch/youtube-image

2. **Settings → Environment Variables**

3. **새 환경 변수 추가**
   - Name: `GITHUB_TOKEN`
   - Value: (위에서 복사한 토큰)
   - Environment: `Production`, `Preview`, `Development` 모두 선택

4. **"Save" 클릭**

5. **재배포 필요**
   - Settings → Deployments → 최신 배포 선택 → "Redeploy"

## 3. 작동 확인

1. **Admin 페이지 접속**
   - https://youtube-image.money-hotissue.com/admin

2. **로그인**
   - ID: `akb0811`
   - PW: `rlqja0985!`

3. **내용 편집 후 저장**
   - "저장" 버튼 클릭
   - 성공 메시지 확인: "✅ GitHub에 자동으로 커밋되었습니다!"

4. **GitHub 확인**
   - Repository commits 페이지에서 자동 커밋 확인
   - https://github.com/angibeom0985-arch/youtube-image/commits/main

5. **Vercel 자동 배포 확인**
   - 1-2분 후 변경사항이 실제 웹사이트에 반영됨

## 보안 주의사항

⚠️ **GitHub Token은 절대 코드에 하드코딩하지 마세요!**

- ✅ Vercel 환경 변수 사용 (권장)
- ❌ 코드에 직접 작성
- ❌ Git 저장소에 포함

Token이 유출되면 즉시 취소하고 새로 생성하세요!

## 문제 해결

### Token이 작동하지 않는 경우

1. **Token 권한 확인**
   - `repo` scope가 제대로 선택되었는지 확인

2. **Vercel 환경 변수 확인**
   - 변수 이름이 정확히 `GITHUB_TOKEN`인지 확인
   - 모든 환경(Production, Preview, Development)에 추가되었는지 확인

3. **재배포**
   - 환경 변수 추가 후 반드시 재배포 필요

4. **콘솔 확인**
   - 브라우저 개발자 도구(F12) → Console 탭
   - 오류 메시지 확인

### 로컬 환경에서 테스트

로컬에서는 GitHub API 없이도 작동합니다:
- `node server.js` 실행
- http://localhost:3003/admin.html 접속
- 저장 시 로컬 파일에 직접 저장 + 자동 빌드
