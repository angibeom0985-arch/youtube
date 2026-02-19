import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../../../server/shared/adminAuth.js";
import { supabaseAdmin } from "../../../server/shared/supabase.js";
import { normalizeCouponCode } from "../../../server/shared/couponService.js";
import { syncCouponWhitelistFromCsvUrl } from "../../../server/shared/couponWhitelistSync.js";

type CouponWhitelistRow = {
  id: string;
  email_normalized: string;
  coupon_code: string;
  is_active: boolean;
  expires_at: string | null;
  used_by_user_id: string | null;
  used_at: string | null;
  created_at: string;
  updated_at: string;
};

const parseJsonBody = async (req: VercelRequest): Promise<any> => {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const normalizeEmail = (value: unknown): string => String(value || "").trim().toLowerCase();

const normalizeExpiresAt = (value: unknown): string | null => {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const isWhitelistAuthorized = (req: VercelRequest): boolean => {
  if (requireAdmin(req)) return true;
  const expectedSecret = String(process.env.COUPON_ADMIN_SECRET || "").trim();
  if (!expectedSecret) return false;
  const providedSecret = String(req.headers["x-admin-secret"] || "").trim();
  return Boolean(providedSecret) && providedSecret === expectedSecret;
};

const isSyncAuthorized = (req: VercelRequest): boolean => {
  if (requireAdmin(req)) return true;
  const expected = String(process.env.COUPON_SYNC_SECRET || "").trim();
  if (!expected) return false;
  const received = String(req.headers["x-sync-secret"] || "").trim();
  return Boolean(received) && received === expected;
};

const isSyncPath = (req: VercelRequest): boolean => String(req.url || "").split("?")[0].includes("coupon-whitelist-sync");

async function handleSync(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  if (!isSyncAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const csvUrl = String(process.env.COUPON_WHITELIST_CSV_URL || "").trim();
  if (!csvUrl) {
    res.status(400).json({ error: "missing_coupon_whitelist_csv_url" });
    return;
  }

  try {
    const result = await syncCouponWhitelistFromCsvUrl(csvUrl);
    res.status(200).json({ ok: true, ...result });
  } catch (error: any) {
    console.error("[coupon-whitelist-sync] failed:", error);
    res.status(500).json({
      ok: false,
      error: "sync_failed",
      details: error?.message || "unknown_error",
    });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (isSyncPath(req)) {
    await handleSync(req, res);
    return;
  }

  if (!isWhitelistAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (!supabaseAdmin) {
    res.status(503).json({ error: "supabase_unavailable" });
    return;
  }

  if (req.method === "GET") {
    const limitParam = typeof req.query.limit === "string" ? Number(req.query.limit) : 100;
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 100;
    const email = normalizeEmail(req.query.email);
    const couponCode = normalizeCouponCode(typeof req.query.couponCode === "string" ? req.query.couponCode : "");

    let query = supabaseAdmin
      .from("coupon_whitelist")
      .select("id, email_normalized, coupon_code, is_active, expires_at, used_by_user_id, used_at, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (email) query = query.eq("email_normalized", email);
    if (couponCode) query = query.eq("coupon_code", couponCode);

    const { data, error } = await query;
    if (error) {
      console.error("[coupon-whitelist] list failed:", error);
      res.status(500).json({ error: "list_failed" });
      return;
    }

    res.status(200).json({ rows: (data || []) as CouponWhitelistRow[] });
    return;
  }

  if (req.method === "POST") {
    const body = await parseJsonBody(req);
    if (!body) {
      res.status(400).json({ error: "invalid_json" });
      return;
    }

    const email = normalizeEmail(body.email);
    const couponCode = normalizeCouponCode(body.couponCode || body.coupon_code || "");
    const isActive = body.isActive == null ? true : Boolean(body.isActive);
    const expiresAt = normalizeExpiresAt(body.expiresAt ?? body.expires_at);

    if (!email || !couponCode) {
      res.status(400).json({ error: "missing_email_or_coupon_code" });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("coupon_whitelist")
      .upsert(
        {
          email_normalized: email,
          coupon_code: couponCode,
          is_active: isActive,
          expires_at: expiresAt,
        },
        { onConflict: "email_normalized,coupon_code" }
      )
      .select("id, email_normalized, coupon_code, is_active, expires_at, used_by_user_id, used_at, created_at, updated_at")
      .single();

    if (error) {
      console.error("[coupon-whitelist] upsert failed:", error);
      res.status(500).json({ error: "upsert_failed" });
      return;
    }

    res.status(200).json({ row: data as CouponWhitelistRow });
    return;
  }

  if (req.method === "PATCH") {
    const body = await parseJsonBody(req);
    if (!body) {
      res.status(400).json({ error: "invalid_json" });
      return;
    }

    const id = String(body.id || "").trim();
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }

    const updates: Record<string, any> = {};
    if (body.isActive != null) updates.is_active = Boolean(body.isActive);
    if (body.expiresAt !== undefined || body.expires_at !== undefined) {
      updates.expires_at = normalizeExpiresAt(body.expiresAt ?? body.expires_at);
    }
    if (body.resetUsage === true) {
      updates.used_by_user_id = null;
      updates.used_at = null;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "no_updates" });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("coupon_whitelist")
      .update(updates)
      .eq("id", id)
      .select("id, email_normalized, coupon_code, is_active, expires_at, used_by_user_id, used_at, created_at, updated_at")
      .maybeSingle();

    if (error) {
      console.error("[coupon-whitelist] update failed:", error);
      res.status(500).json({ error: "update_failed" });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.status(200).json({ row: data as CouponWhitelistRow });
    return;
  }

  if (req.method === "DELETE") {
    const body = await parseJsonBody(req);
    if (!body) {
      res.status(400).json({ error: "invalid_json" });
      return;
    }

    const id = String(body.id || "").trim();
    const email = normalizeEmail(body.email);
    const couponCode = normalizeCouponCode(body.couponCode || body.coupon_code || "");

    let query = supabaseAdmin.from("coupon_whitelist").delete();
    if (id) {
      query = query.eq("id", id);
    } else if (email && couponCode) {
      query = query.eq("email_normalized", email).eq("coupon_code", couponCode);
    } else {
      res.status(400).json({ error: "missing_id_or_email_coupon_code" });
      return;
    }

    const { error } = await query;
    if (error) {
      console.error("[coupon-whitelist] delete failed:", error);
      res.status(500).json({ error: "delete_failed" });
      return;
    }

    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "method_not_allowed" });
}
