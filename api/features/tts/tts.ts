import type { VercelRequest, VercelResponse } from "@vercel/node";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { enforceUsageLimit, recordUsageEvent } from "../../../server/shared/usageLimit.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const ssml = typeof body?.ssml === "string" ? body.ssml.trim() : "";
  const voice = typeof body?.voice === "string" ? body.voice : "ko-KR-Standard-A";
  const speakingRate =
    typeof body?.speakingRate === "number" ? body.speakingRate : 1;
  const pitch = typeof body?.pitch === "number" ? body.pitch : 0;
  const clientFingerprint =
    typeof body?.client?.fingerprint === "string" ? body.client.fingerprint : null;

  if (!text && !ssml) {
    res.status(400).json({ message: "missing_fields" });
    return;
  }

  // Google Service Account JSON ?????뵬 野껋럥以???쇱젟
  let keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const jsonFileName = "google-credentials.json";

  if (!keyFilename || !fs.existsSync(keyFilename)) {
    // ?袁⑤궖 野껋럥以???類ㅼ뵥
        const candidates = [
      path.join(process.cwd(), "api", "youtube_TTS", jsonFileName),
      path.join(__dirname, jsonFileName),
      path.join(process.cwd(), "YOUTUBE", "config", jsonFileName),
      path.join(process.cwd(), "youtube", "config", jsonFileName),
      path.join(process.cwd(), "misc", jsonFileName),
      path.resolve(process.cwd(), "youtube_TTS", "api", jsonFileName),
      path.join("C:\\KB\\Website\\Youtube\\api\\youtube_TTS", jsonFileName),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        keyFilename = candidate;
        break;
      }
    }
  }

  // ??띻펾癰궰??롮쨮 JSON ??곸뒠??筌욊낯???袁⑤뼎??野껋럩??筌ｌ꼶??(Vercel 亦낅슣??獄쎻뫗??
  let clientOptions: any = { keyFilename };

  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      clientOptions = { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) };
    } catch (e) {
      console.error("[api/tts] Failed to parse GOOGLE_CREDENTIALS_JSON env var");
    }
  }

  if (!clientOptions.credentials && (!keyFilename || !fs.existsSync(keyFilename))) {
    console.error("[api/tts] Credential file not found and GOOGLE_CREDENTIALS_JSON is missing.");
    res.status(500).json({ message: "server_configuration_error: missing_credentials" });
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
    const client = new TextToSpeechClient(clientOptions);

    const input = ssml ? { ssml } : { text };

    const request = {
      input,
      voice: { languageCode, name: voice },
      audioConfig: {
        audioEncoding: "MP3" as const,
        speakingRate,
        pitch,
      },
    };

    const [response] = await client.synthesizeSpeech(request);

    if (!response.audioContent) {
      res.status(500).json({ message: "missing_audio" });
      return;
    }

    // Buffer??Base64 ?얜챷???以?癰궰??묐릭???袁⑸꽊
    const audioContent = Buffer.from(response.audioContent).toString("base64");

    res.status(200).json({ audioContent });
  } catch (error: any) {
    console.error("[api/tts] error:", error);
    res.status(500).json({ message: error?.message || "server_error" });
  }
}



