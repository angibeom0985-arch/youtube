import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseUser, supabaseAdmin } from "../../_lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
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

  if (req.method === "DELETE") {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Admin client unavailable" });
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", user.id);

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
          credits: 12,
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
        credits: 12,
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

    const credits = profile && typeof profile === "object" && "credits" in profile
      ? profile.credits ?? 0
      : 0;

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
