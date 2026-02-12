# Project Structure Guide

이 문서는 현재 저장소에서 "실행 코드"와 "보관 코드"를 빠르게 구분하기 위한 기준입니다.

## Runtime (Primary)

- `youtube_script/`
  - 메인 프론트엔드 앱(Vite/React).
  - 실제 UI 페이지/컴포넌트는 `youtube_script/src/`에 위치.
- `api/`
  - Vercel 서버리스 API.
  - `_lib/`는 공통 서비스 레이어.
- `youtube/`
  - 로컬 운영/관리용 스크립트 및 서버 파일(`admin-server.js` 포함).

## Supporting

- `docs/`
  - 운영/배포/API 키 관련 문서.
- `tests/`
  - 테스트 자원.
- `scripts/`
  - 저장소 공통 자동화 스크립트(예: `finish.mjs`).

## Archived (Not Runtime)

- `archive/youtube_script/backup_credit_old/`
  - 과거 백업 소스.
- `archive/youtube_script/snapshots/`
  - 스냅샷 파일(`geminiService.ts.backup` 등).
- `archive/reports/`
  - 과거 진단/출력 로그(`youtube_script_tsc_output.txt` 등).

## Notes

- `youtube_script/backup_credit`는 비어 있는 과거 경로 잔여 폴더입니다.
- Machine ID/라이선스 관련 파일(`license_check.py`, `register_license.py`, `Auto_Naver_Blog_V5.1.py`, `setting/`)은 보호 대상이며 구조 변경 대상에서 제외합니다.

