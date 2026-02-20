import type { VercelRequest, VercelResponse } from "@vercel/node";

type UserCredentialSource =
  | { kind: "serviceAccount"; credentials: Record<string, unknown> }
  | { kind: "apiKey"; apiKey: string }
  | { kind: "none" };

type BillingInfo = {
  mode: "coupon_user_key" | "server_credit";
  cost: number;
  remainingCredits: number | null;
};

const DEFAULT_TTS_CHAR_COST = 0.1;

const isMissingColumnError = (error: any, column: string): boolean => {
  if (!error) return false;
  const code = String(error.code || "");
  const message = String(error.message || "");
  return code === "42703" || message.includes(column);
};

const getBearerToken = (req: VercelRequest): string | null => {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7).trim() || null;
};

const parseGoogleCredential = (raw: unknown): UserCredentialSource => {
  if (!raw) {
    return { kind: "none" };
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { kind: "none" };
    }

    if (!trimmed.startsWith("{")) {
      return { kind: "apiKey", apiKey: trimmed };
    }

    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      return parseGoogleCredential(parsed);
    } catch {
      return { kind: "none" };
    }
  }

  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;

    if (typeof obj.apiKey === "string" && obj.apiKey.trim()) {
      return { kind: "apiKey", apiKey: obj.apiKey.trim() };
    }

    const hasServiceAccountFields =
      typeof obj.client_email === "string" && typeof obj.private_key === "string";

    if (hasServiceAccountFields) {
      return { kind: "serviceAccount", credentials: obj };
    }
  }

  return { kind: "none" };
};

const synthesizeWithServiceAccount = async (params: {
  credentials: Record<string, unknown>;
  text: string;
  ssml: string;
  voice: string;
  languageCode: string;
  speakingRate: number;
  pitch: number;
}): Promise<string> => {
  const ttsModule: any = await import("@google-cloud/text-to-speech");
  const ClientCtor =
    ttsModule?.TextToSpeechClient ||
    ttsModule?.v1?.TextToSpeechClient ||
    ttsModule?.default?.TextToSpeechClient;
  if (!ClientCtor) {
    throw new Error("tts_client_load_failed");
  }
  const client = new ClientCtor({ credentials: params.credentials as any });
  const input = params.ssml ? { ssml: params.ssml } : { text: params.text };

  const [response] = await client.synthesizeSpeech({
    input,
    voice: { languageCode: params.languageCode, name: params.voice },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: params.speakingRate,
      pitch: params.pitch,
    },
  });

  if (!response.audioContent) {
    throw new Error("missing_audio");
  }

  return Buffer.from(response.audioContent).toString("base64");
};

const synthesizeWithApiKey = async (params: {
  apiKey: string;
  text: string;
  ssml: string;
  voice: string;
  languageCode: string;
  speakingRate: number;
  pitch: number;
}): Promise<string> => {
  const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(params.apiKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const body = {
    input: params.ssml ? { ssml: params.ssml } : { text: params.text },
    voice: { languageCode: params.languageCode, name: params.voice },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: params.speakingRate,
      pitch: params.pitch,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || "tts_api_error";
    throw new Error(message);
  }

  const audioContent = typeof payload?.audioContent === "string" ? payload.audioContent : "";
  if (!audioContent) {
    throw new Error("missing_audio");
  }

  return audioContent;
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
    const supabaseModule: any = await import("../../../server/shared/supabase.js").catch((err) => {
      console.error("[api/tts] supabase module load failed:", err);
      return null;
    });
    if (!supabaseModule?.getSupabaseUser) {
      res.status(500).json({ message: "supabase_module_load_failed" });
      return;
    }
    const getSupabaseUser = supabaseModule.getSupabaseUser as (token: string) => Promise<any>;
    const supabaseAdmin = supabaseModule.supabaseAdmin as any;

    const usageModule: any = await import("../../../server/shared/usageLimit.js").catch((err) => {
      console.error("[api/tts] usage module load failed:", err);
      return null;
    });
    const enforceUsageLimit = usageModule?.enforceUsageLimit as
      | ((req: VercelRequest, clientFingerprint?: string | null) => Promise<any>)
      | undefined;
    const recordUsageEvent = usageModule?.recordUsageEvent as
      | ((req: VercelRequest, action: string, clientFingerprint?: string | null) => Promise<any>)
      | undefined;

    const couponModule: any = await import("../../../server/shared/couponBypass.js").catch((err) => {
      console.error("[api/tts] coupon module load failed:", err);
      return null;
    });
    const getCouponBypassState =
      (couponModule?.getCouponBypassState as ((metadata: Record<string, unknown>) => { active: boolean }) | undefined) ||
      (() => ({ active: false }));

    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ message: "auth_required" });
      return;
    }

    const auth = await getSupabaseUser(token);
    const userId = auth.user?.id ?? null;
    if (!userId || !supabaseAdmin) {
      res.status(401).json({ message: "auth_required" });
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

    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const ssml = typeof body?.ssml === "string" ? body.ssml.trim() : "";
    const voice = typeof body?.voice === "string" ? body.voice : "ko-KR-Standard-A";
    const speakingRate = typeof body?.speakingRate === "number" ? body.speakingRate : 1;
    const pitch = typeof body?.pitch === "number" ? body.pitch : 0;
    const preview = body?.preview === true;
    const clientFingerprint =
      typeof body?.client?.fingerprint === "string" ? body.client.fingerprint : null;

    if (!text && !ssml) {
      res.status(400).json({ message: "missing_fields" });
      return;
    }

    const metadata = (auth.user as any)?.user_metadata || {};
    const couponBypassCredits = getCouponBypassState(metadata).active;
    const serverApiKey = String(process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
    let userCredential: UserCredentialSource = parseGoogleCredential(metadata?.google_credit_json);

    let effectiveCredential: UserCredentialSource = { kind: "none" };
    let billing: BillingInfo = {
      mode: "coupon_user_key",
      cost: 0,
      remainingCredits: null,
    };

    if (preview) {
      if (couponBypassCredits) {
        const profileResult = await supabaseAdmin
          .from("profiles")
          .select("google_credit_json")
          .eq("id", userId)
          .maybeSingle();

        if (
          profileResult.error &&
          profileResult.error.code !== "PGRST116" &&
          !isMissingColumnError(profileResult.error, "google_credit_json")
        ) {
          console.error("[api/tts] failed to load profile settings", profileResult.error);
          res.status(500).json({ message: "settings_load_failed", details: profileResult.error.message || null });
          return;
        }

        const profileCredential = parseGoogleCredential(profileResult.data?.google_credit_json);
        if (profileCredential.kind !== "none") {
          userCredential = profileCredential;
        }

        if (userCredential.kind === "none") {
          res.status(400).json({ message: "coupon_user_key_required" });
          return;
        }
        effectiveCredential = userCredential;
        billing = {
          mode: "coupon_user_key",
          cost: 0,
          remainingCredits: null,
        };
      } else if (serverApiKey) {
        effectiveCredential = { kind: "apiKey", apiKey: serverApiKey };
        billing = {
          mode: "server_credit",
          cost: 0,
          remainingCredits: null,
        };
      } else {
        const profileResult = await supabaseAdmin
          .from("profiles")
          .select("google_credit_json")
          .eq("id", userId)
          .maybeSingle();

        if (
          profileResult.error &&
          profileResult.error.code !== "PGRST116" &&
          !isMissingColumnError(profileResult.error, "google_credit_json")
        ) {
          console.error("[api/tts] failed to load profile settings", profileResult.error);
          res.status(500).json({ message: "settings_load_failed", details: profileResult.error.message || null });
          return;
        }

        const profileCredential = parseGoogleCredential(profileResult.data?.google_credit_json);
        if (profileCredential.kind !== "none") {
          userCredential = profileCredential;
        }

        if (userCredential.kind === "none") {
          res.status(400).json({ message: "preview_user_key_required" });
          return;
        }
        effectiveCredential = userCredential;
        billing = {
          mode: "coupon_user_key",
          cost: 0,
          remainingCredits: null,
        };
      }
    } else if (couponBypassCredits) {
      const profileResult = await supabaseAdmin
        .from("profiles")
        .select("google_credit_json")
        .eq("id", userId)
        .maybeSingle();

      if (
        profileResult.error &&
        profileResult.error.code !== "PGRST116" &&
        !isMissingColumnError(profileResult.error, "google_credit_json")
      ) {
        console.error("[api/tts] failed to load profile settings", profileResult.error);
        res.status(500).json({ message: "settings_load_failed", details: profileResult.error.message || null });
        return;
      }

      const profileCredential = parseGoogleCredential(profileResult.data?.google_credit_json);
      if (profileCredential.kind !== "none") {
        userCredential = profileCredential;
      }

      if (userCredential.kind === "none") {
        res.status(400).json({ message: "coupon_user_key_required" });
        return;
      }
      effectiveCredential = userCredential;
    } else {
      if (!serverApiKey) {
        res.status(400).json({ message: "missing_api_key" });
        return;
      }

      const creditModule: any = await import("../../../server/shared/creditService.js").catch((err) => {
        console.error("[api/tts] credit module load failed:", err);
        return null;
      });
      if (!creditModule?.checkAndDeductCredits) {
        res.status(500).json({ message: "credit_module_load_failed" });
        return;
      }
      const ttsCharCost = Number(creditModule?.CREDIT_COSTS?.TTS_CHAR ?? DEFAULT_TTS_CHAR_COST);
      const charCount = Math.max(1, (text || ssml).length);
      const cost = Math.max(1, Math.ceil(charCount * ttsCharCost));
      let creditResult;
      try {
        creditResult = await creditModule.checkAndDeductCredits(req, res, cost);
      } catch (creditError: any) {
        console.error("[api/tts] credit check failed:", creditError);
        res.status(500).json({ message: "credit_check_failed", details: creditError?.message || null });
        return;
      }
      if (!creditResult.allowed) {
        res.status(creditResult.status || 402).json({
          message: creditResult.message || "Credits required",
          error: "credit_limit",
          currentCredits: creditResult.currentCredits,
        });
        return;
      }

      effectiveCredential = { kind: "apiKey", apiKey: serverApiKey };
      billing = {
        mode: "server_credit",
        cost,
        remainingCredits: creditResult.currentCredits,
      };
    }

    if (enforceUsageLimit) {
      const usage = await enforceUsageLimit(req, clientFingerprint);
      if (!usage.allowed) {
        if (usage.retryAfterSeconds) {
          res.setHeader("Retry-After", usage.retryAfterSeconds.toString());
        }
        res.status(usage.status || 429).json({ message: usage.reason || "usage_limit" });
        return;
      }
    }

    if (recordUsageEvent) {
      recordUsageEvent(req, "tts", clientFingerprint).catch((usageErr) => {
        console.error("[api/tts] usage event failed:", usageErr);
      });
    }

    const languageMatch = voice.match(/^[a-z]{2}-[A-Z]{2}/);
    const languageCode = languageMatch ? languageMatch[0] : "ko-KR";

    const common = {
      text,
      ssml,
      voice,
      languageCode,
      speakingRate,
      pitch,
    };

    let audioContent: string;
    if (effectiveCredential.kind === "serviceAccount") {
      audioContent = await Promise.race<string>([
        synthesizeWithServiceAccount({ ...common, credentials: effectiveCredential.credentials }),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error("tts_upstream_timeout")), 15000)),
      ]);
    } else {
      try {
        audioContent = await synthesizeWithApiKey({ ...common, apiKey: effectiveCredential.apiKey });
      } catch (firstError: any) {
        const firstMsg = String(firstError?.message || "");
        const isVoiceIssue =
          firstMsg.toLowerCase().includes("voice") ||
          firstMsg.toLowerCase().includes("name") ||
          firstMsg.toLowerCase().includes("languagecode");
        if (!isVoiceIssue) throw firstError;
        audioContent = await synthesizeWithApiKey({
          ...common,
          voice: "ko-KR-Wavenet-A",
        });
      }
    }

    res.status(200).json({ audioContent, billing });
  } catch (error: any) {
    console.error("[api/tts] error:", error);
    const rawMessage = String(error?.message || "server_error");
    const message =
      rawMessage.includes("aborted") || rawMessage.includes("timeout")
        ? "tts_upstream_timeout"
        : rawMessage;
    res.status(500).json({
      message,
      details: error?.stack ? String(error.stack).slice(0, 1200) : null,
    });
  }
}


