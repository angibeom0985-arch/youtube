import { supabaseAdmin } from "./supabase.js";
import { normalizeCouponCode } from "./couponService.js";

type CouponWhitelistRow = {
  email_normalized: string;
  coupon_code: string;
  is_active: boolean;
  expires_at: string | null;
};

const normalizeEmail = (raw: unknown): string =>
  String(raw || "")
    .trim()
    .toLowerCase();

const parseBoolean = (raw: string): boolean => {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return true;
  return !["0", "false", "n", "no", "off"].includes(value);
};

const normalizeIsoDate = (raw: string): string | null => {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current.trim());
  return values;
};

const parseCsvRows = (csvText: string): CouponWhitelistRow[] => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const header = parseCsvLine(lines[0]).map((item) => item.toLowerCase());
  const headerMode = header.includes("email") || header.includes("coupon_code");

  const getIndex = (name: string, fallback: number) => {
    const index = header.indexOf(name);
    return index >= 0 ? index : fallback;
  };

  const emailIndex = getIndex("email", 0);
  const codeIndex = getIndex("coupon_code", 1);
  const activeIndex = getIndex("is_active", 2);
  const expiresAtIndex = getIndex("expires_at", 3);
  const startLine = headerMode ? 1 : 0;

  const rows: CouponWhitelistRow[] = [];
  for (let i = startLine; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const email = normalizeEmail(cols[emailIndex] || "");
    const couponCode = normalizeCouponCode(cols[codeIndex] || "");
    if (!email || !couponCode) continue;

    rows.push({
      email_normalized: email,
      coupon_code: couponCode,
      is_active: parseBoolean(cols[activeIndex] || ""),
      expires_at: normalizeIsoDate(cols[expiresAtIndex] || ""),
    });
  }

  return rows;
};

export const syncCouponWhitelistFromCsvUrl = async (csvUrl: string) => {
  if (!supabaseAdmin) {
    throw new Error("supabase_unavailable");
  }

  const response = await fetch(csvUrl, { method: "GET" });
  if (!response.ok) {
    throw new Error(`csv_fetch_failed:${response.status}`);
  }

  const csvText = await response.text();
  const rows = parseCsvRows(csvText);

  if (!rows.length) {
    return { upserted: 0, skipped: 0, totalRows: 0 };
  }

  const { error } = await supabaseAdmin
    .from("coupon_whitelist")
    .upsert(rows, { onConflict: "email_normalized,coupon_code" });

  if (error) {
    throw new Error(`upsert_failed:${error.message}`);
  }

  return { upserted: rows.length, skipped: 0, totalRows: rows.length };
};

