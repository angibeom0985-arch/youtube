import type { AnalysisResult, NewPlan } from "../types";
import { getClientFingerprint } from "./abuseService";
import { supabase } from "./supabase";

type GeminiAction =
  | "analyzeTranscript"
  | "generateIdeas"
  | "generateNewPlan"
  | "generateChapterOutline"
  | "generateChapterScript"
  | "generateSsml"
  | "generateActingPrompt";

const toUserMessage = (raw: string): string => {
  const text = (raw || "").trim();
  const lower = text.toLowerCase();

  try {
    const json = JSON.parse(text);
    if (json.message) return json.message;
  } catch {
    // ignore
  }

  if (lower.includes("rate_limit")) return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  if (lower.includes("auth_required")) return "로그인이 필요합니다.";
  if (lower.includes("coupon_user_key_required")) {
    return "쿠폰 적용 계정은 본인 Gemini API 키를 등록해야 사용할 수 있습니다.";
  }
  if (lower.includes("missing_user_api_key")) return "마이페이지에서 Gemini API 키를 등록해 주세요.";
  if (lower.includes("missing_api_key")) return "서버 API 설정 오류입니다. 관리자에게 문의해 주세요.";
  if (lower.includes("missing_fields") || lower.includes("invalid_request")) {
    return "요청 값이 올바르지 않습니다. 입력값을 확인해 주세요.";
  }
  if (lower.includes("invalid_json")) return "요청 데이터 형식이 올바르지 않습니다.";
  if (!text || lower.includes("server_error")) return "요청 처리 중 오류가 발생했습니다.";

  return text;
};

const callGemini = async <T>(action: GeminiAction, payload: Record<string, unknown>): Promise<T> => {
  let clientPayload: { fingerprint: string } | undefined;
  try {
    const fingerprint = await getClientFingerprint();
    clientPayload = { fingerprint };
  } catch (error) {
    clientPayload = undefined;
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch("/api/youtube_script/gemini", {
    method: "POST",
    headers,
    body: JSON.stringify({ action, payload, client: clientPayload }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(toUserMessage(errorText));
  }

  return (await response.json()) as T;
};

export const analyzeTranscript = async (
  transcript: string,
  category: string,
  videoTitle?: string,
  fastMode?: boolean
): Promise<AnalysisResult> => {
  return callGemini<AnalysisResult>("analyzeTranscript", {
    transcript,
    category,
    videoTitle,
    fastMode,
  });
};

export const generateIdeas = async (
  analysis: AnalysisResult,
  category: string,
  userKeyword?: string,
  titleFormat?: string
): Promise<string[]> => {
  const data = await callGemini<{ ideas: string[] }>("generateIdeas", {
    analysis,
    category,
    userKeyword,
    titleFormat,
  });
  return data.ideas;
};

export const generateNewPlan = async (
  analysis: AnalysisResult,
  newKeyword: string,
  length: string,
  category: string,
  vlogType?: string,
  scriptStyle?: string
): Promise<NewPlan> => {
  return callGemini<NewPlan>("generateNewPlan", {
    analysis,
    newKeyword,
    length,
    category,
    vlogType,
    scriptStyle,
  });
};

export const generateSsml = async (
  text: string,
  prompt: string
): Promise<string> => {
  const data = await callGemini<{ ssml: string }>("generateSsml", {
    text,
    prompt,
  });
  return data.ssml;
};

export const generateActingPrompt = async (
  text: string
): Promise<string> => {
  const data = await callGemini<{ prompt: string }>("generateActingPrompt", {
    text,
  });
  return data.prompt;
};

