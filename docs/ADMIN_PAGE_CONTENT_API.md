# ê´€ë¦¬ì ?˜ì´ì§€ ?´ìš© ?¸ì§‘ API

## ê°œìš”
ê´€ë¦¬ì ?˜ì´ì§€?ì„œ ?¹ì‚¬?´íŠ¸??ê°€?´ë“œ ?˜ì´ì§€ë¥??¸ì§‘?˜ê³  ?€?¥í•  ???ˆëŠ” API?…ë‹ˆ??

## ?”ë“œ?¬ì¸??
`/api/YOUTUBE/admin/page-content`

## ?”ì²­ ë°©ë²•

### 1. ?˜ì´ì§€ ?´ìš© ë¶ˆëŸ¬?¤ê¸° (GET)
```
GET /api/YOUTUBE/admin/page-content?pageType={pageType}
```

**Query Parameters:**
- `pageType` (required): ?˜ì´ì§€ ?€??
  - `api-guide-aistudio`: AI ?¤íŠœ?”ì˜¤ API ë°œê¸‰ë°©ë²•
  - `api-guide-cloudconsole`: ?´ë¼?°ë“œ ì½˜ì†” API ë°œê¸‰ë°©ë²•

**?±ê³µ ?‘ë‹µ (200):**
```json
{
  "page_type": "api-guide-aistudio",
  "content": "<html content>",
  "mode": "basic",
  "updated_at": "2024-02-08T...",
  "created_at": "2024-02-08T..."
}
```

**?°ì´???†ìŒ (200):**
```json
{
  "page_type": "api-guide-aistudio",
  "content": "",
  "mode": "basic",
  "message": "No content found for this page"
}
```

### 2. ?˜ì´ì§€ ?´ìš© ?€?¥í•˜ê¸?(POST)
```
POST /api/YOUTUBE/admin/page-content?pageType={pageType}
Content-Type: application/json
```

**Query Parameters:**
- `pageType` (required): ?˜ì´ì§€ ?€??

**Request Body:**
```json
{
  "content": "<html content>",
  "mode": "basic",
  "username": "admin"
}
```

**?±ê³µ ?‘ë‹µ (200):**
```json
{
  "success": true,
  "message": "Page content saved successfully",
  "page_type": "api-guide-aistudio",
  "updated_at": "2024-02-08T..."
}
```

## ?¤ë¥˜ ?‘ë‹µ

**400 Bad Request:**
```json
{
  "error": "Invalid request",
  "message": "pageType query parameter is required"
}
```

**400 Bad Request (?˜ëª»???˜ì´ì§€ ?€??:**
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

## ?°ì´?°ë² ?´ìŠ¤ êµ¬ì¡°

### guides ?Œì´ë¸?
```sql
create table guides (
  page_type text primary key,
  data jsonb not null,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
```

**data ?„ë“œ êµ¬ì¡°:**
```json
{
  "content": "HTML ?´ìš©",
  "mode": "basic | html",
  "updated_by": "?¬ìš©?ëª…"
}
```

### ë§ˆì´ê·¸ë ˆ?´ì…˜ ?¤í–‰

**Supabase SQL Editor?ì„œ ?¤í–‰:**

1. `youtube/youtube_script/supabase/migrations/20240204_create_guides_table.sql` ?¤í–‰
2. `youtube/youtube_script/supabase/migrations/20240208_add_guides_trigger.sql` ?¤í–‰ (updated_at ?ë™ ?…ë°?´íŠ¸)

?ëŠ” Supabase CLI ?¬ìš©:
```bash
npx supabase db push
```

## ë³´ì•ˆ ?¬í•­

### ?„ì¬ êµ¬í˜„
- ??CORS ?¤ì •??
- ???˜ì´ì§€ ?€???”ì´?¸ë¦¬?¤íŠ¸ ê²€ì¦?
- ???”ì²­ ë³¸ë¬¸ ? íš¨??ê²€??
- ? ï¸ ?„ë¡ ?¸ì—”???¸ì¦ë§??¬ìš© ì¤?(sessionStorage)

### ?¥í›„ ê°œì„  ?¬í•­
- [ ] JWT ? í° ê¸°ë°˜ ?¸ì¦ ì¶”ê?
- [ ] Supabase RLS ?•ì±… ê°•í™”
- [ ] ê´€ë¦¬ì ê¶Œí•œ ?Œì´ë¸?ì¶”ê?
- [ ] ?”ì²­ ?œí•œ(Rate Limiting) ì¶”ê?

## ?¬ìš© ?ˆì‹œ

### JavaScript (Fetch API)
```javascript
// ?˜ì´ì§€ ?´ìš© ë¶ˆëŸ¬?¤ê¸°
const response = await fetch('/api/YOUTUBE/admin/page-content?pageType=api-guide-aistudio');
const data = await response.json();
console.log(data.content);

// ?˜ì´ì§€ ?´ìš© ?€?¥í•˜ê¸?
const saveResponse = await fetch('/api/YOUTUBE/admin/page-content?pageType=api-guide-aistudio', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: '<h1>?ˆë¡œ???´ìš©</h1>',
    mode: 'html',
    username: 'admin'
  })
});
const saveResult = await saveResponse.json();
console.log(saveResult.message);
```

## ê´€ë¦¬ì ?˜ì´ì§€ ?¬ìš©ë²?

1. `/admin.html` ?‘ì†
2. ë¡œê·¸??(akb0811 / rlqja0985!)
3. ?˜ì´ì§€ ? íƒ ?œë¡­?¤ìš´?ì„œ ?¸ì§‘???˜ì´ì§€ ? íƒ
4. ?´ìš©???ë™?¼ë¡œ ë¡œë“œ??
5. ê¸°ë³¸ëª¨ë“œ ?ëŠ” HTMLëª¨ë“œë¡??¸ì§‘
6. "?€?? ë²„íŠ¼ ?´ë¦­
7. ?°ì´?°ë² ?´ìŠ¤???€?¥ë¨

## ë¬¸ì œ ?´ê²°

### ?˜ì´ì§€ ?´ìš©??ë¡œë“œ?˜ì? ?ŠëŠ” ê²½ìš°
1. ë¸Œë¼?°ì? ì½˜ì†”?ì„œ API ?”ì²­ ?•ì¸
2. Supabase ?°ê²° ?•ì¸
3. ?˜ê²½ ë³€???•ì¸ (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

### ?€?¥ì´ ?¤íŒ¨?˜ëŠ” ê²½ìš°
1. ì½˜ì†”?ì„œ ?¤ë¥˜ ë©”ì‹œì§€ ?•ì¸
2. contentê°€ ë¹„ì–´?ˆì? ?Šì?ì§€ ?•ì¸
3. pageType???¬ë°”ë¥¸ì? ?•ì¸
4. Supabase ?Œì´ë¸?ê¶Œí•œ ?•ì¸

