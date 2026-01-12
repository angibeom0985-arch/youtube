import type { VercelRequest, VercelResponse } from "@vercel/node";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { enforceUsageLimit, recordUsageEvent } from "../_lib/usageLimit.js";
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
  const voice = typeof body?.voice === "string" ? body.voice : "ko-KR-Standard-A";
  const speakingRate =
    typeof body?.speakingRate === "number" ? body.speakingRate : 1;
  const pitch = typeof body?.pitch === "number" ? body.pitch : 0;
  const clientFingerprint =
    typeof body?.client?.fingerprint === "string" ? body.client.fingerprint : null;

  if (!text) {
    res.status(400).json({ message: "missing_fields" });
    return;
  }

  // Google Service Account JSON 키 파일 경로 설정
  let keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const jsonFileName = "google-credentials.json";
  
  if (!keyFilename || !fs.existsSync(keyFilename)) {
     // 후보 경로들 확인
     const candidates = [
        path.join(process.cwd(), "api", "youtube_TTS", jsonFileName), // Vercel root 기준
        path.join(__dirname, jsonFileName), // 파일 상대 경로
        path.join(process.cwd(), "misc", jsonFileName), // 로컬 misc 폴더
        path.resolve(process.cwd(), "youtube_TTS", "api", jsonFileName), // 로컬 실행 환경 대응
        path.join("C:\\KB\\Website\\Youtube\\api\\youtube_TTS", jsonFileName) // 로컬 절대 경로
     ];

     for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            keyFilename = candidate;
            break;
        }
     }
  }

  // 환경변수로 JSON 내용이 직접 전달된 경우 처리 (Vercel 권장 방식)
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

    const request = {
      input: { text },
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

    // Buffer를 Base64 문자열로 변환하여 전송
    const audioContent = Buffer.from(response.audioContent).toString("base64");

    res.status(200).json({ audioContent });
  } catch (error: any) {
    console.error("[api/tts] error:", error);
    res.status(500).json({ message: error?.message || "server_error" });
  }
}
