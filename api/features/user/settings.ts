import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseUser } from "../../shared/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 1. Auth Check
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { user, client } = await getSupabaseUser(token);

    if (!user || !client) {
        return res.status(401).json({ message: "Invalid token" });
    }

    // 2. GET: Fetch current settings (partial)
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

        // Mask the keys for security, or send them back so the user knows they are set?
        // Usually we send back a "masked" version or just a boolean "isSet".
        // For this simple implementation, users might want to see/edit them. 
        // Sending them back is risky if XSS.
        // Let's send back actual values for now as requested for "storage", 
        // but typically we'd only return { hasGeminiKey: !!data.gemini_api_key ... }

        return res.status(200).json({
            gemini_api_key: data?.gemini_api_key || "",
            google_credit_json: data?.google_credit_json || null,
        });
    }

    // 3. POST: Update settings
    if (req.method === "POST") {
        const { gemini_api_key, google_credit_json } = req.body;

        const updates: any = {};
        if (gemini_api_key !== undefined) updates.gemini_api_key = gemini_api_key;
        if (google_credit_json !== undefined) updates.google_credit_json = google_credit_json;

        const { error } = await client
            .from("profiles")
            .update(updates)
            .eq("id", user.id);

        if (error) {
            console.error("Error updating user settings:", error);
            return res.status(500).json({ message: "Failed to update settings" });
        }

        return res.status(200).json({ message: "Settings updated successfully" });
    }

    return res.status(405).json({ message: "Method not allowed" });
}
