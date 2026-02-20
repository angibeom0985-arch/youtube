import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseUser, supabaseAdmin } from "../shared/supabase.js";
import { normalizeCouponCode, validateCoupon } from "../shared/couponService.js";
import { COUPON_BYPASS_MONTHS } from "../shared/couponBypass.js";

const parseJsonBody = async (req: VercelRequest): Promise<any> => {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
};

export default async function userCouponHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  const authResult = await getSupabaseUser(token);
  const user = authResult.user as any;
  const client = authResult.client as any;

  if (!user || !client) {
    return res.status(401).json({ message: "Invalid token" });
  }

  let body: any = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    return res.status(400).json({ message: "invalid_json" });
  }

  const code = typeof body?.code === "string" ? body.code : "";
  const couponCheck = validateCoupon(code);
  if (!couponCheck.ok) {
    return res.status(400).json({ message: couponCheck.reason });
  }

  const coupon = couponCheck.coupon;
  const whitelistRequired = process.env.COUPON_EMAIL_WHITELIST_REQUIRED !== "false";
  const normalizedEmail = String(user?.email || "").trim().toLowerCase();
  const normalizedCode = normalizeCouponCode(coupon.code);

  let lockedWhitelistId: string | null = null;

  if (whitelistRequired) {
    if (!normalizedEmail) {
      return res.status(400).json({ message: "missing_user_email" });
    }
    if (!supabaseAdmin) {
      return res.status(503).json({ message: "coupon_whitelist_unavailable" });
    }

    const whitelistLookup = await supabaseAdmin
      .from("coupon_whitelist")
      .select("id, is_active, expires_at, used_by_user_id")
      .eq("email_normalized", normalizedEmail)
      .eq("coupon_code", normalizedCode)
      .maybeSingle();

    if (whitelistLookup.error) {
      console.error("[coupon] whitelist lookup failed:", whitelistLookup.error);
      return res.status(500).json({ message: "coupon_whitelist_lookup_failed" });
    }

    const row = whitelistLookup.data as any;
    if (!row || row.is_active === false) {
      return res.status(403).json({ message: "coupon_not_whitelisted" });
    }

    if (row.expires_at) {
      const expireTime = new Date(row.expires_at).getTime();
      if (Number.isFinite(expireTime) && Date.now() > expireTime) {
        return res.status(400).json({ message: "coupon_expired" });
      }
    }

    if (row.used_by_user_id && row.used_by_user_id !== user.id) {
      return res.status(409).json({ message: "coupon_already_used" });
    }

    if (!row.used_by_user_id) {
      const reserve = await supabaseAdmin
        .from("coupon_whitelist")
        .update({ used_by_user_id: user.id, used_at: new Date().toISOString() })
        .eq("id", row.id)
        .is("used_by_user_id", null)
        .select("id")
        .maybeSingle();

      if (reserve.error) {
        console.error("[coupon] whitelist reserve failed:", reserve.error);
        return res.status(500).json({ message: "coupon_reserve_failed" });
      }
      if (!reserve.data) {
        return res.status(409).json({ message: "coupon_already_used" });
      }
      lockedWhitelistId = String(reserve.data.id);
    }
  }

  const metadata = user.user_metadata || {};
  const redeemedCoupons = Array.isArray(metadata.redeemed_coupons)
    ? metadata.redeemed_coupons.filter((item: unknown) => typeof item === "string")
    : [];
  if (redeemedCoupons.includes(coupon.code)) {
    return res.status(409).json({ message: "coupon_already_used" });
  }
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + COUPON_BYPASS_MONTHS);

  const nextMeta = {
    ...metadata,
    redeemed_coupons: [...redeemedCoupons, coupon.code],
    coupon_bypass_credits: true,
    coupon_bypass_enabled_at: now.toISOString(),
    coupon_bypass_expires_at: expiresAt.toISOString(),
  };

  const metadataUpdate = authResult.usingAdmin
    ? await client.auth.admin.updateUserById(user.id, { user_metadata: nextMeta })
    : await client.auth.updateUser({ data: nextMeta });

  if (metadataUpdate.error) {
    if (lockedWhitelistId && supabaseAdmin) {
      await supabaseAdmin
        .from("coupon_whitelist")
        .update({ used_by_user_id: null, used_at: null })
        .eq("id", lockedWhitelistId)
        .eq("used_by_user_id", user.id);
    }
    return res.status(500).json({ message: "metadata_update_failed", details: metadataUpdate.error.message });
  }

  return res.status(200).json({
    message: "coupon_applied",
    couponBypassCredits: true,
    code: coupon.code,
    bypassExpiresAt: expiresAt.toISOString(),
  });
}
