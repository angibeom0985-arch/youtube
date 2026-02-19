import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseUser, supabaseAdmin } from "../../../server/shared/supabase.js";
import { checkAndDeductCredits } from "../../../server/shared/creditService.js";
import userSettingsHandler from "../../../server/handlers/userSettingsHandler.js";
import userCouponHandler from "../../../server/handlers/userCouponHandler.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathname = String(req.url || "").split("?")[0];
  if (pathname.includes("/user/settings")) {
    return userSettingsHandler(req, res);
  }
  if (pathname.includes("/user/coupon")) {
    return userCouponHandler(req, res);
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.substring(7);
  const authResult = await getSupabaseUser(token);
  const user = authResult.user;
  const supabaseClient = authResult.client;
  const supabaseAny = supabaseClient as any;

  if (!user || !supabaseClient) {
    return res.status(401).json({ error: "Invalid token" });
  }

  if (req.method === "POST") {
    res.setHeader("Cache-Control", "no-store");

    let body: any = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).send("invalid_json");
      }
    }

    const action = body?.action || "deduct";
    const cost = Number(body?.cost);

    if (!Number.isFinite(cost) || cost <= 0) {
      return res.status(400).json({ message: "invalid_cost" });
    }

    if (action === "refund") {
      try {
        const { data: profile, error: fetchError } = await supabaseClient
          .from("profiles")
          .select("credits")
          .eq("id", user.id)
          .single();

        if (fetchError) {
          console.error("Profile fetch error:", fetchError);
          return res.status(500).json({ message: "failed_to_fetch_credits" });
        }

        const currentCredits = profile?.credits ?? 0;
        const newCredits = currentCredits + cost;

        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({ credits: newCredits })
          .eq("id", user.id);

        if (updateError) {
          console.error("Credit refund error:", updateError);
          return res.status(500).json({ message: "failed_to_refund_credits" });
        }

        return res.status(200).json({
          credits: newCredits,
          refunded: cost,
          message: "credits_refunded_successfully",
        });
      } catch (error) {
        console.error("Unexpected error during refund:", error);
        return res.status(500).json({ message: "internal_server_error" });
      }
    }

    const creditResult = await checkAndDeductCredits(req, res, cost);
    if (!creditResult.allowed) {
      return res.status(creditResult.status || 402).json({
        message: creditResult.message || "Credits required",
        error: "credit_limit",
        currentCredits: creditResult.currentCredits,
      });
    }

    return res.status(200).json({ credits: creditResult.currentCredits });
  }

  if (req.method === "DELETE") {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Admin client unavailable" });
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").delete().eq("id", user.id);

    if (profileError) {
      console.error("Profile delete error:", profileError);
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("User delete error:", deleteError);
      return res.status(500).json({ error: "Account deletion failed" });
    }

    return res.status(200).json({ success: true });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data: profileData, error: profileError } = await supabaseAny
      .from("profiles")
      .select("credits, initial_credits_expiry")
      .eq("id", user.id)
      .single();

    const profile = profileData ?? null;

    if (profileError && (profileError as any).code === "PGRST116") {
      console.log("Profile missing, creating...", { userId: user.id, email: user.email });
      const { data: newProfile, error: insertError } = await supabaseAny
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          credits: 0,
          last_reset_date: new Date().toISOString(),
          initial_credits_expiry: null,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Profile creation error:", insertError);
        return res.status(500).json({
          error: "Profile creation failed",
          details: insertError.message,
        });
      }

      if (!newProfile) {
        console.error("Profile creation failed: No data returned");
        return res.status(500).json({
          error: "Profile creation failed",
          details: "No data returned",
        });
      }

      return res.status(200).json({
        credits: 0,
        userId: user.id,
        isInInitialPeriod: false,
        daysRemaining: 0,
        initialExpiryDate: null,
      });
    }

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return res.status(500).json({
        error: "Profile fetch failed",
        details: profileError.message,
      });
    }

    const credits = profile && typeof profile === "object" && "credits" in profile ? profile.credits ?? 0 : 0;

    return res.status(200).json({
      credits,
      userId: user.id,
      isInInitialPeriod: false,
      daysRemaining: 0,
      initialExpiryDate: null,
    });
  } catch (error) {
    console.error("Credits fetch error:", error);
    return res.status(500).json({
      error: "Credits fetch failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
