import type { VercelRequest } from "@vercel/node";
import { createHash } from "crypto";
import { supabaseAdmin } from "./supabase";

const HASH_SALT = process.env.ABUSE_HASH_SALT || "local_dev_salt";

const getClientIp = (req: VercelRequest): string | null => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded == "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket?.remoteAddress || null;
};

const hashValue = (value: string | null): string | null => {
  if (!value) return null;
  return createHash("sha256").update(`${value}:${HASH_SALT}`).digest("hex");
};

const BLOCKED_ACTIONS = new Set([
  "generateNewPlan",
  "generateChapterOutline",
  "generateChapterScript",
]);

export const enforceAbusePolicy = async (req: VercelRequest, action: string) => {
  const ip = getClientIp(req);
  const ipHash = hashValue(ip);

  if (!ipHash) {
    return { allowed: true };
  }

  const { data, error } = await supabaseAdmin
    .from("abuse_events")
    .select("risk_label, created_at")
    .eq("ip_hash", ipHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Abuse policy lookup failed", error);
    return { allowed: true };
  }

  const label = data?.risk_label;
  if (label == "abusive") {
    return { allowed: false, status: 403, reason: "abuse_blocked" };
  }

  if (label == "suspicious" && BLOCKED_ACTIONS.has(action)) {
    return { allowed: false, status: 429, reason: "abuse_limited" };
  }

  return { allowed: true };
};
