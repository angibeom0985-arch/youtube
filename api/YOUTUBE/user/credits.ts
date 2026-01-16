import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseUser } from "../../_lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS ?¤ë” ?¤ì •
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Authorization ?¤ë”?ì„œ ? í° ì¶”ì¶œ
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "?¸ì¦???„ìš”?©ë‹ˆ??" });
    }

    const token = authHeader.substring(7);
    const authResult = await getSupabaseUser(token);
    const user = authResult.user;
    const supabaseClient = authResult.client;
    const supabaseAny = supabaseClient as any;

    if (!user || !supabaseClient) {
      return res.status(401).json({ error: "? íš¨?˜ì? ?Šì? ? í°?…ë‹ˆ??" });
    }

    // ?„ë¡œ?„ì—???¬ë ˆ??ì¡°íšŒ
    const { data: profileData, error: profileError } = await supabaseAny
      .from("profiles")
      .select("credits, initial_credits_expiry")
      .eq("id", user.id)
      .single();

    const profile = profileData ?? null;

    // ?„ë¡œ?„ì´ ?†ìœ¼ë©??ì„± (?Œì›ê°€?????¸ë¦¬ê±°ê? ?‘ë™?˜ì? ?Šì? ê²½ìš° ?€ë¹?
    if (profileError && (profileError as any).code === "PGRST116") {
      console.log("?„ë¡œ???†ìŒ. ?ˆë¡œ ?ì„±...", { userId: user.id, email: user.email });
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
          error: "?„ë¡œ???ì„± ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
          details: insertError.message,
        });
      }

      if (!newProfile) {
        console.error("Profile creation failed: No data returned");
        return res.status(500).json({
          error: "?„ë¡œ???ì„±???¤íŒ¨?ˆìŠµ?ˆë‹¤.",
          details: "?°ì´?°ê? ë°˜í™˜?˜ì? ?Šì•˜?µë‹ˆ??",
        });
      }

      console.log("???„ë¡œ???ì„± ?„ë£Œ:", { userId: user.id, credits: 12 });
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
        error: "?¬ë ˆ???•ë³´ë¥?ë¶ˆëŸ¬?????†ìŠµ?ˆë‹¤.",
        details: profileError.message,
      });
    }

    // ì´ˆê¸° ?¬ë ˆ??ê¸°ê°„ ?•ì¸
    const initialExpiryDate = null;
    const isInInitialPeriod = false;
    const daysRemaining = 0;

    const credits = profile && typeof profile === "object" && "credits" in profile
      ? profile.credits ?? 0
      : 0;

    return res.status(200).json({
      credits,
      userId: user.id,
      isInInitialPeriod,
      daysRemaining,
      initialExpiryDate,
    });
  } catch (error) {
    console.error("Credits fetch error:", error);
    return res.status(500).json({
      error: "?¬ë ˆ??ì¡°íšŒ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
