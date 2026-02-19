import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseUser } from "../../../server/shared/supabase.js";
import { validateCoupon } from "../../../server/shared/couponService.js";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
  const metadata = user.user_metadata || {};
  const redeemedCoupons = Array.isArray(metadata.redeemed_coupons)
    ? metadata.redeemed_coupons.filter((item: unknown) => typeof item === "string")
    : [];
  if (redeemedCoupons.includes(coupon.code)) {
    return res.status(409).json({ message: "coupon_already_used" });
  }

  const nextMeta = {
    ...metadata,
    redeemed_coupons: [...redeemedCoupons, coupon.code],
    coupon_bypass_credits: true,
    coupon_bypass_enabled_at: new Date().toISOString(),
  };

  const metadataUpdate = authResult.usingAdmin
    ? await client.auth.admin.updateUserById(user.id, { user_metadata: nextMeta })
    : await client.auth.updateUser({ data: nextMeta });

  if (metadataUpdate.error) {
    return res.status(500).json({ message: "metadata_update_failed", details: metadataUpdate.error.message });
  }

  return res.status(200).json({
    message: "coupon_applied",
    couponBypassCredits: true,
    code: coupon.code,
  });
}
