type CouponConfig = {
  code: string;
  credits: number;
  expiresAt?: string;
};

const parseCsvCoupons = (raw: string): CouponConfig[] => {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [codeRaw, creditsRaw, expiresAtRaw] = entry.split(":").map((v) => v.trim());
      const credits = Number(creditsRaw);
      if (!codeRaw || !Number.isFinite(credits) || credits <= 0) {
        return null;
      }
      return {
        code: codeRaw.toUpperCase(),
        credits,
        expiresAt: expiresAtRaw || undefined,
      } as CouponConfig;
    })
    .filter((item): item is CouponConfig => Boolean(item));
};

const parseJsonCoupons = (raw: string): CouponConfig[] => {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const code = typeof item?.code === "string" ? item.code.trim().toUpperCase() : "";
        const credits = Number(item?.credits);
        const expiresAt = typeof item?.expiresAt === "string" ? item.expiresAt.trim() : undefined;
        if (!code || !Number.isFinite(credits) || credits <= 0) return null;
        return { code, credits, expiresAt } as CouponConfig;
      })
      .filter((item): item is CouponConfig => Boolean(item));
  } catch {
    return [];
  }
};

export const getCouponCatalog = (): Record<string, CouponConfig> => {
  const jsonRaw = process.env.CREDIT_COUPONS_JSON || "";
  const csvRaw = process.env.CREDIT_COUPONS || "";
  const list = jsonRaw ? parseJsonCoupons(jsonRaw) : parseCsvCoupons(csvRaw);
  return list.reduce<Record<string, CouponConfig>>((acc, item) => {
    acc[item.code] = item;
    return acc;
  }, {});
};

export const validateCoupon = (codeRaw: string) => {
  const code = String(codeRaw || "").trim().toUpperCase();
  if (!code) return { ok: false as const, reason: "invalid_code" };

  const catalog = getCouponCatalog();
  const coupon = catalog[code];
  if (!coupon) return { ok: false as const, reason: "coupon_not_found" };

  if (coupon.expiresAt) {
    const expiry = new Date(coupon.expiresAt);
    if (!Number.isNaN(expiry.getTime()) && Date.now() > expiry.getTime()) {
      return { ok: false as const, reason: "coupon_expired" };
    }
  }

  return { ok: true as const, coupon };
};
