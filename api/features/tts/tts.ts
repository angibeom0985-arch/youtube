import type { VercelRequest, VercelResponse } from "@vercel/node";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { enforceUsageLimit, recordUsageEvent } from "../../../server/shared/usageLimit.js";
import { getSupabaseUser, supabaseAdmin } from "../../../server/shared/supabase.js";

type UserCredentialSource =
  | { kind: "serviceAccount"; credentials: Record<string, unknown> }
  | { kind: "apiKey"; apiKey: string }
  | { kind: "none" };

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
  const client = new TextToSpeechClient({ credentials: params.credentials as any });
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
  });

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
  const clientFingerprint =
    typeof body?.client?.fingerprint === "string" ? body.client.fingerprint : null;

  if (!text && !ssml) {
    res.status(400).json({ message: "missing_fields" });
    return;
  }

  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("google_credit_json")
    .eq("id", userId)
    .single();

  if (profileResult.error) {
    console.error("[api/tts] failed to load profile settings", profileResult.error);
    res.status(500).json({ message: "settings_load_failed" });
    return;
  }

  const credential = parseGoogleCredential(profileResult.data?.google_credit_json);
  if (credential.kind === "none") {
    res.status(400).json({ message: "missing_user_google_key" });
    return;
  }

  const usage = await enforceUsageLimit(req, clientFingerprint);
  if (!usage.allowed) {
    if (usage.retryAfterSeconds) {
      res.setHeader("Retry-After", usage.retryAfterSeconds.toString());
    }
    res.status(usage.status || 429).json({ message: usage.reason || "usage_limit" });
    return;
  }

  await recordUsageEvent(req, "tts", clientFingerprint);

  const languageMatch = voice.match(/^[a-z]{2}-[A-Z]{2}/);
  const languageCode = languageMatch ? languageMatch[0] : "ko-KR";

  try {
    const common = {
      text,
      ssml,
      voice,
      languageCode,
      speakingRate,
      pitch,
    };

    const audioContent =
      credential.kind === "serviceAccount"
        ? await synthesizeWithServiceAccount({ ...common, credentials: credential.credentials })
        : await synthesizeWithApiKey({ ...common, apiKey: credential.apiKey });

    res.status(200).json({ audioContent });
  } catch (error: any) {
    console.error("[api/tts] error:", error);
    res.status(500).json({ message: error?.message || "server_error" });
  }
}
