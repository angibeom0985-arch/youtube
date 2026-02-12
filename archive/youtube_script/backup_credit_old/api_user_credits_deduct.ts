import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAndDeductCredits } from "../../_lib/creditService.js";
import { getSupabaseUser } from "../../_lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("method_not_allowed");
    return;
  }

  let body: any = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).send("invalid_json");
      return;
    }
  }

  const action = body?.action || "deduct"; // "deduct" or "refund"
  const cost = Number(body?.cost);
  
  if (!Number.isFinite(cost) || cost <= 0) {
    res.status(400).json({ message: "invalid_cost" });
    return;
  }

  // Refund 처리
  if (action === "refund") {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ message: "unauthorized" });
      return;
    }

    const token = authHeader.replace("Bearer ", "");
    const authResult = await getSupabaseUser(token);
    const user = authResult.user;
    const supabaseClient = authResult.client;

    if (!user || !supabaseClient) {
      res.status(401).json({ message: "invalid_token" });
      return;
    }

    const userId = user.id;

    try {
      const { data: profile, error: fetchError } = await supabaseClient
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single();

      if (fetchError) {
        console.error("Profile fetch error:", fetchError);
        res.status(500).json({ message: "failed_to_fetch_credits" });
        return;
      }

      const currentCredits = profile?.credits ?? 0;
      const newCredits = currentCredits + cost;

      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ credits: newCredits })
        .eq("id", userId);

      if (updateError) {
        console.error("Credit refund error:", updateError);
        res.status(500).json({ message: "failed_to_refund_credits" });
        return;
      }

      res.status(200).json({ 
        credits: newCredits,
        refunded: cost,
        message: "credits_refunded_successfully"
      });
      return;
    } catch (error) {
      console.error("Unexpected error during refund:", error);
      res.status(500).json({ message: "internal_server_error" });
      return;
    }
  }

  // Deduct 처리 (기본)
  const creditResult = await checkAndDeductCredits(req, res, cost);
  if (!creditResult.allowed) {
    res.status(creditResult.status || 402).json({
      message: creditResult.message || "Credits required",
      error: "credit_limit",
      currentCredits: creditResult.currentCredits,
    });
    return;
  }

  res.status(200).json({ credits: creditResult.currentCredits });
}
