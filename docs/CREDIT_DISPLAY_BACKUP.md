# ?¬ë ˆ???œì‹œ ì½”ë“œ ë°±ì—…

???Œì¼?€ ê°?ê¸°ëŠ¥ ë²„íŠ¼ ?†ì— ?œì‹œ?˜ë˜ ?¬ë ˆ???•ë³´ë¥?ë°±ì—…??ê²ƒì…?ˆë‹¤.
?˜ì¤‘???¤ì‹œ êµ¬í˜„????ì°¸ê³ ?˜ì„¸??

## ë°±ì—… ?¼ì‹œ
2026??1??20??

## ë°±ì—…??ì½”ë“œ

### 1. ?¡ìƒ ?´ìœ  ë¶„ì„?˜ê¸° ë²„íŠ¼
**?Œì¼**: `youtube/youtube_script/src/App.tsx`
**?¼ì¸**: 1774
```tsx
<button
  onClick={handleAnalyze}
  disabled={isAnalyzing || !transcript}
  className="w-full mt-4 bg-gradient-to-br from-orange-600 to-orange-500 text-white font-bold py-3 px-4 rounded-lg hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
>
  {isAnalyzing ? "ë¶„ì„ ì¤?.." : "?¡ìƒ ?´ìœ  ë¶„ì„?˜ê¸° (1 ?’)"}
</button>
```

**?¬ë ˆ??ë¹„ìš©**: 1 ?¬ë ˆ??

---

### 2. ?„ì´?”ì–´ ?ˆë¡œê³ ì¹¨ ë²„íŠ¼
**?Œì¼**: `youtube/youtube_script/src/App.tsx`
**?¼ì¸**: 2074
```tsx
<button
  onClick={handleRefreshIdeas}
  disabled={isGeneratingIdeas || !analysisResult}
  className="text-sm font-medium text-orange-500 hover:text-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
>
  ?ˆë¡œê³ ì¹¨ (1 ?’)
</button>
```

**?¬ë ˆ??ë¹„ìš©**: 1 ?¬ë ˆ??

---

### 3. ?˜ë§Œ???¡ìƒ ê¸°íš???‘ì„± ë²„íŠ¼
**?Œì¼**: `youtube/youtube_script/src/App.tsx`
**?¼ì¸**: 2194
```tsx
<button
  onClick={handleGenerate}
  disabled={isGenerating || !newKeyword || !analysisResult}
  className="w-full bg-gradient-to-br from-orange-600 to-orange-500 text-white font-bold py-3 px-6 rounded-lg hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
>
  {isGenerating ? "?ì„± ì¤?.." : "?˜ë§Œ???¡ìƒ ê¸°íš???‘ì„± (10 ?’)"}
</button>
```

**?¬ë ˆ??ë¹„ìš©**: 10 ?¬ë ˆ??

---

### 4. ì±•í„° ?€ë³??ì„±?˜ê¸° ë²„íŠ¼
**?Œì¼**: `youtube/youtube_script/src/App.tsx`
**?¼ì¸**: 2542
```tsx
<button
  onClick={() => handleGenerateChapterScript(newPlan.chapters[index + 1].id)}
  className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
>
  <FiCpu />
  <span>ì±•í„° {index + 2} ?€ë³??ì„±?˜ê¸° (5 ?’)</span>
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
</button>
```

**?¬ë ˆ??ë¹„ìš©**: 5 ?¬ë ˆ??

---

## ?¬ë ˆ??ë¹„ìš© ?”ì•½

| ê¸°ëŠ¥ | ?¬ë ˆ??ë¹„ìš© | ?„ì¹˜ |
|------|-------------|------|
| ?¡ìƒ ?´ìœ  ë¶„ì„?˜ê¸° | 1 ?’ | App.tsx:1774 |
| ?„ì´?”ì–´ ?ˆë¡œê³ ì¹¨ | 1 ?’ | App.tsx:2074 |
| ?˜ë§Œ???¡ìƒ ê¸°íš???‘ì„± | 10 ?’ | App.tsx:2194 |
| ì±•í„° ?€ë³??ì„±?˜ê¸° | 5 ?’ | App.tsx:2542 |

---

## êµ¬í˜„ ??ì°¸ê³ ?¬í•­

### ë²„íŠ¼ ?ìŠ¤???¨í„´
- ê¸°ë³¸: `"ê¸°ëŠ¥ëª?(?¬ë ˆ???’)"`
- ë¡œë”© ì¤? `"ì§„í–‰ ì¤?.."`
- ?ˆì‹œ: `{isAnalyzing ? "ë¶„ì„ ì¤?.." : "?¡ìƒ ?´ìœ  ë¶„ì„?˜ê¸° (1 ?’)"}`

### ?¤í????´ë˜??
```tsx
className="w-full bg-gradient-to-br from-orange-600 to-orange-500 text-white font-bold py-3 px-4 rounded-lg hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
```

### disabled ì¡°ê±´
- ë¡œë”© ì¤‘ì´ê±°ë‚˜
- ?„ìˆ˜ ?…ë ¥ê°’ì´ ?†ê±°??
- ?´ì „ ?¨ê³„ê°€ ?„ë£Œ?˜ì? ?Šì? ê²½ìš°

---

## ?¤ì‹œ êµ¬í˜„?????´ì•¼ ????

1. ê°?ë²„íŠ¼ ?ìŠ¤?¸ì— ?¬ë ˆ???•ë³´ ì¶”ê? (??ì½”ë“œ ì°¸ì¡°)
2. ?¬ë ˆ??ì°¨ê° ë¡œì§???œë?ë¡??‘ë™?˜ëŠ”ì§€ ?•ì¸
3. ?¬ë ˆ??ë¶€ì¡????ì ˆ???ëŸ¬ ë©”ì‹œì§€ ?œì‹œ
4. ?¬ìš©?ì—ê²??¬ë ˆ??ë¹„ìš©??ëª…í™•???ˆë‚´
5. ?¬ë ˆ??ê°±ì‹  ?´ë²¤??ë°œìƒ ?•ì¸

---

## ê´€???Œì¼
- `youtube/youtube_script/src/App.tsx` - ë©”ì¸ ??ì»´í¬?ŒíŠ¸
- `youtube/youtube_script/src/components/UserCreditToolbar.tsx` - ?¬ë ˆ???œì‹œ ?´ë°”
- `youtube/youtube_script/src/components/UserCreditSidebar.tsx` - ?¬ë ˆ???¬ì´?œë°”
- `api/YOUTUBE/user/credits.ts` - ?¬ë ˆ??API

---

## Git ì»¤ë°‹ ?•ë³´
- ë°±ì—… ? ì§œ: 2026??1??20??
- ë§ˆì?ë§?ì»¤ë°‹: fix: API ???…ë ¥ ?„ì¹˜ë¥?'?¡ìƒ ?ìƒ??ë¶„ì„?˜ê³ ~' ?ìŠ¤???„ë˜ë¡??´ë™
- ë¦¬í¬ì§€? ë¦¬: https://github.com/angibeom0985-arch/youtube

