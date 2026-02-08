import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  analyzeTranscript,
  generateIdeas,
  generateNewPlan,
  generateSsml,
  generateActingPrompt,
  reformatTopic,
} from "../_lib/geminiService.js";
import {
  generateChapterOutline,
  generateChapterScript
} from "../_lib/chapterService.js";
import { enforceAbusePolicy } from "../_lib/abuseGuard.js";
import { enforceUsageLimit, recordUsageEvent } from "../_lib/usageLimit.js";
import { checkAndDeductCredits, CREDIT_COSTS } from "../_lib/creditService.js";
import { supabaseAdmin } from "../_lib/supabase.js";

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

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    res.status(500).send("missing_api_key");
    return;
  }

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

  // 1. Determine Cost based on Action
  let cost = 0;
  switch (action) {
    case "analyzeTranscript":
      cost = CREDIT_COSTS.ANALYSIS;
      break;
    case "generateIdeas":
      cost = CREDIT_COSTS.IDEATION;
      break;
    case "generateNewPlan":
      cost = CREDIT_COSTS.SCRIPT_PLAN;
      break;
    case "generateChapterOutline":
      cost = CREDIT_COSTS.SCRIPT_OUTLINE;
      break;
    case "generateChapterScript":
      cost = CREDIT_COSTS.SCRIPT_CHUNK;
      break;
    case "generateSsml":
      cost = CREDIT_COSTS.ANALYSIS; // Low cost
      break;
    case "generateActingPrompt":
      cost = CREDIT_COSTS.ANALYSIS; // Low cost
      break;
    case "reformatTopic":
      cost = CREDIT_COSTS.ANALYSIS; // Low cost
      break;
    default:
      cost = 1; // Default low cost
  }

  // 2. Check and Deduct Credits (Enforces Login)
  const creditResult = await checkAndDeductCredits(req, res, cost);
  if (!creditResult.allowed) {
    res.status(creditResult.status || 402).json({
      message: creditResult.message || "Credits required",
      error: "credit_limit"
    });
    return;
  }

  // [NEW] Check for User API Key override
  let effectiveApiKey = apiKey;
  if (creditResult.userId && supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("gemini_api_key")
      .eq("id", creditResult.userId)
      .single();
    if (data?.gemini_api_key) {
      effectiveApiKey = data.gemini_api_key;
    }
  }

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

  try {
    switch (action) {
      case "analyzeTranscript": {
        const transcript = payload.transcript as string;
        const category = payload.category as string;
        const videoTitle = payload.videoTitle as string | undefined;
        if (!transcript || !category) {
          res.status(400).send("missing_fields");
          return;
        }
        const result = await analyzeTranscript(transcript, category, effectiveApiKey, videoTitle);
        res.status(200).json(result);
        return;
      }
      case "generateIdeas": {
      const analysis = payload.analysis;
      const category = payload.category as string;
      const userKeyword = payload.userKeyword as string | undefined;
      if (!analysis || !category) {
        res.status(400).send("missing_fields");
        return;
      }
      const result = await generateIdeas(
        analysis as any,
        category,
        effectiveApiKey,
        userKeyword
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
        vlogType
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
  res.status(500).send(error?.message || "server_error");
}
}
