# Agent Instructions / 에이전트 지침
## Protected: Machine ID / License Logic
## 보호 대상: 머신 ID / 라이선스 로직

**English**
- Do not modify any Machine ID or license enforcement logic without explicit user consent.
- This includes file changes, refactors, data-path changes, or edits that affect how machine IDs are generated, stored, verified, or displayed.
- If a task would touch this area, stop and ask for confirmation first, even if you have broad permissions.

**Korean (한국어)**
- 사용자의 명시적인 동의 없이 머신 ID(기기 고유값) 또는 라이선스 강제 로직을 절대로 수정하지 마세요.
- 파일 변경, 리팩터링, 데이터 경로 변경, 머신 ID 생성/저장/검증/표시 방식에 영향을 주는 모든 수정이 포함됩니다.
- 작업이 이 영역을 건드릴 가능성이 있으면, 권한이 넓더라도 먼저 멈추고 확인을 요청하세요.

### Protected paths (non-exhaustive) / 보호 대상 경로 (예시)
- `license_check.py`
- `register_license.py`
- `Auto_Naver_Blog_V5.1.py` (Machine ID 관련 UI/로직)
- `setting` (라이선스/머신 ID 관련 데이터)
- Any file containing "machine_id", "머신 ID", or "머신ID"
- "machine_id", "머신 ID", "머신ID"가 포함된 모든 파일
