import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../../../server/shared/adminAuth.js";
import { syncCouponWhitelistFromCsvUrl } from "../../../server/shared/couponWhitelistSync.js";

const isSyncAuthorized = (req: VercelRequest): boolean => {
  const adminSession = requireAdmin(req);
  if (adminSession) return true;

  const expected = String(process.env.COUPON_SYNC_SECRET || "").trim();
  if (!expected) return false;
  const received = String(req.headers["x-sync-secret"] || "").trim();
  return Boolean(received) && received === expected;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

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

