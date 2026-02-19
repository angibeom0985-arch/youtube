# Coupon Whitelist Setup (Supabase Only)

This project can run coupon allowlist without any spreadsheet.
Only users whose email exists in `public.coupon_whitelist` can redeem the coupon.

## 1) Run the SQL migration

Run this file in Supabase SQL Editor:

`youtube/apps/studio/supabase/migrations/20260219_create_coupon_whitelist_table.sql`

It creates the `public.coupon_whitelist` table and indexes.

## 2) Set required environment variables

Set these in Vercel (or your runtime):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COUPON_EMAIL_WHITELIST_REQUIRED=true`

Optional:

- `COUPON_ADMIN_SECRET=<long random secret>` (for admin API calls without admin cookie)
- `CREDIT_COUPONS` or `CREDIT_COUPONS_JSON` (coupon catalog)

Default coupon code already exists in server code:

- `데이비 유튜브 스튜디오 2026`

## 3) Register allowlist rows directly in Supabase

Use Table Editor on `public.coupon_whitelist` and add rows with:

- `email_normalized` (lowercase email)
- `coupon_code` (uppercase, spaces normalized)
- `is_active` (`true` to allow)
- `expires_at` (optional ISO datetime)

Example SQL:

```sql
insert into public.coupon_whitelist (email_normalized, coupon_code, is_active, expires_at)
values
  ('user1@gmail.com', '데이비 유튜브 스튜디오 2026', true, '2026-12-31T23:59:59Z'),
  ('user2@gmail.com', '데이비 유튜브 스튜디오 2026', true, null);
```

## 4) Optional: manage allowlist via admin API

New endpoint:

- `GET/POST/PATCH/DELETE /api/admin/coupon-whitelist`

Auth:

- Admin cookie session, or
- Header `x-admin-secret: <COUPON_ADMIN_SECRET>`

Examples:

```bash
# Create or upsert one row
curl -X POST "https://your-domain.com/api/admin/coupon-whitelist" \
  -H "content-type: application/json" \
  -H "x-admin-secret: YOUR_SECRET" \
  -d "{\"email\":\"user3@gmail.com\",\"couponCode\":\"데이비 유튜브 스튜디오 2026\",\"isActive\":true}"

# List rows
curl "https://your-domain.com/api/admin/coupon-whitelist?limit=50" \
  -H "x-admin-secret: YOUR_SECRET"

# Disable one row
curl -X PATCH "https://your-domain.com/api/admin/coupon-whitelist" \
  -H "content-type: application/json" \
  -H "x-admin-secret: YOUR_SECRET" \
  -d "{\"id\":\"ROW_ID\",\"isActive\":false}"
```

## 5) Runtime behavior

When user calls `POST /api/user/coupon`:

- coupon code must be valid in coupon catalog
- `(user email, coupon code)` must exist in `coupon_whitelist`
- row must be active and not expired
- row is one-time claim (`used_by_user_id`)
- on success, BYOK mode is enabled for 2 months
