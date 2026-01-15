import { getSupabaseUser } from "./supabase.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// ?¬ë ˆ??ë¹„ìš© ?•ì˜
export const CREDIT_COSTS = {
  SEARCH: 5,          // ë²¤ì¹˜ë§ˆí‚¹ ê²€??
  SCRIPT_PLAN: 10,    // ê¸°íš???ì„±
  SCRIPT_OUTLINE: 5,  // ì±•í„° ëª©ì°¨ êµ¬ì„± (? ê·œ)
  SCRIPT_CHUNK: 5,    // ì±•í„°ë³??€ë³??ì„± (? ê·œ)
  IMAGE_GEN: 5,       // ?´ë?ì§€ 1???ì„±
  TTS_CHAR: 0.1,      // TTS 1ê¸€?ë‹¹ (10??= 1?¬ë ˆ??
  ANALYSIS: 1,        // ?ìƒ ë¶„ì„ (ê°€ë³ê²Œ)
  IDEATION: 1,        // ?„ì´?”ì–´ ?ì„± (ê°€ë³ê²Œ)
};

// ?¬ë ˆ???¤ì •
const INITIAL_CREDITS = 12;        // ? ê·œ ê°€?…ìž ì´ˆê¸° ?¬ë ˆ??
const INITIAL_PERIOD_DAYS = 0;     // ì´ˆê¸° ?¬ë ˆ???¬ìš© ê¸°í•œ (3??
const DAILY_FREE_CREDITS = 12;     // 3???´í›„ ?¼ì¼ ë¬´ë£Œ ?¬ë ˆ??

export interface CreditCheckResult {
  allowed: boolean;
  currentCredits: number;
  cost: number;
  message?: string;
  status?: number;
  userId?: string;
}

const getClientIp = (req: VercelRequest): string | null => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket?.remoteAddress || null;
};

/**
 * ?¬ìš©??IDë¥?ì¶”ì¶œ?˜ê³  ?¬ë ˆ?§ì„ ?•ì¸/ì°¨ê°?˜ëŠ” ë¯¸ë“¤?¨ì–´ ?¨ìˆ˜
 */
export const checkAndDeductCredits = async (
  req: VercelRequest,
  res: VercelResponse,
  cost: number
): Promise<CreditCheckResult> => {
  // 1. Supabase ?¸ì¦ ? í° ?•ì¸
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return {
      allowed: false,
      currentCredits: 0,
      cost,
      message: "ë¡œê·¸?¸ì´ ?„ìš”???œë¹„?¤ìž…?ˆë‹¤. ?Œì›ê°€?…í•˜ê³??¬ë ˆ?§ì„ ë°›ì•„ë³´ì„¸??",
      status: 401,
    };
  }

  const token = authHeader.replace("Bearer ", "");
  const authResult = await getSupabaseUser(token);
  const user = authResult.user;
  const supabaseClient = authResult.client;
  const usingAdmin = authResult.usingAdmin;

  if (!user || !supabaseClient) {
    return {
      allowed: false,
      currentCredits: 0,
      cost,
      message: "? íš¨?˜ì? ?Šì? ? í°?…ë‹ˆ??",
      status: 401,
    };
  }

  const userId = user.id;
  const clientIp = getClientIp(req);

  // 2. ?„ë¡œ???¬ë ˆ?? ì¡°íšŒ
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("credits, last_reset_date, signup_ip, initial_credits_expiry")
    .eq("id", userId)
    .single();

  if (profileError && profileError.code !== "PGRST116") { // PGRST116: no rows result
    console.error("Profile fetch error:", profileError);
    return {
      allowed: false,
      currentCredits: 0,
      cost,
      message: "?¬ë ˆ???•ë³´ë¥?ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??",
      status: 500,
    };
  }

  // ?„ë¡œ?„ì´ ?†ìœ¼ë©??ì„± (ê°€???¸ë¦¬ê±°ê? ?¤íŒ¨?ˆì„ ê²½ìš° ?€ë¹?
  let currentCredits = profile?.credits ?? 0;
  let lastReset = profile?.last_reset_date;

  if (!profile) {
    // [IP ì¤‘ë³µ ê°€??ì²´í¬]
    // ê°™ì? IPë¡??´ë? ê°€?…ëœ ?¤ë¥¸ ê³„ì •???ˆëŠ”ì§€ ?•ì¸
    if (clientIp && usingAdmin) {
      const { data: existingIpProfiles, error: ipCheckError } = await supabaseClient
        .from("profiles")
        .select("id, email")
        .eq("signup_ip", clientIp)
        .neq("id", userId)
        .limit(1);

      if (!ipCheckError && existingIpProfiles && existingIpProfiles.length > 0) {
        // ì¤‘ë³µ IP ë°œê²¬: ?„ì˜ˆ ?œë¹„???´ìš© ì°¨ë‹¨
        console.log(`Abuse detected: Duplicate IP (${clientIp}). User ${userId} blocked.`);
        return {
          allowed: false,
          currentCredits: 0,
          cost,
          message: "ì£„ì†¡?©ë‹ˆ?? IP???˜ë‚˜??ê³„ì •ë§?ì´ˆê¸° ?¬ë ˆ?§ì„ ë°›ì„ ???ˆìŠµ?ˆë‹¤. ê¸°ì¡´??ê°€?…í•œ ê³„ì •?¼ë¡œ ë¡œê·¸?¸í•´ì£¼ì„¸??",
          status: 403,
        };
      }
    }

    // ? ê·œ ê°€?…ìž: ì´ˆê¸° 100 ?¬ë ˆ??+ 3???¬ìš©ê¸°í•œ ?¤ì •
    const signupDate = new Date();
    const initialExpiryDate =
      INITIAL_PERIOD_DAYS > 0 ? new Date(signupDate) : null;
    if (initialExpiryDate) {
      initialExpiryDate.setDate(initialExpiryDate.getDate() + INITIAL_PERIOD_DAYS);
    }

    const { error: insertError } = await supabaseClient
      .from("profiles")
      .insert({
        id: userId,
        email: user.email,
        credits: INITIAL_CREDITS,
        last_reset_date: signupDate.toISOString(),
        initial_credits_expiry: initialExpiryDate ? initialExpiryDate.toISOString() : null,
        signup_ip: clientIp,
      });

    if (insertError) {
      console.error("Profile creation error:", insertError);
    }
    currentCredits = INITIAL_CREDITS;
    lastReset = new Date().toISOString();
  } else if (!profile.signup_ip && clientIp && usingAdmin) {
    // ê¸°ë¡??IPê°€ ?†ìœ¼ë©??„ìž¬ IP ê¸°ë¡ (?˜ìœ„ ?¸í™˜??
    await supabaseClient
      .from("profiles")
      .update({ signup_ip: clientIp })
      .eq("id", userId);
  }

  // 3. ?¼ì¼ ë¦¬ì…‹ ë¡œì§
  const today = new Date().toISOString().split("T")[0];
  const lastResetDate = lastReset ? new Date(lastReset).toISOString().split("T")[0] : "";
  const initialExpiryDate = profile?.initial_credits_expiry;
  const isInInitialPeriod =
    INITIAL_PERIOD_DAYS > 0 && initialExpiryDate && new Date() < new Date(initialExpiryDate);

  if (lastResetDate !== today) {
    // ? ì§œê°€ ë°”ë€Œì—ˆ????
    if (isInInitialPeriod) {
      // ì´ˆê¸° 3??ê¸°ê°„ ì¤? ? ì§œë§??…ë°?´íŠ¸ (?¬ë ˆ??ì¶©ì „ ?ˆí•¨)
      await supabaseClient
        .from("profiles")
        .update({ last_reset_date: today })
        .eq("id", userId);
    } else {
      // 3???´í›„: ?¼ì¼ ë¬´ë£Œ ?¬ë ˆ??ì§€ê¸?
      if (currentCredits < DAILY_FREE_CREDITS) {
        currentCredits = DAILY_FREE_CREDITS;
        await supabaseClient
          .from("profiles")
          .update({ credits: currentCredits, last_reset_date: today })
          .eq("id", userId);
      } else {
        // ?´ë? ë§Žìœ¼ë©?? ì§œë§??…ë°?´íŠ¸
        await supabaseClient
          .from("profiles")
          .update({ last_reset_date: today })
          .eq("id", userId);
      }
    }
  }

  // 4. ?¬ë ˆ??ì°¨ê° ?•ì¸
  if (currentCredits < cost) {
    return {
      allowed: false,
      currentCredits,
      cost,
      message: `?¬ë ˆ?§ì´ ë¶€ì¡±í•©?ˆë‹¤. (?„ìš”: ${cost}, ë³´ìœ : ${currentCredits})`,
      status: 402, // Payment Required
      userId,
    };
  }

  // 5. ?¬ë ˆ??ì°¨ê° ?¤í–‰
  const newCredits = currentCredits - cost;
  const { error: updateError } = await supabaseClient
    .from("profiles")
    .update({ credits: newCredits })
    .eq("id", userId);

  if (updateError) {
    console.error("Credit deduction error:", updateError);
    return { allowed: false, currentCredits, cost, message: "?¬ë ˆ??ì°¨ê° ì¤??¤ë¥˜ ë°œìƒ", status: 500 };
  }

  return { allowed: true, currentCredits: newCredits, cost, userId };
};
