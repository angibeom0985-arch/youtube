import type { VercelRequest, VercelResponse } from "@vercel/node";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { enforceUsageLimit, recordUsageEvent } from "./_lib/usageLimit.js";
import path from "path";
import fs from "fs";

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
  // 1. 환경변수 확인
  // 2. 현재 디렉토리(api/)의 상위 디렉토리(루트)에서 파일 찾기
  let keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!keyFilename || !fs.existsSync(keyFilename)) {
     // 로컬 개발 환경용 기본 경로 (프로젝트 루트)
     const defaultPath = path.resolve(process.cwd(), "gen-lang-client-0953948384-8ebab0d26ad1.json");
     if (fs.existsSync(defaultPath)) {
       keyFilename = defaultPath;
     }
  }

  if (!keyFilename || !fs.existsSync(keyFilename)) {
    console.error("[api/tts] Credential file not found.");
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
    const client = new TextToSpeechClient({ keyFilename });

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
