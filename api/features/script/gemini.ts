import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  analyzeTranscript,
  generateIdeas,
  generateNewPlan,
  generateSsml,
  generateActingPrompt,
  reformatTopic,
} from "../../../server/shared/geminiService.js";
import {
  generateChapterOutline,
  generateChapterScript
} from "../../../server/shared/chapterService.js";
import { enforceAbusePolicy } from "../../../server/shared/abuseGuard.js";
import { enforceUsageLimit, recordUsageEvent } from "../../../server/shared/usageLimit.js";
import { getSupabaseUser, supabaseAdmin } from "../../../server/shared/supabase.js";
import { checkAndDeductCredits, CREDIT_COSTS } from "../../../server/shared/creditService.js";

type RateEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateEntry>();
const MAX_REQUESTS = Number(process.env.AI_RATE_LIMIT_MAX || 30);
const WINDOW_MS = Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 24 * 60 * 60 * 1000);

const getClientId = (req: VercelRequest): string => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
};

const applyRateLimit = (req: VercelRequest, res: VercelResponse): boolean => {
  const now = Date.now();
  const clientId = getClientId(req);
  const entry = rateLimitStore.get(clientId);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(clientId, { count: 1, resetAt: now + WINDOW_MS });
    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS.toString());
    res.setHeader("X-RateLimit-Remaining", (MAX_REQUESTS - 1).toString());
    res.setHeader("X-RateLimit-Reset", (now + WINDOW_MS).toString());
    return true;
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader("Retry-After", retryAfterSeconds.toString());
    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS.toString());
    res.setHeader("X-RateLimit-Remaining", "0");
    res.setHeader("X-RateLimit-Reset", entry.resetAt.toString());
    res.status(429).send("rate_limit");
    return false;
  }

  entry.count += 1;
  rateLimitStore.set(clientId, entry);
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS.toString());
  res.setHeader("X-RateLimit-Remaining", (MAX_REQUESTS - entry.count).toString());
  res.setHeader("X-RateLimit-Reset", entry.resetAt.toString());
  return true;
};

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

  try {
    if (!applyRateLimit(req, res)) {
      return;
    }

    let body: any = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (error) {
        res.status(400).send("invalid_json");
        return;
      }
    }

    const action = body?.action as string | undefined;
    const payload = body?.payload as Record<string, unknown> | undefined;
    const clientFingerprint =
      typeof body?.client?.fingerprint === "string" ? body.client.fingerprint : null;

    if (!action || !payload) {
      res.status(400).send("invalid_request");
      return;
    }

    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    const token =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    if (!token) {
      res.status(401).send("auth_required");
      return;
    }

    const authResult = await getSupabaseUser(token);
    userId = authResult.user?.id ?? null;
    if (!userId || !supabaseAdmin) {
      res.status(401).send("auth_required");
      return;
    }

    const metadata = (authResult.user as any)?.user_metadata || {};
    const couponBypassCredits = metadata?.coupon_bypass_credits === true;

    let userApiKey = "";
    const profileResult = await supabaseAdmin
      .from("profiles")
      .select("gemini_api_key")
      .eq("id", userId)
      .single();

    if (!profileResult.error && typeof profileResult.data?.gemini_api_key === "string") {
      userApiKey = profileResult.data.gemini_api_key.trim();
    }

    if (!userApiKey) {
      const metadataKey = (authResult.user as any)?.user_metadata?.gemini_api_key;
      if (typeof metadataKey === "string") {
        userApiKey = metadataKey.trim();
      }
    }

    let effectiveApiKey = "";

    const guard = await enforceAbusePolicy(req, action, clientFingerprint);
    if (!guard.allowed) {
      res.status(guard.status || 403).send(guard.reason || "abuse_blocked");
      return;
    }

    const usage = await enforceUsageLimit(req, clientFingerprint);
    if (!usage.allowed) {
      if (usage.retryAfterSeconds) {
        res.setHeader("Retry-After", usage.retryAfterSeconds.toString());
      }
      res.status(usage.status || 429).send(usage.reason || "usage_limit");
      return;
    }

    // Fire and forget - do not await
    recordUsageEvent(req, action, clientFingerprint).catch(err => {
      console.error("Failed to record usage event:", err);
    });

    // New policy:
    // 1) Coupon-applied user: credits bypass, but own API key is required.
    // 2) Non-coupon user: always server API + credits deduction.
    if (couponBypassCredits) {
      if (!userApiKey) {
        res.status(400).send("coupon_user_key_required");
        return;
      }
      effectiveApiKey = userApiKey;
    } else {
      effectiveApiKey = String(process.env.GEMINI_API_KEY || "").trim();
      if (!effectiveApiKey) {
        res.status(400).send("missing_api_key");
        return;
      }

      const costByAction: Record<string, number> = {
        analyzeTranscript: CREDIT_COSTS.ANALYSIS,
        generateIdeas: CREDIT_COSTS.IDEATION,
        generateNewPlan: CREDIT_COSTS.SCRIPT_PLAN,
        generateChapterOutline: CREDIT_COSTS.SCRIPT_OUTLINE,
        generateChapterScript: CREDIT_COSTS.SCRIPT_CHUNK,
        generateSsml: CREDIT_COSTS.TTS_CHAR,
        generateActingPrompt: CREDIT_COSTS.IDEATION,
        reformatTopic: CREDIT_COSTS.IDEATION,
      };
      const cost = Number(costByAction[action] ?? CREDIT_COSTS.IDEATION);
      const creditResult = await checkAndDeductCredits(req, res, cost);
      if (!creditResult.allowed) {
        res.status(creditResult.status || 402).send("credit_limit");
        return;
      }
    }

    switch (action) {
      case "analyzeTranscript": {
        const transcript = payload.transcript as string;
        const category = payload.category as string;
        const videoTitle = payload.videoTitle as string | undefined;
        const fastMode = payload.fastMode === true;
        if (!transcript || !category) {
          res.status(400).send("missing_fields");
          return;
        }
        const result = await analyzeTranscript(transcript, category, effectiveApiKey, videoTitle, fastMode);
        res.status(200).json(result);
        return;
      }
      case "generateIdeas": {
      const analysis = payload.analysis;
      const category = payload.category as string;
      const userKeyword = payload.userKeyword as string | undefined;
      const titleFormat = payload.titleFormat as string | undefined;
      if (!analysis || !category) {
        res.status(400).send("missing_fields");
        return;
      }
      const result = await generateIdeas(
        analysis as any,
        category,
        effectiveApiKey,
        userKeyword,
        titleFormat
      );
      res.status(200).json({ ideas: result });
      return;
    }
      case "generateNewPlan": {
      const analysis = payload.analysis;
      const newKeyword = payload.newKeyword as string;
      const length = payload.length as string;
      const category = payload.category as string;
      const vlogType = payload.vlogType as string | undefined;
      const scriptStyle = payload.scriptStyle as string | undefined;
      if (!analysis || !newKeyword || !length || !category) {
        res.status(400).send("missing_fields");
        return;
      }
      const result = await generateNewPlan(
        analysis as any,
        newKeyword,
        length,
        category,
        effectiveApiKey,
        vlogType,
        scriptStyle
      );
      res.status(200).json(result);
      return;
    }
      case "generateChapterOutline": {
      const analysis = payload.analysis;
      const newKeyword = payload.newKeyword as string;
      const length = payload.length as string;
      const category = payload.category as string;
      const vlogType = payload.vlogType as string | undefined;
      const scriptStyle = payload.scriptStyle as string | undefined;
      if (!analysis || !newKeyword || !length || !category) {
        res.status(400).send("missing_fields");
        return;
      }
      const result = await generateChapterOutline(
        analysis as any,
        newKeyword,
        length,
        category,
        effectiveApiKey,
        vlogType,
        scriptStyle
      );
      res.status(200).json(result);
      return;
    }
      case "generateChapterScript": {
      const chapter = payload.chapter;
      const characters = payload.characters;
      const newKeyword = payload.newKeyword as string;
      const category = payload.category as string;
      const allChapters = payload.allChapters;
      const scriptStyle = payload.scriptStyle as string | undefined;
      if (!chapter || !characters || !newKeyword || !category || !allChapters) {
        res.status(400).send("missing_fields");
        return;
      }
      const result = await generateChapterScript(
        chapter as any,
        characters as any,
        newKeyword,
        category,
        effectiveApiKey,
        allChapters as any,
        scriptStyle
      );
      res.status(200).json({ script: result });
      return;
    }
      case "generateSsml": {
      const text = payload.text as string;
      const prompt = payload.prompt as string;
      if (!text) {
        res.status(400).send("missing_fields");
        return;
      }
      const result = await generateSsml(text, prompt || "", effectiveApiKey);
      res.status(200).json(result);
      return;
    }
      case "generateActingPrompt": {
      const text = payload.text as string;
      if (!text) {
        res.status(400).send("missing_fields");
        return;
      }
      const result = await generateActingPrompt(text, effectiveApiKey);
      res.status(200).json({ prompt: result });
      return;
    }
      case "reformatTopic": {
        const topic = payload.topic as string;
        const titleFormat = payload.titleFormat as string;
        if (!topic || !titleFormat) {
          res.status(400).send("missing_fields");
          return;
        }
        const result = await reformatTopic(topic, titleFormat, effectiveApiKey);
        res.status(200).json({ reformattedTopic: result });
        return;
      }
      default:
    res.status(400).send("unknown_action");
    return;
  }
  } catch (error: any) {
  console.error("[api/gemini] error:", error);
  if (!res.headersSent) {
    res.status(500).send(error?.message || "server_error");
  }
}
}

