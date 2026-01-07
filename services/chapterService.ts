import type {
  AnalysisResult,
  Chapter,
  ScriptLine,
  StructuredContent,
} from "../types";

type ChapterOutlineResponse = {
  chapters: Chapter[];
  characters: string[];
  newIntent: StructuredContent[];
};

const toUserMessage = (raw: string): string => {
  const text = (raw || "").trim();
  const lower = text.toLowerCase();

  if (lower.includes("rate_limit")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  }
  if (lower.includes("missing_api_key")) {
    return "서버 설정 오류가 발생했습니다. 관리자에게 문의해주세요.";
  }
  if (lower.includes("missing_fields") || lower.includes("invalid_request")) {
    return "요청 데이터가 올바르지 않습니다. 입력값을 확인해주세요.";
  }
  if (!text || lower.includes("server_error")) {
    return "요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }

  return text;
};

const callGemini = async <T>(action: string, payload: Record<string, unknown>): Promise<T> => {
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(toUserMessage(errorText));
  }

  return (await response.json()) as T;
};

export const generateChapterOutline = async (
  analysis: AnalysisResult,
  newKeyword: string,
  length: string,
  category: string,
  _apiKey: string,
  vlogType?: string,
  scriptStyle?: string
): Promise<ChapterOutlineResponse> => {
  return callGemini<ChapterOutlineResponse>("generateChapterOutline", {
    analysis,
    newKeyword,
    length,
    category,
    vlogType,
    scriptStyle,
  });
};

export const generateChapterScript = async (
  chapter: Chapter,
  characters: string[],
  newKeyword: string,
  category: string,
  _apiKey: string,
  allChapters: Chapter[],
  scriptStyle?: string
): Promise<ScriptLine[]> => {
  const data = await callGemini<{ script: ScriptLine[] }>(
    "generateChapterScript",
    {
      chapter,
      characters,
      newKeyword,
      category,
      allChapters,
      scriptStyle,
    }
  );
  return data.script;
};
