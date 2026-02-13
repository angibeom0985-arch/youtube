import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseUser } from "../../../server/shared/supabase.js";

const parseJsonBody = async (req: VercelRequest): Promise<any> => {
    if (req.body && typeof req.body === "object") {
        return req.body;
    }

    if (typeof req.body === "string") {
        return JSON.parse(req.body);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }

    const raw = Buffer.concat(chunks).toString("utf8").trim();
    if (!raw) return {};
    return JSON.parse(raw);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { user, client } = await getSupabaseUser(token);

    if (!user || !client) {
        return res.status(401).json({ message: "Invalid token" });
    }

    if (req.method === "GET") {
        const { data, error } = await client
            .from("profiles")
            .select("gemini_api_key, google_credit_json")
            .eq("id", user.id)
            .single();

        if (error) {
            console.error("Error fetching user settings:", error);
            return res.status(500).json({ message: "Failed to fetch settings" });
        }

        return res.status(200).json({
            gemini_api_key: data?.gemini_api_key || "",
            google_credit_json: data?.google_credit_json || null,
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

        const updates: any = {};
        if (gemini_api_key !== undefined) {
            updates.gemini_api_key =
                typeof gemini_api_key === "string" ? gemini_api_key.trim() : gemini_api_key;
        }
        if (google_credit_json !== undefined) {
            updates.google_credit_json = google_credit_json;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "no_updates" });
        }

        const { error } = await client
            .from("profiles")
            .update(updates)
            .eq("id", user.id);

        if (error) {
            console.error("Error updating user settings:", error);
            return res.status(500).json({
                message: "Failed to update settings",
                details: error.message,
                code: (error as any).code,
            });
        }

        return res.status(200).json({ message: "Settings updated successfully" });
    }

    return res.status(405).json({ message: "Method not allowed" });
}