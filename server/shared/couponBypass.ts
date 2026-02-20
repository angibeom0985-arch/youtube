type CouponMeta = {
  coupon_bypass_credits?: unknown;
  coupon_bypass_enabled_at?: unknown;
  coupon_bypass_expires_at?: unknown;
};

type CouponBypassState = {
  active: boolean;
  expiresAt: string | null;
};

export const COUPON_BYPASS_MONTHS = 2;

const parseTime = (raw: unknown): number => {
  if (typeof raw !== "string" || !raw.trim()) return Number.NaN;
  return new Date(raw).getTime();
};

const toIso = (time: number): string | null => {
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString();
};

export const getCouponBypassState = (metadata: CouponMeta | null | undefined): CouponBypassState => {
  if (!metadata || metadata.coupon_bypass_credits !== true) {
    return { active: false, expiresAt: null };
  }

  const now = Date.now();
  const expiresAtTime = parseTime(metadata.coupon_bypass_expires_at);
  if (Number.isFinite(expiresAtTime)) {
    return {
      active: now <= expiresAtTime,
      expiresAt: toIso(expiresAtTime),
    };
  }

  // Backward compatibility: legacy users might only have enabled_at.
  const enabledAtTime = parseTime(metadata.coupon_bypass_enabled_at);
  if (Number.isFinite(enabledAtTime)) {
    const derived = new Date(enabledAtTime);
    derived.setMonth(derived.getMonth() + COUPON_BYPASS_MONTHS);
    const derivedTime = derived.getTime();
    return {
      active: now <= derivedTime,
      expiresAt: toIso(derivedTime),
    };
  }

  // If coupon was explicitly enabled but date fields are missing, keep bypass on.
  return { active: true, expiresAt: null };
};
