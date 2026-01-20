# 크레딧 표시 코드 백업

이 파일은 각 기능 버튼 옆에 표시되던 크레딧 정보를 백업한 것입니다.
나중에 다시 구현할 때 참고하세요.

## 백업 일시
2026년 1월 20일

## 백업된 코드

### 1. 떡상 이유 분석하기 버튼
**파일**: `youtube_script/src/App.tsx`
**라인**: 1774
```tsx
<button
  onClick={handleAnalyze}
  disabled={isAnalyzing || !transcript}
  className="w-full mt-4 bg-gradient-to-br from-orange-600 to-orange-500 text-white font-bold py-3 px-4 rounded-lg hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
>
  {isAnalyzing ? "분석 중..." : "떡상 이유 분석하기 (1 💎)"}
</button>
```

**크레딧 비용**: 1 크레딧

---

### 2. 아이디어 새로고침 버튼
**파일**: `youtube_script/src/App.tsx`
**라인**: 2074
```tsx
<button
  onClick={handleRefreshIdeas}
  disabled={isGeneratingIdeas || !analysisResult}
  className="text-sm font-medium text-orange-500 hover:text-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
>
  새로고침 (1 💎)
</button>
```

**크레딧 비용**: 1 크레딧

---

### 3. 나만의 떡상 기획안 작성 버튼
**파일**: `youtube_script/src/App.tsx`
**라인**: 2194
```tsx
<button
  onClick={handleGenerate}
  disabled={isGenerating || !newKeyword || !analysisResult}
  className="w-full bg-gradient-to-br from-orange-600 to-orange-500 text-white font-bold py-3 px-6 rounded-lg hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
>
  {isGenerating ? "생성 중..." : "나만의 떡상 기획안 작성 (10 💎)"}
</button>
```

**크레딧 비용**: 10 크레딧

---

### 4. 챕터 대본 생성하기 버튼
**파일**: `youtube_script/src/App.tsx`
**라인**: 2542
```tsx
<button
  onClick={() => handleGenerateChapterScript(newPlan.chapters[index + 1].id)}
  className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
>
  <FiCpu />
  <span>챕터 {index + 2} 대본 생성하기 (5 💎)</span>
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
</button>
```

**크레딧 비용**: 5 크레딧

---

## 크레딧 비용 요약

| 기능 | 크레딧 비용 | 위치 |
|------|-------------|------|
| 떡상 이유 분석하기 | 1 💎 | App.tsx:1774 |
| 아이디어 새로고침 | 1 💎 | App.tsx:2074 |
| 나만의 떡상 기획안 작성 | 10 💎 | App.tsx:2194 |
| 챕터 대본 생성하기 | 5 💎 | App.tsx:2542 |

---

## 구현 시 참고사항

### 버튼 텍스트 패턴
- 기본: `"기능명 (크레딧 💎)"`
- 로딩 중: `"진행 중..."`
- 예시: `{isAnalyzing ? "분석 중..." : "떡상 이유 분석하기 (1 💎)"}`

### 스타일 클래스
```tsx
className="w-full bg-gradient-to-br from-orange-600 to-orange-500 text-white font-bold py-3 px-4 rounded-lg hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
```

### disabled 조건
- 로딩 중이거나
- 필수 입력값이 없거나
- 이전 단계가 완료되지 않은 경우

---

## 다시 구현할 때 해야 할 일

1. 각 버튼 텍스트에 크레딧 정보 추가 (위 코드 참조)
2. 크레딧 차감 로직이 제대로 작동하는지 확인
3. 크레딧 부족 시 적절한 에러 메시지 표시
4. 사용자에게 크레딧 비용을 명확히 안내
5. 크레딧 갱신 이벤트 발생 확인

---

## 관련 파일
- `youtube_script/src/App.tsx` - 메인 앱 컴포넌트
- `youtube_script/src/components/UserCreditToolbar.tsx` - 크레딧 표시 툴바
- `youtube_script/src/components/UserCreditSidebar.tsx` - 크레딧 사이드바
- `api/YOUTUBE/user/credits.ts` - 크레딧 API

---

## Git 커밋 정보
- 백업 날짜: 2026년 1월 20일
- 마지막 커밋: fix: API 키 입력 위치를 '떡상 영상을 분석하고~' 텍스트 아래로 이동
- 리포지토리: https://github.com/angibeom0985-arch/youtube
