import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseUser } from "../../../server/shared/supabase.js";

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

const isMissingColumnError = (error: any, column: string) => {
  const msg = String(error?.message || "").toLowerCase();
  const normalized = column.replace(/_/g, " ");
  return msg.includes(column.toLowerCase()) || msg.includes(normalized);
};

const isNoRowsError = (error: any) => {
  const code = String(error?.code || "");
  const msg = String(error?.message || "").toLowerCase();
  return code === "PGRST116" || msg.includes("no rows");
};

const isPermissionError = (error: any) => {
  const code = String(error?.code || "");
  const msg = String(error?.message || "").toLowerCase();
  return (
    code === "42501" ||
    msg.includes("not allowed") ||
    msg.includes("permission denied") ||
    msg.includes("row-level security") ||
    msg.includes("violates row-level security")
  );
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.replace("Bearer ", "");
  const authResult = await getSupabaseUser(token);
  const user = authResult.user as any;
  const client = authResult.client as any;

  if (!user || !client) return res.status(401).json({ message: "Invalid token" });

  if (req.method === "GET") {
    let geminiApiKey = "";
    let googleCreditJson: any = null;

    const profileSelect = await client
      .from("profiles")
      .select("gemini_api_key, google_credit_json")
      .eq("id", user.id)
      .single();

    if (
      profileSelect.error &&
      !isNoRowsError(profileSelect.error) &&
      !isMissingColumnError(profileSelect.error, "gemini_api_key")
    ) {
      console.error("Error fetching user settings:", profileSelect.error);
      return res.status(500).json({ message: "Failed to fetch settings", details: profileSelect.error.message });
    }

    if (profileSelect.data) {
      geminiApiKey =
        typeof profileSelect.data.gemini_api_key === "string" ? profileSelect.data.gemini_api_key : "";
      googleCreditJson = profileSelect.data.google_credit_json ?? null;
    }

    const metadata = user.user_metadata || {};
    if (!geminiApiKey && typeof metadata.gemini_api_key === "string") {
      geminiApiKey = metadata.gemini_api_key;
    }
    if (!googleCreditJson && metadata.google_credit_json !== undefined) {
      googleCreditJson = metadata.google_credit_json;
    }
    const couponBypassCredits = metadata.coupon_bypass_credits === true;

    return res.status(200).json({
      gemini_api_key: geminiApiKey,
      google_credit_json: googleCreditJson,
      coupon_bypass_credits: couponBypassCredits,
    });
  }

  if (req.method === "POST") {
    let body: any = {};
    try {
      body = await parseJsonBody(req);
    } catch {
      return res.status(400).json({ message: "invalid_json" });
    }

    const { gemini_api_key, google_credit_json } = body ?? {};
    if (gemini_api_key === undefined && google_credit_json === undefined) {
      return res.status(400).json({ message: "no_updates" });
    }

    const updates: any = {};
    if (gemini_api_key !== undefined) {
      updates.gemini_api_key =
        typeof gemini_api_key === "string" ? gemini_api_key.trim() : gemini_api_key;
    }
    if (google_credit_json !== undefined) {
      updates.google_credit_json = google_credit_json;
    }

    let profileUpdateError: any = null;
    if (Object.keys(updates).length > 0) {
      const profileUpdate = await client.from("profiles").update(updates).eq("id", user.id);
      profileUpdateError = profileUpdate.error;
    }

    const shouldUseMetadataFallback =
      profileUpdateError &&
      (isMissingColumnError(profileUpdateError, "gemini_api_key") ||
        isMissingColumnError(profileUpdateError, "google_credit_json") ||
        isPermissionError(profileUpdateError));

    if (profileUpdateError && !shouldUseMetadataFallback) {
      console.error("Error updating user settings:", profileUpdateError);
      return res.status(500).json({
        message: "Failed to update settings",
        details: profileUpdateError.message,
        code: profileUpdateError.code,
      });
    }

    if (shouldUseMetadataFallback) {
      const currentMeta = user.user_metadata || {};
      const nextMeta: Record<string, unknown> = { ...currentMeta };
      if (gemini_api_key !== undefined) {
        nextMeta.gemini_api_key =
          typeof gemini_api_key === "string" ? gemini_api_key.trim() : gemini_api_key;
      }
      if (google_credit_json !== undefined) {
        nextMeta.google_credit_json = google_credit_json;
      }

      const metadataUpdate = authResult.usingAdmin
        ? await client.auth.admin.updateUserById(user.id, { user_metadata: nextMeta })
        : await client.auth.updateUser({ data: nextMeta });
      if (metadataUpdate.error) {
        console.error("Error updating user metadata settings:", metadataUpdate.error);
        return res.status(500).json({
          message: "Failed to update settings",
          details: metadataUpdate.error.message,
          code: metadataUpdate.error.code,
        });
      }
    }

    return res.status(200).json({ message: "Settings updated successfully" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
