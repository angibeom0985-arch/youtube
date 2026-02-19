# Coupon Whitelist Setup (Spreadsheet -> Supabase)

This project now supports coupon application only for approved emails.

## 1) Run SQL migration in Supabase

Run:

`youtube/apps/studio/supabase/migrations/20260219_create_coupon_whitelist_table.sql`

This creates `public.coupon_whitelist`.

## 2) Prepare spreadsheet columns

Use these headers in the first row:

- `email`
- `coupon_code`
- `is_active` (optional, default true)
- `expires_at` (optional, ISO date)

Example:

```csv
email,coupon_code,is_active,expires_at
user1@gmail.com,데이비 유튜브 스튜디오 2026,true,2026-12-31T23:59:59Z
user2@gmail.com,데이비 유튜브 스튜디오 2026,true,
```

## 3) Publish the sheet as CSV URL

- Google Sheet -> File -> Share -> Publish to web
- Publish selected sheet as CSV
- Copy the CSV URL

## 4) Set environment variables

- `COUPON_EMAIL_WHITELIST_REQUIRED=true`
- `COUPON_WHITELIST_CSV_URL=<your published csv url>`
- `COUPON_SYNC_SECRET=<random-long-secret>`

## 5) Sync from sheet to Supabase

Call:

`POST /api/admin/coupon-whitelist-sync`

Authentication methods:

- Admin session cookie (logged-in admin), or
- Header: `x-sync-secret: <COUPON_SYNC_SECRET>`

## 6) Coupon apply behavior

When user calls `POST /api/user/coupon`:

- coupon code must be valid
- user email + coupon code must exist in `coupon_whitelist`
- row must be active and not expired
- row can be claimed once (`used_by_user_id`)
- then coupon bypass is enabled for 2 months

## Notes

- This is not fully “real-person” verification. It is “approved-email” verification.
- For stronger anti-abuse, add phone verification and track `phone_hash`.
