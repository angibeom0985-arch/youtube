# Project Structure Guide

This file defines which paths are runtime code vs archive assets.

## Runtime

- `youtube/`
  - Main workspace for YouTube-related code.
  - `youtube/youtube_script/`: Vite + React frontend.
    - `youtube/youtube_script/src/features/`: feature-based page modules.
      - `admin`, `api-guide`, `benchmarking`, `debug`, `download`, `guide`, `home`, `mypage`, `script`, `tts`, `image`.
      - Each feature keeps route-level screens under `pages/`.
    - `youtube/youtube_script/src/components/`, `services/`, `utils/`, `types.ts`: shared cross-feature modules.
  - `youtube/admin-server.js`: local admin helper server.
  - `youtube/api_guide/`: API guide assets/docs.
  - `youtube/youtube_benchmarking/`: legacy benchmarking app kept under YouTube scope.
  - `youtube/tests/`: local test assets.
  - `youtube/config/`: local config files.
- `api/`
  - Vercel serverless APIs used by the app.
- `docs/`
  - Shared documentation.
- `scripts/`
  - Repository automation scripts (for example `finish.mjs`).

## Archive

- `archive/youtube_script/backup_credit_old/`
  - Old backup source set.
- `archive/youtube_script/snapshots/`
  - Snapshot files.
- `archive/reports/`
  - Old reports/log outputs.

## Protected Files

These files are excluded from structural cleanup unless explicitly approved:

- `license_check.py`
- `register_license.py`
- `Auto_Naver_Blog_V5.1.py`
- `setting/`
