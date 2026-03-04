import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, NewPlan } from "./types.js";

const createAI = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

// API 키 검증 함수
export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const ai = createAI(apiKey);
    // 간단한 테스트 요청으로 API 키 검증
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello",
      config: {
        maxOutputTokens: 10,
      },
    });

    // 응답이 있으면 유효한 키
    return !!response.text;
  } catch (error) {
    console.error("API key validation failed:", error);
    return false;
  }
};

const structuredContentSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the section." },
      description: {
        type: Type.STRING,
        description:
          "The detailed content of the section. To ensure high readability, create clear separation between points using double line breaks instead of Markdown lists. Use `**bold text**` to emphasize important keywords or subheadings.",
      },
    },
    required: ["title", "description"],
  },
};

const baseAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    keywords: {
      type: Type.ARRAY,
      description: "A list of 5-10 core keywords from the video, in Korean.",
      items: { type: Type.STRING },
    },
    intent: {
      ...structuredContentSchema,
      description:
        "영상의 기획 의도를 '목표 시청자', '핵심 메시지', '기대 효과' 등의 섹션으로 나누어 구조적으로 분석합니다. 각 설명은 가독성을 높이기 위해, 글머리 기호(-) 대신 문단 사이에 두 번의 줄바꿈을 사용해 공백을 확보하고, 중요한 키워드는 **굵은 글씨**로 강조해주세요.",
    },
    viewPrediction: {
      ...structuredContentSchema,
      description:
        "이 영상의 조회수가 높은 이유를 '감정적 연결', '사회적 공감대', '콘텐츠 구조' 등의 섹션으로 나누어 구조적으로 분석합니다. 여러 항목을 나열할 때는 반드시 글머리 기호(-) 대신 문단 사이에 두 번의 줄바꿈을 사용하여 가독성을 극대화하고, 중요한 소제목은 **굵은 글씨**로 강조해주세요.",
    },
  },
  required: ["keywords", "intent", "viewPrediction"],
};

const storyChannelAnalysisSchema = {
  ...baseAnalysisSchema.properties,
  scriptStructure: {
    type: Type.ARRAY,
    description:
      "A step-by-step breakdown of the script's structure. Each step should have a title, purpose, and example quotes from the transcript, in Korean.",
    items: {
      type: Type.OBJECT,
      properties: {
        stage: {
          type: Type.STRING,
          description:
            "The stage of the script (e.g., '1단계: 시선 끌기 및 문제/기회 제기').",
        },
        purpose: {
          type: Type.STRING,
          description:
            "The goal of this stage (e.g., '목적 (무엇을 판단/생산할지)').",
        },
        quotes: {
          type: Type.ARRAY,
          description:
            "스크립트에서 이 단계를 가장 잘 보여주는 직접적인 인용구입니다. 각 인용구에는 대사가 나오는 시간(타임스탬프, 예: '01:23')을 반드시 포함해야 합니다. 스크립트에 타임스탬프가 없다면, 영상의 전체 길이를 고려하여 예상 시간을 MM:SS 형식으로 기재해주세요.",
          items: {
            type: Type.OBJECT,
            properties: {
              timestamp: {
                type: Type.STRING,
                description: "인용구의 타임스탬프 (MM:SS 형식).",
              },
              text: { type: Type.STRING, description: "인용구의 내용." },
            },
            required: ["timestamp", "text"],
          },
        },
      },
      required: ["stage", "purpose", "quotes"],
    },
  },
  openingStyle: {
    type: Type.OBJECT,
    description: "원본 대본의 도입부 스타일 분석. 처음 1-3개 대사의 어조, 문체, 시작 방식을 상세히 분석합니다.",
    properties: {
      tone: {
        type: Type.STRING,
        description: "도입부의 어조 (예: 친근하고 편안한 / 긴박하고 극적인 / 신비롭고 몰입감 있는 / 유머러스하고 가벼운)",
      },
      startMethod: {
        type: Type.STRING,
        description: "시작 방식 (예: 질문으로 시작 / 극적인 상황 제시 / 일상적 대화로 시작 / 충격적 사실 공개)",
      },
      exampleLines: {
        type: Type.ARRAY,
        description: "도입부의 실제 대사 예시 (처음 2-3줄)",
        items: { type: Type.STRING },
      },
      styleDescription: {
        type: Type.STRING,
        description: "도입부 스타일에 대한 상세한 설명 (예: '평범한 일상 상황으로 시작하여 점차 긴장감을 높이는 방식' / '청자에게 직접 질문을 던지며 공감대를 형성' / '충격적인 고백으로 시작하여 시청자의 호기심을 자극')",
      },
    },
    required: ["tone", "startMethod", "exampleLines", "styleDescription"],
  },
};

const newPlanBaseSchema = {
  newIntent: {
    ...structuredContentSchema,
    description:
      "새로운 영상의 기획 의도를 '목표', '핵심 컨셉', '시청자에게 줄 가치' 등의 섹션으로 나누어 구조적으로 작성합니다. 각 설명은 가독성을 높이기 위해, 글머리 기호(-) 대신 문단 사이에 두 번의 줄바꿈을 사용해 공백을 확보하고, 중요한 키워드는 **굵은 글씨**로 강조해주세요.",
  },
};

const storyChannelNewPlanSchema = {
  type: Type.OBJECT,
  properties: {
    ...newPlanBaseSchema,
    characters: {
      type: Type.ARRAY,
      description:
        "대본에 등장하는 모든 인물 또는 화자의 목록입니다. (예: '나레이터', '출연자 A')",
      items: { type: Type.STRING },
    },
    scriptWithCharacters: {
      type: Type.ARRAY,
      description:
        "새로운 영상에 대한 상세한, 한 줄 한 줄의 대본입니다. 각 객체는 화자, 대사, 타임스탬프(예상 시간)만 포함하며, 대사(line)에는 순수 대본 본문만 작성합니다.",
      items: {
        type: Type.OBJECT,
        properties: {
          character: {
            type: Type.STRING,
            description: "이 대사를 말하는 인물 또는 화자입니다.",
          },
          line: {
            type: Type.STRING,
            description:
              "이 대사의 대화 또는 행동입니다. 라벨 없이 순수 대본 본문만 작성하세요. 예: '내레이션:', '이미지 프롬프트:' 같은 메타 문구 금지.",
          },
          timestamp: {
            type: Type.STRING,
            description:
              "이 대사가 등장할 예상 시간 (MM:SS 형식, 예: '00:15', '01:30'). **중요**: 한국어 낭독 속도는 **분당 약 300-350자(약 5-6자/초)**입니다. 각 대사의 글자 수를 세고, 이전 대사들의 누적 시간을 더해 정확한 타임스탬프를 계산하세요. 예를 들어, 50자 대사는 약 8-10초가 소요됩니다. 대사 사이에 자연스러운 호흡(1-2초)도 고려하세요.",
          },
        },
        required: ["character", "line", "timestamp"],
      },
    },
  },
  required: ["newIntent", "characters", "scriptWithCharacters"],
};

const structuredOutlinePlanSchema = {
  type: Type.OBJECT,
  properties: {
    ...newPlanBaseSchema,
    scriptOutline: {
      type: Type.ARRAY,
      description:
        "A step-by-step breakdown of the new video's outline. Each step should have a title, purpose, and detailed content in Korean. The details must be pure script content only.",
      items: {
        type: Type.OBJECT,
        properties: {
          stage: {
            type: Type.STRING,
            description: "The stage of the outline (e.g., '1단계: 도입부').",
          },
          purpose: {
            type: Type.STRING,
            description: "The goal of this stage.",
          },
          details: {
            type: Type.STRING,
            description:
              "Detailed content for this stage. Write only pure script content without labels or meta text. Do not include phrases like '내레이션:' or '이미지 프롬프트:'.",
          },
        },
        required: ["stage", "purpose", "details"],
      },
    },
  },
  required: ["newIntent", "scriptOutline"],
};

const ideaSchema = {
  type: Type.OBJECT,
  properties: {
    ideas: {
      type: Type.ARRAY,
      description:
        "A list of 5 new video topic ideas or product recommendations, in Korean.",
      items: { type: Type.STRING },
    },
  },
  required: ["ideas"],
};

const formattedIdeasSchema = {
  type: Type.OBJECT,
  properties: {
    ideas: {
      type: Type.ARRAY,
      description:
        "A list of reformatted ideas that match the given title style. Must keep the same order and count.",
      items: { type: Type.STRING },
    },
  },
  required: ["ideas"],
};

const reformatTopicSchema = {
  type: Type.OBJECT,
  properties: {
    reformattedTopic: {
      type: Type.STRING,
      description: "The reformatted topic in the requested title style.",
    },
  },
  required: ["reformattedTopic"],
};

const normalizeIdeaList = (items: unknown): string[] => {
  if (!Array.isArray(items)) return [];
  const normalized = items
    .map((item) => String(item || "").replace(/^["'\-\d\.\)\s]+/, "").trim())
    .filter((item) => item.length > 0)
    .slice(0, 6);
  return Array.from(new Set(normalized));
};

const extractIdeasFromLooseText = (text: string): string[] => {
  const trimmed = (text || "").trim();
  if (!trimmed) return [];

  // 1) JSON 블록 내 ideas 배열 우선 추출
  const ideasMatch = trimmed.match(/"ideas"\s*:\s*\[([\s\S]*?)\]/i);
  if (ideasMatch) {
    const quoted = ideasMatch[1].match(/"([^"]+)"/g) || [];
    const fromQuoted = normalizeIdeaList(quoted.map((q) => q.replace(/^"|"$/g, "")));
    if (fromQuoted.length >= 3) return fromQuoted;
  }

  // 2) 일반 줄 목록 추출
  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^[-*]\s*/, ""))
    .map((line) => line.replace(/^\d+\s*[\.\)]\s*/, ""))
    .filter((line) => line.length > 3)
    .filter((line) => !/^\{|\}$|^\[|\]$|^"ideas"\s*:/.test(line));
  return normalizeIdeaList(lines);
};

const buildTitleStyleHints = (titleFormat?: string) => {
  const sample = String(titleFormat || "").trim();
  return {
    hasQuote: /["'“”‘’]/u.test(sample),
    hasEllipsis: /\.{2,}|…/u.test(sample),
    hasQuestion: /\?/u.test(sample),
    hasExclaim: /!/u.test(sample),
    hasKoreanSlang: /ㄷㄷ|ㅁㅊ|실화|레전드|소름/u.test(sample),
  };
};

const stylizeIdeaWithTitleFormat = (idea: string, titleFormat?: string): string => {
  const base = String(idea || "").trim();
  if (!base || !titleFormat) return base;

  const hints = buildTitleStyleHints(titleFormat);
  let result = base;

  if (hints.hasQuote && !/["'“”‘’]/u.test(result)) {
    const words = result.split(/\s+/).filter(Boolean);
    const cutIndex = Math.max(2, Math.min(5, Math.ceil(words.length * 0.45)));
    const head = words.slice(0, cutIndex).join(" ");
    const tail = words.slice(cutIndex).join(" ");
    if (head) {
      result = `"${head}${hints.hasEllipsis ? "..." : ""}" ${tail}`.trim();
    }
  }

  if (hints.hasEllipsis && !/\.{2,}|…/u.test(result)) {
    result = result.replace(/"([^"]+)"/u, '"$1..."');
    if (!/\.{2,}|…/u.test(result)) {
      result = `${result}...`;
    }
  }

  if (hints.hasKoreanSlang && !/ㄷㄷ|ㅁㅊ|실화|레전드|소름/u.test(result)) {
    result = `${result} ㄷㄷ`;
  }

  if (hints.hasQuestion && !/\?/u.test(result)) {
    result = `${result}?`;
  } else if (hints.hasExclaim && !/!/u.test(result)) {
    result = `${result}!`;
  }

  return result.trim();
};

const buildDeterministicIdeas = (
  analysis: AnalysisResult,
  category: string,
  userKeyword?: string,
  titleFormat?: string
): string[] => {
  const seed = normalizeIdeaList([
    ...(analysis.keywords || []),
    ...(analysis.intent || []).map((item) => item?.title || ""),
    ...(analysis.intent || []).map((item) => item?.description || ""),
    userKeyword || "",
  ]).slice(0, 10);

  const core = seed.length ? seed : ["핵심 주제", "실전 사례", "비교 분석", "돈 버는 방법", "로드맵", "체크리스트"];
  const templates = [
    `${core[0] || "핵심 주제"}의 숨은 구조, 다른 시장에 적용해보면`,
    `${core[1] || "실전 사례"}로 보는 ${category} 수익화 패턴`,
    `${core[2] || "비교 분석"} 관점으로 재해석한 돈 되는 소재`,
    `${core[3] || "돈 버는 방법"}으로 연결되는 인접 업종 아이디어`,
    `${core[4] || "로드맵"} 기반으로 만든 현실 실행 시나리오`,
    `${core[5] || "체크리스트"}만 바꿔도 달라지는 결과 설계`,
  ];

  const ideas = normalizeIdeaList(templates).map((idea) => stylizeIdeaWithTitleFormat(idea, titleFormat));
  return ideas.slice(0, 6);
};

export const analyzeTranscript = async (
  transcript: string,
  category: string,
  apiKey: string,
  videoTitle?: string,
  fastMode: boolean = false
): Promise<AnalysisResult> => {
  try {
    const ai = createAI(apiKey);
    const normalizedTranscript = (transcript || "").trim();

    const fullAnalysisSchema = {
      type: Type.OBJECT,
      properties: storyChannelAnalysisSchema,
      required: [...baseAnalysisSchema.required, "scriptStructure", "openingStyle"],
    };

    const fastAnalysisSchema = {
      type: Type.OBJECT,
      properties: baseAnalysisSchema.properties,
      required: baseAnalysisSchema.required,
    };

    const analysisContext = videoTitle
      ? `다음은 제목이 "${videoTitle}"인 성공적인 '${category}' 카테고리 YouTube 동영상입니다. 영상의 제목과 스크립트를 종합적으로 고려하여 심층적으로 분석하고, 각 항목을 지정된 구조에 맞춰 JSON 형식으로 제공해주세요:`
      : `다음은 성공적인 '${category}' 카테고리 YouTube 동영상의 스크립트입니다. 이 카테고리의 특성을 고려하여 심층적으로 분석하고, 각 항목을 지정된 구조에 맞춰 JSON 형식으로 제공해주세요:`;

    // 매우 긴 대본의 경우 스마트 샘플링 (앞 60% + 뒤 40%)
    let transcriptToAnalyze = normalizedTranscript;
    const MAX_CHARS = 100000; // 100,000자까지는 전체 분석
    
    if (normalizedTranscript.length > MAX_CHARS) {
      const frontPortion = Math.floor(MAX_CHARS * 0.6);
      const backPortion = Math.floor(MAX_CHARS * 0.4);
      const front = normalizedTranscript.slice(0, frontPortion);
      const back = normalizedTranscript.slice(-backPortion);
      transcriptToAnalyze = front + "\n\n[... 중간 부분 생략 ...]\n\n" + back;
      console.log(`[analyzeTranscript] 긴 대본 샘플링: ${normalizedTranscript.length}자 -> ${transcriptToAnalyze.length}자`);
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${analysisContext}\n\n스크립트:\n---\n${transcriptToAnalyze}\n---`,
      config: {
        systemInstruction: `당신은 '${category}' 전문 YouTube 콘텐츠 전략가입니다. 당신의 임무는 비디오 스크립트를 분석하고 벤치마킹을 위해 핵심 요소에 대한 구조화된 분석을 제공하는 것입니다. \n\n중요: 응답 시간을 단축하기 위해 'scriptStructure'는 가장 중요한 핵심 단계 10-15개로 요약해서 구성해주세요. 모든 텍스트는 평문으로 작성하고, 마크다운 특수문자(*, **, _, __, #, - 등)를 절대 사용하지 마세요. 문단 사이는 두 번의 줄바꿈으로 구분하세요. 반드시 완전한 JSON 형식으로 응답해주세요.`,
        responseMimeType: "application/json",
        responseSchema: fastMode ? fastAnalysisSchema : fullAnalysisSchema,
        maxOutputTokens: 32768,
        temperature: 0.7,
      },
    });

    const jsonText = response.text.trim();

    // JSON 파싱 전에 응답 검증
    if (!jsonText) {
      throw new Error('EMPTY_RESPONSE: API 응답이 비어있습니다');
    }

    // JSON이 완전한지 간단히 확인 (중괄호 균형)
    const openBraces = (jsonText.match(/{/g) || []).length;
    const closeBraces = (jsonText.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      console.error('JSON 불균형 감지:', {
        openBraces,
        closeBraces,
        textLength: jsonText.length,
        textPreview: jsonText.substring(0, 500),
        textEnd: jsonText.substring(jsonText.length - 500)
      });
      
      // JSON 자동 복구 시도
      let fixedJson = jsonText;
      const deficit = openBraces - closeBraces;
      if (deficit > 0) {
        // 닫는 괄호 추가
        fixedJson = jsonText + '}'.repeat(deficit);
        console.log('JSON 복구 시도:', { deficit, fixedLength: fixedJson.length });
        
        try {
          const recovered = JSON.parse(fixedJson);
          console.log('JSON 복구 성공');
          return recovered as AnalysisResult;
        } catch (e) {
          console.error('JSON 복구 실패:', e);
        }
      }
      
      throw new Error(`대본 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.`);
    }

    // JSON 파싱 시도 및 상세한 에러 처리
    try {
      return JSON.parse(jsonText) as AnalysisResult;
    } catch (parseError: any) {
      console.error('JSON Parse Error:', {
        error: parseError.message,
        jsonText: jsonText.substring(0, 500), // 첫 500자만 로깅
        fullLength: jsonText.length
      });
      throw new Error(`JSON_PARSE_ERROR: AI 응답을 파싱할 수 없습니다 (길이: ${jsonText.length}자)`);
    }
  } catch (error: any) {
    console.error("Error analyzing transcript:", error);

    let userMessage = "[오류] 스크립트 분석 중 오류가 발생했습니다.\n\n";

    const errorString = JSON.stringify(error);
    const errorMessage = error.message || '';

    if (errorString.includes('SERVICE_DISABLED') || errorString.includes('PERMISSION_DENIED') || errorMessage.includes('has not been used in project') || errorMessage.includes('is disabled')) {
      userMessage += "[원인]\n- API 키의 Generative Language API가 비활성화되어 있습니다\n- 또는 API 키가 잘못되었습니다\n\n[해결 방법]\n";
      userMessage += "1. Google AI Studio (aistudio.google.com)에서 새 API 키를 발급받으세요\n";
      userMessage += "2. 기존 API 키를 사용 중이라면, Google Cloud Console에서 'Generative Language API'를 활성화하세요\n";
      userMessage += "3. API 키를 새로 발급받은 경우, 5-10분 정도 기다린 후 다시 시도하세요\n\n";
      userMessage += "[API 키 재발급 방법]\n";
      userMessage += "- https://aistudio.google.com/app/apikey 방문\n";
      userMessage += "- 'Create API key' 버튼 클릭\n";
      userMessage += "- 새 API 키를 복사하여 사용하세요\n";
    } else if (errorMessage.includes('API_KEY') || errorMessage.includes('invalid') || errorString.includes('INVALID_ARGUMENT')) {
      userMessage += "[원인]\n- API 키가 유효하지 않거나 만료되었습니다\n\n[해결 방법]\n- API 키를 다시 확인하고 재설정해주세요\n- API 키 발급 가이드를 참고하여 새로운 키를 발급받으세요";
    } else if (errorMessage.includes('quota') || errorString.includes('RESOURCE_EXHAUSTED')) {
      userMessage += "[원인]\n- API 사용량이 초과되었습니다\n\n[해결 방법]\n- 잠시 후 다시 시도해주세요\n- Google AI Studio에서 API 사용량을 확인해주세요";
    } else if (errorMessage.includes('rate') || errorString.includes('RATE_LIMIT')) {
      userMessage += "[원인]\n- API 요청이 너무 빠르게 발생했습니다\n\n[해결 방법]\n- 10초 정도 기다린 후 다시 시도해주세요";
    } else if (errorMessage.includes('JSON_PARSE_ERROR') || errorMessage.includes('Unexpected end of JSON') || errorMessage.includes('JSON_INCOMPLETE')) {
      userMessage += "[원인]\n- AI 응답이 완료되기 전에 중단되었습니다\n- 스크립트가 너무 길어서 응답이 잘렸을 수 있습니다\n\n[해결 방법]\n- 스크립트를 짧게 나눠서 다시 시도해주세요 (권장: 3,000자 이하)\n- 잠시 후 다시 시도해주세요";
    } else if (errorMessage.includes('EMPTY_RESPONSE')) {
      userMessage += "[원인]\n- AI가 응답을 생성하지 못했습니다\n- 입력 스크립트에 문제가 있을 수 있습니다\n\n[해결 방법]\n- 스크립트 내용을 확인해주세요\n- 특수 문자나 이모지를 제거하고 다시 시도해주세요";
    } else {
      userMessage += "[가능한 원인]\n- 스크립트 길이가 너무 길거나 형식이 올바르지 않습니다\n- AI 서버 일시적 오류\n- 네트워크 연결 문제\n\n[해결 방법]\n- 스크립트를 짧게 나눠서 다시 시도해주세요\n- 잠시 후 다시 시도해주세요";
    }

    // 상세 오류 정보 추가
    userMessage += `\n\n[상세 정보]\n${errorMessage || '알 수 없는 오류'}`;
    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(0, 3).join('\n');
      userMessage += `\n${stackLines}`;
    }

    throw new Error(userMessage);
  }
};

export const generateIdeas = async (
  analysis: AnalysisResult,
  category: string,
  apiKey: string,
  userKeyword?: string,
  titleFormat?: string
): Promise<string[]> => {
  const maxRetries = 2;
  let lastError: any = null;
  const analysisString = JSON.stringify(
    {
      keywords: analysis.keywords,
      intent: analysis.intent,
      scriptStructure: (analysis.scriptStructure || []).map((stage) => ({
        stage: stage.stage,
        purpose: stage.purpose,
      })),
      openingStyle: analysis.openingStyle
        ? {
          tone: analysis.openingStyle.tone,
          startMethod: analysis.openingStyle.startMethod,
          styleDescription: analysis.openingStyle.styleDescription,
        }
        : undefined,
    },
    null,
    2
  );

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const ai = createAI(apiKey);

      const isShoppingReview = category === "쇼핑 리뷰";
      const sourceKeywords = normalizeIdeaList((analysis.keywords || []).slice(0, 8));
      const keywordInstruction = userKeyword
        ? `\n\n중요: "${userKeyword}"를 반드시 포함하거나 강하게 연관된 방향으로 제안하세요.`
        : "";

      const titleFormatInstruction = titleFormat
        ? `\n\n제목 형식 기준(강제):\n- 아래 예시 제목의 말투/리듬/문장 골격/후킹 방식(따옴표, ... , ㄷㄷ, 경고형 결론 등)을 강하게 따르세요.\n- 단, 예시 제목을 복붙하거나 6자 이상 연속 복사 금지.\n- 소재는 새롭게 바꾸고 형식만 유지하세요.\n- 결과는 모두 "유튜브 썸네일에 바로 쓸 수 있는 한 줄 제목"이어야 합니다.\n\n예시 제목:\n${titleFormat}\n`
        : "";

      const noveltyInstruction = `

Novelty rules (required):
- Keep structure/tone/hook logic of the benchmark script, but replace material with new material.
- For each idea, change at least one of: industry, target audience, or concrete case.
- Cover multiple expansion ranges across 6 ideas:
  1) adjacent topic (similar mechanism),
  2) broader category topic,
  3) same audience with a different monetization angle.
- Do NOT reuse specific source nouns if alternatives exist. Source keywords: ${sourceKeywords.join(", ") || "none"}.
- Ideas must be distinct from each other.
`;

      const prompt = isShoppingReview
        ? `다음은 사용자가 입력한 벤치마킹 대본 분석입니다. 이 구조를 참고해 "쇼핑 리뷰" 결은 유지하되 소재는 새로운 주제 6개를 만드세요.${keywordInstruction}${titleFormatInstruction}${noveltyInstruction}\n\n출력 규칙:\n- 한국어 JSON만 출력: {"ideas":["..."]}\n- 각 아이디어는 제목형 한 줄\n- 입력 대본과 동일 제품/브랜드/사례 재사용 금지\n\n분석 데이터:\n${analysisString}`
        : `다음은 사용자가 입력한 벤치마킹 대본 분석입니다. 입력 대본과 유사한 전개 방식은 유지하되, 소재는 새로운 방향으로 확장된 주제 6개를 만드세요.${keywordInstruction}${titleFormatInstruction}${noveltyInstruction}\n\n출력 규칙:\n- 한국어 JSON만 출력: {"ideas":["..."]}\n- 각 아이디어는 제목형 한 줄\n- 입력 대본의 핵심 구조(문제 제기 -> 이유 설명 -> 실행/결론)는 참고하되 소재는 새롭게 변주\n\n분석 데이터:\n${analysisString}`;

      const systemInstruction = isShoppingReview
        ? "You are a Korean YouTube shopping-review title strategist. Generate 6 highly clickable topic titles in Korean, with strong stylistic mimicry but no copying."
        : "You are a Korean YouTube title strategist. Generate 6 highly clickable topic titles in Korean. Preserve structure intent, but diversify subject matter.";

      console.log(`[generateIdeas] 시도 ${attempt + 1}/${maxRetries + 1}`);

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: ideaSchema,
          maxOutputTokens: 2048,
          temperature: 0.8, // 재시도 시 다양한 응답 유도
        },
      });

      const jsonText = response.text.trim();

      // JSON 파싱 전에 응답 검증
      if (!jsonText) {
        throw new Error('EMPTY_RESPONSE: API 응답이 비어있습니다');
      }

      // JSON이 완전한지 간단히 확인 (중괄호 균형)
      const openBraces = (jsonText.match(/{/g) || []).length;
      const closeBraces = (jsonText.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        console.error('JSON 불균형 감지:', {
          attempt: attempt + 1,
          openBraces,
          closeBraces,
          textLength: jsonText.length,
          preview: jsonText.substring(0, 100)
        });

        // 마지막 시도가 아니면 재시도
        if (attempt < maxRetries) {
          console.log('재시도 중...');
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // 지수 백오프
          continue;
        }
        const recoveredIdeas = extractIdeasFromLooseText(jsonText);
        if (recoveredIdeas.length >= 3) {
          console.log(`[generateIdeas] JSON 불완전 응답에서 아이디어 복구 성공: ${recoveredIdeas.length}개`);
          return recoveredIdeas.map((idea) => stylizeIdeaWithTitleFormat(idea, titleFormat));
        }
        throw new Error(`JSON_INCOMPLETE: AI 응답이 불완전합니다. 잠시 후 다시 시도해주세요.`);
      }

      try {
        const result = JSON.parse(jsonText);
        console.log(`[generateIdeas] 성공 - ${result.ideas?.length || 0}개 아이디어 생성`);
        const parsedIdeas = normalizeIdeaList(result.ideas);
        if (parsedIdeas.length >= 3) {
          if (titleFormat) {
            try {
              const formatPrompt = `다음은 AI가 만든 주제 아이디어 목록입니다. 아래 예시 제목의 형식(말투/리듬/문장 길이/후킹 구조/기호 사용)을 강하게 적용해, 각 아이디어를 더 클릭되는 제목으로 다시 작성하세요.\n\n반드시 지킬 것:\n- "소재"는 현재 아이디어의 의미를 유지하고, "형식"만 예시 제목을 따르세요.\n- 예시 제목 문구를 복붙하지 마세요.\n- 예시 제목에서 6자 이상 연속 복사 금지.\n- 결과는 한 줄 제목만, 아이디어 개수/순서 유지.\n- 결과는 JSON으로만 반환: {"ideas":["..."]}\n\n예시 제목:\n${titleFormat}\n\n아이디어 목록:\n${parsedIdeas.map((idea: string, index: number) => `${index + 1}. ${idea}`).join("\n")}`;

              const formatResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: formatPrompt,
                config: {
                  systemInstruction:
                    "You are a Korean YouTube title editor. Output JSON only. Do not copy the example title.",
                  responseMimeType: "application/json",
                  responseSchema: formattedIdeasSchema,
                  maxOutputTokens: 2048,
                  temperature: 0.5,
                },
              });

              const formatJson = formatResponse.text.trim();
              if (formatJson) {
                const formatted = JSON.parse(formatJson);
                const formattedIdeas = normalizeIdeaList(formatted.ideas);
                if (formattedIdeas.length === parsedIdeas.length) {
                  return formattedIdeas.map((idea) => stylizeIdeaWithTitleFormat(idea, titleFormat));
                }
              }
            } catch (formatError) {
              console.warn("Idea formatting failed, fallback to raw ideas.", formatError);
            }
          }
          return parsedIdeas.map((idea) => stylizeIdeaWithTitleFormat(idea, titleFormat));
        }
        throw new Error("IDEAS_EMPTY: 아이디어 배열이 비어 있습니다");
      } catch (parseError: any) {
        console.error('JSON Parse Error:', {
          attempt: attempt + 1,
          error: parseError.message,
          jsonText: jsonText.substring(0, 200)
        });
        const recoveredIdeas = extractIdeasFromLooseText(jsonText);
        if (recoveredIdeas.length >= 3) {
          console.log(`[generateIdeas] 파싱 실패 응답에서 아이디어 복구 성공: ${recoveredIdeas.length}개`);
          return recoveredIdeas.map((idea) => stylizeIdeaWithTitleFormat(idea, titleFormat));
        }

        // 마지막 시도가 아니면 재시도
        if (attempt < maxRetries) {
          console.log('JSON 파싱 실패, 재시도 중...');
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }

        throw new Error(`JSON_PARSE_ERROR: AI 응답을 파싱할 수 없습니다`);
      }
    } catch (error: any) {
      lastError = error;

      // 재시도 불가능한 오류는 즉시 던지기
      const errorString = JSON.stringify(error);
      const errorMessage = error.message || '';

      if (
        errorString.includes('SERVICE_DISABLED') ||
        errorString.includes('PERMISSION_DENIED') ||
        errorString.includes('API_KEY') ||
        errorString.includes('INVALID_ARGUMENT') ||
        errorMessage.includes('has not been used in project')
      ) {
        // API 키 관련 오류는 재시도 불가
        throw error;
      }

      // 마지막 시도가 아니면 재시도
      if (attempt < maxRetries) {
        console.log(`시도 ${attempt + 1} 실패, ${maxRetries - attempt}번 남음:`, errorMessage);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  // 모든 재시도 실패
  const error = lastError || new Error('알 수 없는 오류');
  console.error("Error generating ideas (모든 재시도 실패):", error);

  // 최종 폴백: 스키마 없이 텍스트로 아이디어 재생성 시도
  try {
    const ai = createAI(apiKey);
    const backupPrompt = `아래 분석을 바탕으로 한국어 영상 주제 아이디어 6개를 생성하세요.
- 줄바꿈으로만 출력하세요.
- 각 줄은 1개의 아이디어 제목만 작성하세요.
- 번호/불릿/JSON/코드블록 금지.
- 기존 대본의 핵심 소재를 그대로 재사용하지 마세요.
- 6개 안에 인접 주제/상위 카테고리/다른 수익각도 아이디어를 반드시 섞으세요.
${userKeyword ? `- "${userKeyword}"와 밀접한 주제를 포함하세요.` : ""}
${titleFormat ? `- 제목 형식은 다음 예시의 말투와 리듬을 따르세요: ${titleFormat}` : ""}

분석:
${analysisString}`;

    const backupResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: backupPrompt,
      config: {
        maxOutputTokens: 768,
        temperature: 0.7,
      },
    });
    const backupText = backupResponse.text?.trim() || "";
    const backupIdeas = extractIdeasFromLooseText(backupText);
    if (backupIdeas.length >= 3) {
      console.log(`[generateIdeas] 최종 폴백 성공: ${backupIdeas.length}개`);
      return backupIdeas.map((idea) => stylizeIdeaWithTitleFormat(idea, titleFormat));
    }
  } catch (backupError) {
    console.warn("[generateIdeas] 최종 폴백 실패", backupError);
  }

  // JSON 계열 오류는 최종적으로 로컬 규칙 기반 아이디어를 반환해 UX 단절을 방지
  const finalErrorMessage = String(error?.message || "");
  if (
    finalErrorMessage.includes("JSON_INCOMPLETE") ||
    finalErrorMessage.includes("JSON_PARSE_ERROR") ||
    finalErrorMessage.includes("EMPTY_RESPONSE") ||
    finalErrorMessage.includes("Unexpected end of JSON")
  ) {
    const deterministicIdeas = buildDeterministicIdeas(analysis, category, userKeyword, titleFormat);
    if (deterministicIdeas.length >= 3) {
      console.log(`[generateIdeas] 로컬 규칙 폴백 반환: ${deterministicIdeas.length}개`);
      return deterministicIdeas;
    }
  }

  let userMessage = "[오류] 아이디어 생성 중 오류가 발생했습니다.\n\n";

  const errorString = JSON.stringify(error);
  const errorMessage = error.message || '';

  if (errorString.includes('SERVICE_DISABLED') || errorString.includes('PERMISSION_DENIED') || errorMessage.includes('has not been used in project') || errorMessage.includes('is disabled')) {
    userMessage += "[원인]\n- API 키의 Generative Language API가 비활성화되어 있습니다\n\n[해결 방법]\n";
    userMessage += "1. https://aistudio.google.com/app/apikey 에서 새 API 키를 발급받으세요\n";
    userMessage += "2. 기존 API 키 사용 시, Google Cloud Console에서 'Generative Language API'를 활성화하세요\n";
    userMessage += "3. API 키를 새로 발급받은 경우, 5-10분 정도 기다린 후 다시 시도하세요";
  } else if (errorMessage.includes('API_KEY') || errorMessage.includes('invalid') || errorString.includes('INVALID_ARGUMENT')) {
    userMessage += "[원인]\n- API 키가 유효하지 않거나 만료되었습니다\n\n[해결 방법]\n- API 키를 다시 확인하고 재설정해주세요";
  } else if (errorMessage.includes('quota') || errorString.includes('RESOURCE_EXHAUSTED')) {
    userMessage += "[원인]\n- API 사용량이 초과되었습니다\n\n[해결 방법]\n- 잠시 후 다시 시도해주세요\n- Google AI Studio에서 API 사용량을 확인해주세요";
  } else if (errorMessage.includes('rate') || errorString.includes('RATE_LIMIT')) {
    userMessage += "[원인]\n- API 요청이 너무 빠르게 발생했습니다\n\n[해결 방법]\n- 10초 정도 기다린 후 다시 시도해주세요";
  } else if (errorMessage.includes('JSON_PARSE_ERROR') || errorMessage.includes('Unexpected end of JSON') || errorMessage.includes('JSON_INCOMPLETE')) {
    userMessage += "[원인]\n- AI 응답이 완료되기 전에 중단되었습니다 (3번 재시도 실패)\n\n[해결 방법]\n- 대본 길이를 줄여보세요\n- 5-10분 후 다시 시도해주세요\n- 네트워크 연결 상태를 확인해주세요";
  } else if (errorMessage.includes('EMPTY_RESPONSE')) {
    userMessage += "[원인]\n- AI가 응답을 생성하지 못했습니다\n\n[해결 방법]\n- 잠시 후 다시 시도해주세요";
  } else {
    userMessage += "[가능한 원인]\n- AI 서버 일시적 오류\n- 네트워크 연결 문제\n\n[해결 방법]\n- 잠시 후 다시 시도해주세요\n- 새로고침 후 다시 시도해주세요";
  }

  // 상세 오류 정보 추가
  userMessage += `\n\n[상세 정보]\n${errorMessage || '알 수 없는 오류'}`;
  if (error.stack) {
    const stackLines = error.stack.split('\n').slice(0, 3).join('\n');
    userMessage += `\n${stackLines}`;
  }

  throw new Error(userMessage);
};

export const reformatTopic = async (
  topic: string,
  titleFormat: string,
  apiKey: string
): Promise<string> => {
  try {
    const ai = createAI(apiKey);
    const prompt = `Reformat the following topic to match the given title style. Keep the meaning, keep it concise, and output only the reformatted topic text.\n\nTopic:\n${topic}\n\nTitle Style Example:\n${titleFormat}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "You are a YouTube title editor. Output only the final reformatted topic text, no quotes, no extra commentary.",
        responseMimeType: "application/json",
        responseSchema: reformatTopicSchema,
        maxOutputTokens: 256,
        temperature: 0.4,
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
      throw new Error("EMPTY_RESPONSE: API response was empty");
    }

    try {
      const parsed = JSON.parse(jsonText) as { reformattedTopic: string };
      return parsed.reformattedTopic;
    } catch (parseError: any) {
      console.error("JSON Parse Error (reformatTopic):", {
        error: parseError.message,
        jsonText: jsonText.substring(0, 200),
      });
      throw new Error("JSON_PARSE_ERROR: reformatTopic response parsing failed");
    }
  } catch (error: any) {
    console.error("Error reformatting topic:", error);
    throw new Error(
      "Topic reformatting failed: " + (error.message || "Unknown error")
    );
  }
};

export const generateNewPlan = async (
  analysis: AnalysisResult,
  newKeyword: string,
  length: string,
  category: string,
  apiKey: string,
  vlogType?: string,
  scriptStyle?: string
): Promise<NewPlan> => {
  const maxRetries = 2;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const ai = createAI(apiKey);

      // scriptStructure에서 원본 대본의 인용구(quotes)를 제거하여
      // 구조와 목적만 전달하고, 원본 대본 내용이 새 대본에 영향을 주지 않도록 함
      const cleanedScriptStructure = analysis.scriptStructure?.map((stage) => ({
        stage: stage.stage,
        purpose: stage.purpose,
        // quotes는 제거 - 원본 대본 내용 누출 방지
      }));

      // 도입부 스타일 정보는 유지 - 새 대본에서 동일한 스타일 적용
      const openingStyleInfo = analysis.openingStyle
        ? `\n\n**원본 대본의 도입부 스타일 (반드시 따라야 함):**
- 어조: ${analysis.openingStyle.tone}
- 시작 방식: ${analysis.openingStyle.startMethod}
- 스타일 특징: ${analysis.openingStyle.styleDescription}
- 예시 대사:
${analysis.openingStyle.exampleLines.map((line, i) => `  ${i + 1}. ${line}`).join('\n')}

**중요:** 새로운 대본의 도입부는 위의 스타일을 정확히 따라야 합니다. "안녕하세요 여러분" 같은 일반적인 인사말이 아니라, 원본 대본과 동일한 톤과 방식으로 시작해야 합니다.`
        : '';

      const analysisString = JSON.stringify(
        {
          keywords: analysis.keywords,
          intent: analysis.intent,
          scriptStructure: cleanedScriptStructure,
        },
        null,
        2
      );

      const getLengthMinutes = (lengthValue: string): number => {
        const hourMatch = lengthValue.match(/(\d+)\s*시간/);
        if (hourMatch) {
          const hours = Number(hourMatch[1]);
          return Number.isFinite(hours) ? hours * 60 : 60;
        }
        const minuteMatch = lengthValue.match(/(\d+)\s*분/);
        if (minuteMatch) {
          const minutes = Number(minuteMatch[1]);
          return Number.isFinite(minutes) ? minutes : 8;
        }
        const fallback = Number(lengthValue);
        return Number.isFinite(fallback) && fallback > 0 ? fallback : 8;
      };

      const getTargetChapters = (minutes: number): number => {
        if (minutes >= 60) return 12;
        if (minutes >= 45) return 9;
        if (minutes >= 30) return 6;
        if (minutes >= 20) return 5;
        if (minutes >= 15) return 4;
        if (minutes >= 8) return 3;
        if (minutes >= 5) return 2;
        return 1;
      };

      const lengthMinutes = getLengthMinutes(length);
      const targetChapters = getTargetChapters(lengthMinutes);
      const minutesPerChapter = Math.max(1, Math.round(lengthMinutes / targetChapters));
      const chapterGuide = `\n\n**챕터 구성 가이드 (${length})**\n- 최소 ${targetChapters}개 이상의 챕터로 구성\n- 챕터당 약 ${minutesPerChapter}분 분량으로 균등하게 배분\n- 각 챕터는 제목/목적/예상 분량/대본을 포함`;
      const scriptStyleGuide =
        scriptStyle === "dialogue"
          ? `

**Script Style: Dialogue**
- Multiple characters speak in turns.
- Keep narration minimal and let dialogue carry the story.`
          : `

**Script Style: Narration**
- Single narrator only (e.g., 'Narrator').
- Do NOT introduce additional characters or character names.`;

      const isStoryChannel = category === "? ??";
      const isVlogChannel = category === "브이로그";
      const is49Channel = category === "49?";
      const isYadamChannel = category === "??";
      const isMukbangChannel = category === "??";
      const isGukppongChannel = category === "??";
      const isNorthKoreaChannel = category === "북한 이슈";
      const isDialogueMode = scriptStyle === "dialogue";
      const useStoryPrompt = (isStoryChannel || is49Channel || isYadamChannel || isGukppongChannel || isNorthKoreaChannel) && isDialogueMode;
      const useStorySchema = useStoryPrompt;
      const schema = useStorySchema ? storyChannelNewPlanSchema : structuredOutlinePlanSchema;

      let contents;

      // 영상 길이에 따른 최소 대본 분량 계산
      const minimumLines = Math.max(20, Math.ceil(lengthMinutes * 4));
      const minimumChars = Math.max(1600, lengthMinutes * 620);
      const minimumCharsPerChapter = Math.max(
        600,
        Math.ceil(minimumChars / Math.max(1, targetChapters))
      );
      const lengthGuideline = `\n\n**영상 길이 가이드 (${length})**
- 최소 ${minimumLines}개 이상의 대사 라인을 생성하세요
- 총 분량은 최소 ${minimumChars.toLocaleString()}자 이상으로 작성하세요
- 챕터별 상세 내용은 최소 ${minimumCharsPerChapter.toLocaleString()}자 이상으로 작성하세요
- 선택한 길이(${lengthMinutes}분)에 맞도록 장면 전개와 설명 밀도를 충분히 확보하세요`;

      const scriptPurityGuide = `

**출력 형식 고정 규칙 (필수)**
- 결과 텍스트는 순수 대본 내용만 작성하세요
- '내레이션:', '나레이션:', '나레이터:', '이미지 프롬프트:' 같은 라벨/메타 문구를 절대 쓰지 마세요
- 이미지 생성 프롬프트 문장(영문 키워드 나열 포함)을 절대 포함하지 마세요
- details/line 필드에는 실제 낭독할 대본 문장만 넣으세요`;

      const lengthGuidelineWithChapters = `${lengthGuideline}${chapterGuide}${scriptStyleGuide}${scriptPurityGuide}`;

      if (useStoryPrompt) {
        contents = `"${newKeyword}"를 주제로 한 완전히 새로운 스토리 영상 기획안을 만들어 주세요. 목표 영상 길이는 약 ${length}입니다.${lengthGuidelineWithChapters}

**절대 규칙:**
- 아래 제공된 분석 자료의 **대본 구조(단계별 흐름)**만 참고하세요
- 원본 영상의 등장인물, 상황, 배경, 대사는 절대 사용하지 마세요
- "${newKeyword}"를 중심으로 완전히 새로운 인물, 상황, 스토리를 창작하세요
${openingStyleInfo}

**중요: 배역 구성 지침**
- '나레이터'만 사용하지 말고, 스토리에 어울리는 다양한 배역을 만들어주세요.
- 배역 예시: 주인공, 친구, 상대방, 엄마, 아빠, 선생님, 동료, 후배, 선배, 지인, 사장님 등
- 스토리의 맥락에 맞는 2~5명의 캐릭터를 등장시켜 대화형 형식으로 작성해주세요.
- 각 캐릭터는 구체적인 역할명(예: '나', '친구 민수', '엄마', '회사 동료')을 사용해주세요.
- 나레이션이 필요한 경우에만 '나레이터'를 사용하되, 대부분의 내용은 캐릭터 간의 대화와 행동으로 표현해주세요.

**참고용 대본 구조 (구조만 차용, 내용은 절대 사용 금지):**

${analysisString}

위 구조의 단계별 흐름(예: 도입→전개→절정→결말)만 참고하여, "${newKeyword}"를 주제로 완전히 새로운 스토리를 창작해주세요. 모든 결과 항목을 지정된 구조에 맞춰 JSON 형식으로 제공해주세요.`;
      } else if (isVlogChannel) {
        const vlogTypePrompts: Record<string, string> = {
          "모닝 루틴":
            "아침 시간대의 루틴을 중심으로, 기상부터 외출 준비까지의 과정을 자연스럽게 보여주세요. 건강한 습관, 아침 식사, 메이크업/스타일링, 출근/등교 준비 등을 포함하세요.",
          다이어트:
            "다이어트 여정과 일상을 담아주세요. 식단 관리, 운동 루틴, 체중/체형 변화, 건강한 습관 만들기, 동기부여와 목표 달성 과정을 솔직하게 공유하세요.",
          여행: "여행지 탐방과 경험을 중심으로 구성하세요. 이동 과정, 명소 방문, 로컬 음식, 숙소 투어, 여행 팁을 자연스럽게 녹여내세요.",
          언박싱:
            "새로 구매한 제품들을 언박싱하고 소개하는 과정을 담아주세요. 구매 동기, 가격, 착용/사용 후기를 솔직하게 전달하세요.",
          패션: "패션과 스타일링을 중심으로 구성하세요. 코디 아이디어, OOTD, 쇼핑 하울, 스타일링 팁, 트렌드 소개를 감각적으로 담아주세요.",
          공부: "공부하는 모습과 학습 방법을 보여주세요. 책상 세팅, 공부 타임랩스, 집중력 유지 팁, 휴식 시간을 자연스럽게 구성하세요.",
          운동: "운동 루틴과 과정을 담아주세요. 준비운동, 본 운동, 식단 관리, 동기부여 메시지를 포함하여 건강한 라이프스타일을 보여주세요.",
          일상: "특별한 테마 없이 하루의 자연스러운 흐름을 담아주세요. 일과, 소소한 행복, 예상치 못한 순간들을 솔직하게 공유하세요.",
          데이트:
            "데이트 과정을 로맨틱하게 담아주세요. 데이트 준비, 만남, 데이트 코스, 둘만의 대화를 감성적으로 표현하세요.",
          요리: "요리 과정과 완성까지를 보여주세요. 레시피 소개, 조리 과정, 플레이팅, 시식 리액션을 자연스럽게 담아주세요.",
        };

        const specificVlogPrompt =
          vlogTypePrompts[vlogType || "일상"] || vlogTypePrompts["일상"];

        contents = `"${newKeyword}"를 주제로 한 "${vlogType || "일상"
          }" 타입의 완전히 새로운 브이로그를 기획해주세요. 목표 영상 길이는 약 ${length}입니다.${lengthGuidelineWithChapters}

**절대 규칙:**
- 아래 제공된 분석 자료의 **대본 구조(단계별 흐름)**만 참고하세요
- 원본 브이로그의 장면, 상황, 대사는 절대 사용하지 마세요
- "${newKeyword}"를 중심으로 완전히 새로운 장면과 상황을 창작하세요

**${vlogType || "일상"} 브이로그 특화 가이드:**
${specificVlogPrompt}

**공통 브이로그 요소:**
- 자연스러운 흐름과 친근한 톤앤매너
- 시청자와의 공감대 형성 (TMI, 솔직한 이야기)
- 편집 리듬: 빠른 컷 전환과 감성적인 BGM
- 시각적 미학: 자연광, 감성적인 색감, 일상의 아름다움 포착
- 썸네일: 자연스럽고 공감 가는 순간

**구성 흐름:**
1. 인트로: 오늘의 브이로그 소개
2. 메인 컨텐츠: ${vlogType || "일상"}에 맞는 자연스러운 전개
3. 하이라이트: 특별한 순간/포인트
4. TMI: 개인적인 생각과 감정 공유
5. 아웃트로: 마무리와 다음 영상 예고

각 장면마다 구체적인 촬영 가이드와 편집 포인트를 포함해주세요.

**참고용 대본 구조 (구조만 차용, 내용은 절대 사용 금지):**

${analysisString}

위 구조의 흐름만 참고하여, "${newKeyword}"를 주제로 완전히 새로운 브이로그 장면과 대사를 창작해주세요. 모든 결과 항목을 지정된 구조에 맞춰 JSON 형식으로 제공해주세요.`;
      } else if (isMukbangChannel) {
        contents = `"${newKeyword}" 음식으로 완전히 새로운 먹방 영상 기획안을 만들어 주세요. 목표 영상 길이는 약 ${length}입니다.${lengthGuidelineWithChapters}

**절대 규칙:**
- 아래 제공된 분석 자료의 **대본 구조(단계별 흐름)**만 참고하세요
- 원본 먹방의 장면, 대사, 리액션은 절대 사용하지 마세요
- "${newKeyword}"를 중심으로 완전히 새로운 장면과 리액션을 창작하세요

**먹방 콘텐츠 가이드:**
- 음식을 먹는 과정을 중심으로, 맛 리액션과 음식 소개를 자연스럽게 담아주세요
- ASMR 요소: 씹는 소리, 조리 소리 등 청각적 만족감
- 음식 디테일: 클로즈업 샷으로 비주얼 강조
- 조리 과정: 요리하는 경우 간단한 레시피 소개
- 솔직한 리액션: 맛, 식감, 온도 등에 대한 자연스러운 반응

**구성 요소:**
1. 인트로: 오늘의 메뉴 소개 및 기대감 조성
2. 음식 준비: 구매 과정 또는 조리 과정 (선택)
3. 첫 입 리액션: 첫 맛의 솔직한 느낌
4. 본격 먹방: 다양한 앵글과 ASMR
5. 총평: 음식에 대한 종합 평가 및 추천

각 장면마다 촬영 팁과 편집 포인트를 포함해주세요.

**참고용 대본 구조 (구조만 차용, 내용은 절대 사용 금지):**

${analysisString}

위 구조의 흐름만 참고하여, "${newKeyword}"를 주제로 완전히 새로운 먹방 장면과 리액션을 창작해주세요. 모든 결과 항목을 지정된 구조에 맞춰 JSON 형식으로 제공해주세요.`;
      } else if (category === "쇼핑 리뷰") {
        contents = `"${newKeyword}" 제품에 대한 완전히 새로운 리뷰 영상 기획안을 만들어 주세요. 목표 영상 길이는 약 ${length}입니다.${lengthGuidelineWithChapters}

**절대 규칙:**
- 아래 제공된 분석 자료의 **대본 구조(단계별 흐름)**만 참고하세요
- 원본 리뷰의 제품 정보, 평가 내용, 대사는 절대 사용하지 마세요
- "${newKeyword}" 제품의 특성에 맞는 완전히 새로운 리뷰 내용을 창작하세요

영상은 '오프닝', '제품 소개', '주요 특징 시연', '장단점 분석', '총평 및 추천'으로 구성되어야 합니다. 이 구조에 맞춰 각 단계별 제목, 목적, 상세 내용이 포함된 구조적인 개요를 작성해주세요.

**참고용 대본 구조 (구조만 차용, 내용은 절대 사용 금지):**

${analysisString}

위 구조의 흐름만 참고하여, "${newKeyword}"를 주제로 완전히 새로운 리뷰 내용을 창작해주세요. 모든 결과 항목을 지정된 구조에 맞춰 JSON 형식으로 제공해주세요.`;
      } else if (category === "49금") {
        contents = `성인 대상의 성숙한 연애/관계 이야기("${newKeyword}")를 다루는 영상 기획안을 만들어 주세요. 목표 영상 길이는 약 ${length}입니다.${lengthGuidelineWithChapters}

**중요: 콘텐츠 가이드라인**
- 선정적이거나 노골적인 표현은 절대 사용하지 마세요
- 성인들의 솔직하고 현실적인 연애 고민, 관계 경험담에 초점
- 유머러스하면서도 품위 있는 스토리텔링
- 공감과 위로를 줄 수 있는 따뜻한 톤
- 교훈이나 인사이트를 담아 의미 있는 내용으로 구성

**콘텐츠 방향:**
- 연애 초기의 설렘과 고민 (썸, 호감, 첫 만남)
- 관계에서 겪는 현실적인 문제와 해결 (다툼, 오해, 화해)
- 이별과 성장 이야기 (극복, 교훈, 새로운 시작)
- 연애 심리와 패턴 분석 (MBTI, 연애 스타일)
- 건강한 관계를 위한 소통과 이해

**스토리텔링 구조:**
1. 후크: 공감 가는 상황 제시
2. 전개: 등장인물의 심리와 행동 묘사
3. 갈등: 관계에서의 현실적인 문제
4. 해결/인사이트: 배울 점이나 교훈
5. 마무리: 시청자에게 위로와 응원 메시지

**배역 구성:**
- '나', '상대방', '친구' 등 자연스러운 대화형 구성
- 각 배역의 심리와 감정선을 섬세하게 표현
- 현실적이고 공감 가는 대사와 상황 연출

모든 내용은 건전하고 교육적인 가치를 지니며, 플랫폼 가이드라인을 100% 준수해야 합니다.

성공적인 동영상 분석 내용:\n\n${analysisString}\n\n이제 위 분석된 성공 구조를 따르되 새로운 키워드 "${newKeyword}"에 초점을 맞춘 완전히 새로운 기획안을 생성해주세요. 원본 대본의 내용을 사용하지 말고, 새로운 스토리와 대사를 창작해주세요. 모든 결과 항목을 지정된 구조에 맞춰 JSON 형식으로 제공해주세요.`;
      } else if (isYadamChannel) {
        contents = `조선시대를 배경으로 한 전통 야담 이야기("${newKeyword}")를 현대적으로 재해석한 영상 기획안을 만들어 주세요. 목표 영상 길이는 약 ${length}입니다.

**중요: 야담 콘텐츠 가이드라인**
- 야담은 조선시대의 민간 설화, 기록, 일화 등을 다루는 전통 스토리텔링입니다
- 역사적 고증과 현대적 재미를 균형있게 배치
- 교훈적이거나 흥미로운 이야기를 통해 옛 선조들의 지혜 전달
- 한국 전통 문화와 정서를 자연스럽게 녹여내기

**콘텐츠 소재:**
- 조선시대 실제 인물들의 일화 (학자, 관리, 선비, 기생 등)
- 전통 설화와 민담 (도깨비, 구미호, 저승사자 등)
- 의적, 협객 이야기
- 조선시대 미스터리와 사건들
- 궁중 야사와 역사적 뒷이야기
- 양반과 평민의 삶, 사회 풍자

**스토리텔링 구조:**
1. 배경 소개: 시대적 배경과 상황 설명
2. 사건 발단: 이야기의 시작과 주요 인물 등장
3. 전개: 갈등과 사건의 전개
4. 절정: 이야기의 하이라이트
5. 결말과 교훈: 이야기의 마무리와 현대적 의미

**배역 구성:**
- 조선시대 인물들: 양반, 선비, 사또, 포졸, 상인, 기생, 무당 등
- 나레이터: 이야기를 풀어가는 전통적인 이야기꾼 톤
- 각 배역의 신분과 시대적 특성을 반영한 말투와 행동

**연출 포인트:**
- 한국 전통 음악(국악) 활용
- 한복, 전통 가옥 등 시대상 반영
- 서예, 한시 등 전통 문화 요소 삽입
- 현대인이 이해하기 쉽도록 적절한 설명 추가

성공적인 동영상 분석 내용:\n\n${analysisString}\n\n이제 위 분석된 성공 구조를 따르되 새로운 키워드 "${newKeyword}"에 초점을 맞춘 완전히 새로운 조선시대 야담 이야기를 창작해주세요. 원본 대본의 내용이나 스토리를 사용하지 말고, 새로운 인물과 사건으로 구성된 독창적인 야담을 만들어주세요. 모든 결과 항목을 지정된 구조에 맞춰 JSON 형식으로 제공해주세요.`;
      } else if (isGukppongChannel) {
        contents = `한국의 우수성과 세계 속에서의 위상을 주제로 한 국뽕 콘텐츠("${newKeyword}")를 기획해 주세요. 목표 영상 길이는 약 ${length}입니다.${lengthGuidelineWithChapters}

**중요: 국뽕 콘텐츠 가이드라인**

국뽕 콘텐츠는 한국의 성취와 우수성을 강조하여 시청자에게 민족적 자긍심과 감정적 만족을 제공하는 콘텐츠입니다.

**핵심 테마:**
1. **국가적 우월성 강조**
   - "한국이 세계를 놀라게 했다"
   - "다른 나라들이 따라할 수 없는 한국만의 것"
   - "세계가 인정한 K-OOO"
   
2. **비교를 통한 우월성 입증**
   - "일본은 못하는데 한국은 해냈다"
   - "미국도 배우러 오는 한국의 OOO"
   - "중국이 따라하려다 실패한 한국 기술"
   
3. **외국인 반응 중심**
   - "외국인들이 충격받은 한국의 OOO"
   - "해외에서 난리난 K-OOO"
   - "외국인들이 인정한 한국 문화"

**심리적 메커니즘:**
- 집단 정체성 강화: "우리 한국인은 특별하다"는 소속감
- 확증 편향 활용: 한국의 긍정적인 면만 선별적으로 제시
- 감정적 카타르시스: 자랑스러움, 뿌듯함, 우월감 제공
- 방어 기제: 역사적 아픔이나 현재의 문제를 성취로 상쇄

**콘텐츠 구성 패턴:**
1. **충격적인 도입부**
   - "외국인들이 한국에 와서 가장 놀란 것은?"
   - "일본 전문가도 인정한 한국의 진짜 실력"
   - "세계가 한국을 보는 진짜 이유"

2. **과장된 타이틀과 썸네일**
   - "세계 1위", "충격", "경악", "난리"
   - 외국인의 놀란 표정 이미지
   - 한국 vs 타국 비교 그래픽

3. **선별적 정보 제시**
   - 한국의 성공 사례만 집중 조명
   - 통계나 순위의 유리한 부분만 발췌
   - 맥락 없는 외국인 칭찬 영상 편집

4. **감정적 음악과 연출**
   - 웅장한 배경음악
   - 애국가나 한국 전통 음악 활용
   - 태극기, 한국 랜드마크 이미지

5. **애국적 결론**
   - "한국인이라 자랑스럽다"
   - "우리가 몰랐던 한국의 진짜 위상"
   - "세계가 부러워하는 대한민국"

**주요 소재 예시:**
- K-POP, K-드라마의 세계적 성공
- 한국 IT 기술 (반도체, 스마트폰, 인터넷 속도)
- 한식의 세계화 (김치, 비빔밥, 한국 BBQ)
- 한국의 경제 성장 (한강의 기적)
- 한국 스포츠 스타들의 활약
- 한국 역사의 자랑스러운 순간들
- 외국인들이 놀라는 한국 문화 (배달 시스템, 편의점, 대중교통)
- 한국의 교육열과 성취
- K-방역, K-뷰티 등 신조어로 표현되는 한국식 시스템

**배역 구성:**
- 나레이터: 자부심 넘치는 톤으로 한국의 우수성 강조
- 외국인 반응자: 감탄하고 놀라는 리액션 표현
- 전문가: 한국의 성취를 객관적으로(?) 인증하는 역할
- 한국인 당사자: 겸손하지만 자랑스러운 태도

**타이틀 예시:**
- "일본인도 충격받은 한국의 진짜 기술력"
- "미국인들이 한국에 와서 가장 부러워한 것"
- "외국인들이 인정한 한국이 세계 최고인 이유"
- "중국이 절대 못 따라하는 한국만의 비밀"
- "세계가 한국을 보는 진짜 시선 (외국인 반응)"
- "유럽인들이 한국 문화에 열광하는 이유"
- "한국인도 몰랐던 세계 속 대한민국의 위상"

**주의사항:**
- 과도한 비하나 혐오 표현은 지양 (건전한 자부심 유지)
- 팩트 체크된 정보 기반 (과장은 OK, 거짓은 NO)
- 타국에 대한 직접적인 비난보다는 한국의 우수성 강조
- 감정적 공감대 형성에 집중

**참고용 대본 구조 (구조만 차용, 내용은 절대 사용 금지):**

${analysisString}

위 구조의 흐름만 참고하여, "${newKeyword}"를 주제로 완전히 새로운 국뽕 스토리와 대사를 창작해주세요. 원본 대본의 사례나 내용은 사용하지 마세요. 모든 결과 항목을 지정된 구조에 맞춰 JSON 형식으로 제공해주세요.`;
      } else if (isNorthKoreaChannel) {
        contents = `북한 관련 이슈와 탈북민 이야기("${newKeyword}")를 다루는 영상 기획안을 만들어 주세요. 목표 영상 길이는 약 ${length}입니다.${lengthGuidelineWithChapters}

**절대 규칙:**
- 아래 제공된 분석 자료의 **대본 구조(단계별 흐름)**만 참고하세요
- 원본 영상의 등장인물, 상황, 배경, 대사는 절대 사용하지 마세요
- "${newKeyword}"를 중심으로 완전히 새로운 인물, 상황, 스토리를 창작하세요

**중요: 북한 이슈 콘텐츠 가이드라인**

북한 이슈 콘텐츠는 북한의 실상과 탈북민의 경험담을 진지하면서도 흥미롭게 다루는 콘텐츠입니다.

**핵심 테마:**
1. **탈북민의 생생한 증언**
   - 북한에서의 실제 생활 경험
   - 탈북 과정의 위험과 역경
   - 남한 적응기와 문화 충격
   - 북한에 두고 온 가족에 대한 그리움

2. **북한 사회의 실상**
   - 북한의 일상생활과 문화
   - 계급 제도와 사회 구조
   - 북한 주민들의 실제 생활상
   - 외부 세계에 대한 북한 주민의 인식

3. **남북 비교와 문화 차이**
   - 같은 언어, 다른 문화
   - 생활 방식의 차이
   - 가치관과 사고방식의 차이
   - 통일에 대한 현실적 고민

**스토리텔링 구조:**
1. 후크: 충격적이거나 흥미로운 북한 관련 사실
2. 배경: 탈북민의 북한 생활 소개
3. 전개: 구체적인 경험담과 에피소드
4. 절정: 가장 인상 깊거나 극적인 순간
5. 마무리: 현재의 삶과 메시지

**배역 구성:**
- '탈북민', '인터뷰어', '친구', '가족' 등
- 북한식 억양과 표현을 자연스럽게 반영
- 감정선을 섬세하게 표현

**주의사항:**
- 북한 주민에 대한 존중과 이해 유지
- 선정적이거나 자극적인 표현 지양
- 팩트 기반의 정보 전달
- 탈북민의 인권과 안전 고려
- 통일과 화해의 메시지 포함

**참고용 대본 구조 (구조만 차용, 내용은 절대 사용 금지):**

${analysisString}

위 구조의 단계별 흐름(예: 도입→전개→절정→결말)만 참고하여, "${newKeyword}"를 주제로 완전히 새로운 북한 이슈 스토리를 창작해주세요. 모든 결과 항목을 지정된 구조에 맞춰 JSON 형식으로 제공해주세요.`;
      } else {
        contents = `"${newKeyword}" 주제에 대한 완전히 새로운 정보성 영상 기획안을 만들어 주세요. 목표 영상 길이는 약 ${length}입니다.${lengthGuidelineWithChapters}

**절대 규칙:**
- 아래 제공된 분석 자료의 **대본 구조(단계별 흐름)**만 참고하세요
- 원본 영상의 정보, 사례, 대사는 절대 사용하지 마세요
- "${newKeyword}"에 맞는 완전히 새로운 정보와 내용을 창작하세요

영상은 '도입(문제 제기)', '본론(핵심 정보 전달)', '결론(요약 및 제언)'의 구조를 가져야 합니다. 이 구조에 맞춰 각 단계별 제목, 목적, 상세 내용이 포함된 구조적인 개요를 작성해주세요.

**참고용 대본 구조 (구조만 차용, 내용은 절대 사용 금지):**

${analysisString}

위 구조의 흐름만 참고하여, "${newKeyword}"를 주제로 완전히 새로운 정보와 내용을 창작해주세요. 모든 결과 항목을 지정된 구조에 맞춰 JSON 형식으로 제공해주세요.`;
      }

      console.log(`[generateNewPlan] 시도 ${attempt + 1}/${maxRetries + 1} - 키워드: ${newKeyword}, 길이: ${length}`);

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          systemInstruction:
            "당신은 창의적인 YouTube 스크립트 작가 겸 기획자입니다. 성공 공식을 바탕으로 새로운 주제에 대한 기획안을 생성합니다. 요청된 카테고리와 영상 길이에 맞춰 결과물의 형식과 분량을 조절해주세요.\n\n**중요: 텍스트 작성 규칙**\n1. 모든 텍스트는 평문으로 작성하세요\n2. 마크다운 특수문자를 절대 사용하지 마세요: *, **, _, __, #, -, >, [], (), `, ~~ 등\n3. 강조가 필요한 경우 자연스러운 문장으로 표현하세요\n4. 대본과 대사는 자연스러운 구어체로 작성하세요\n5. 문단 구분은 두 번의 줄바꿈으로 하세요\n6. 긴 영상의 경우 충분한 분량의 대본을 생성해주세요\n\n나쁜 예: **중요한 내용**, *강조*, # 제목, - 항목\n좋은 예: 중요한 내용, 강조, 제목, 항목",
          responseMimeType: "application/json",
          responseSchema: schema,
          maxOutputTokens: 16384,
          temperature: 0.8,
        },
      });

      const jsonText = response.text.trim();

      // JSON 파싱 전에 응답 검증
      if (!jsonText) {
        throw new Error('EMPTY_RESPONSE: API 응답이 비어있습니다');
      }

      // JSON이 완전한지 간단히 확인 (중괄호 균형)
      const openBraces = (jsonText.match(/{/g) || []).length;
      const closeBraces = (jsonText.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        console.error('JSON 불균형 감지:', {
          attempt: attempt + 1,
          openBraces,
          closeBraces,
          textLength: jsonText.length,
          textPreview: jsonText.substring(0, 200)
        });

        // 마지막 시도가 아니면 재시도
        if (attempt < maxRetries) {
          console.log('JSON 불완전, 재시도 중...');
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1))); // 더 긴 대기
          continue;
        }

        throw new Error(`JSON_INCOMPLETE: AI 응답이 불완전합니다 (길이: ${jsonText.length}자). 더 짧은 키워드로 시도하거나, 잠시 후 다시 시도해주세요.`);
      }

      try {
        const result = JSON.parse(jsonText) as NewPlan;
        console.log(`[generateNewPlan] 성공 - 챕터 ${result.chapters?.length || 0}개 생성`);
        return result;
      } catch (parseError: any) {
        console.error('JSON Parse Error:', {
          attempt: attempt + 1,
          error: parseError.message,
          jsonText: jsonText.substring(0, 200)
        });

        // 마지막 시도가 아니면 재시도
        if (attempt < maxRetries) {
          console.log('JSON 파싱 실패, 재시도 중...');
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
          continue;
        }

        throw new Error(`JSON_PARSE_ERROR: AI 응답을 파싱할 수 없습니다`);
      }
    } catch (error: any) {
      lastError = error;

      // 재시도 불가능한 오류는 즉시 던지기
      const errorString = JSON.stringify(error);
      const errorMessage = error.message || '';

      if (
        errorString.includes('SERVICE_DISABLED') ||
        errorString.includes('PERMISSION_DENIED') ||
        errorString.includes('API_KEY') ||
        errorString.includes('INVALID_ARGUMENT') ||
        errorMessage.includes('has not been used in project')
      ) {
        // API 키 관련 오류는 재시도 불가
        throw error;
      }

      // 마지막 시도가 아니면 재시도
      if (attempt < maxRetries) {
        console.log(`시도 ${attempt + 1} 실패, ${maxRetries - attempt}번 남음:`, errorMessage);
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        continue;
      }
    }
  }

  // 모든 재시도 실패
  const error = lastError || new Error('알 수 없는 오류');
  console.error("Error generating new plan (모든 재시도 실패):", error);

  let userMessage = "[오류] 새로운 기획안 생성 중 오류가 발생했습니다.\n\n";

  const errorString = JSON.stringify(error);
  const errorMessage = error.message || '';

  if (errorString.includes('SERVICE_DISABLED') || errorString.includes('PERMISSION_DENIED') || errorMessage.includes('has not been used in project') || errorMessage.includes('is disabled')) {
    userMessage += "[원인]\n- API 키의 Generative Language API가 비활성화되어 있습니다\n\n[해결 방법]\n";
    userMessage += "1. https://aistudio.google.com/app/apikey 에서 새 API 키를 발급받으세요\n";
    userMessage += "2. 기존 API 키 사용 시, Google Cloud Console에서 'Generative Language API'를 활성화하세요\n";
    userMessage += "3. API 키를 새로 발급받은 경우, 5-10분 정도 기다린 후 다시 시도하세요";
  } else if (errorMessage.includes('API_KEY') || errorMessage.includes('invalid') || errorString.includes('INVALID_ARGUMENT')) {
    userMessage += "[원인]\n- API 키가 유효하지 않거나 만료되었습니다\n\n[해결 방법]\n- API 키를 다시 확인하고 재설정해주세요";
  } else if (errorMessage.includes('quota') || errorString.includes('RESOURCE_EXHAUSTED')) {
    userMessage += "[원인]\n- API 사용량이 초과되었습니다\n\n[해결 방법]\n- 잠시 후 다시 시도해주세요\n- Google AI Studio에서 API 사용량을 확인해주세요";
  } else if (errorMessage.includes('rate') || errorString.includes('RATE_LIMIT')) {
    userMessage += "[원인]\n- API 요청이 너무 빠르게 발생했습니다\n\n[해결 방법]\n- 10초 정도 기다린 후 다시 시도해주세요";
  } else if (errorMessage.includes('JSON_PARSE_ERROR') || errorMessage.includes('Unexpected end of JSON') || errorMessage.includes('JSON_INCOMPLETE')) {
    userMessage += "[원인]\n- AI 응답이 완료되기 전에 중단되었습니다 (3번 재시도 실패)\n- 요청한 대본이 너무 길 수 있습니다\n\n[해결 방법]\n- 대본 길이를 줄여서 다시 시도해주세요 (예: 1시간 → 30분)\n- 더 간단한 주제로 다시 시도해주세요\n- 5-10분 후 다시 시도해주세요";
  } else if (errorMessage.includes('EMPTY_RESPONSE')) {
    userMessage += "[원인]\n- AI가 응답을 생성하지 못했습니다\n\n[해결 방법]\n- 키워드를 변경하여 다시 시도해주세요";
  } else {
    userMessage += "[가능한 원인]\n- 요청한 대본이 너무 길어 처리 시간이 초과되었습니다\n- AI 서버 일시적 오류\n- 네트워크 연결 문제\n\n[해결 방법]\n- 대본 길이를 줄여서 다시 시도해주세요\n- 더 간단한 키워드로 다시 시도해주세요\n- 5-10분 후 다시 시도해주세요";
  }

  // 상세 오류 정보 추가
  userMessage += `\n\n[상세 정보]\n${errorMessage || '알 수 없는 오류'}`;
  if (error.stack) {
    const stackLines = error.stack.split('\n').slice(0, 3).join('\n');
    userMessage += `\n${stackLines}`;
  }

  throw new Error(userMessage);
};

const ssmlSchema = {
  type: Type.OBJECT,
  properties: {
    ssml: { type: Type.STRING, description: "The generated SSML string." },
  },
  required: ["ssml"],
};

export const generateSsml = async (
  text: string,
  prompt: string,
  apiKey: string
): Promise<{ ssml: string }> => {
  try {
    const ai = createAI(apiKey);

    const context = prompt
      ? `다음 텍스트를 Google Cloud Text-to-Speech에서 사용할 수 있는 SSML(Speech Synthesis Markup Language) 형식으로 변환해주세요. \n\n**연기 지시사항(Acting Instruction):** "${prompt}"\n\n이 지시사항에 맞춰 <prosody>, <break>, <emphasis>, <say-as> 태그를 적절히 사용하여 감정과 리듬을 표현하세요.`
      : `다음 텍스트를 Google Cloud Text-to-Speech에서 사용할 수 있는 SSML 형식으로 변환해주세요. 텍스트의 문맥을 분석하여 가장 자연스러운 호흡과 강조를 위해 <break>, <prosody> 태그를 적절히 추가하세요. 별도의 연기 지시가 없다면 자연스러운 낭독 톤을 유지하세요.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${context}\n\n텍스트:\n${text}`,
      config: {
        systemInstruction: "당신은 SSML 전문가입니다. 주어진 텍스트를 Google Cloud TTS 호환 SSML로 변환합니다. \n1. 반드시 <speak> 태그로 감싸야 합니다.\n2. 텍스트 내용은 변경하지 마세요 (태그만 추가).\n3. <prosody rate='...' pitch='...'>, <break time='...'>, <emphasis> 태그를 적극 활용하여 지시된 감정을 표현하세요.\n4. rate는 'slow', 'medium', 'fast' 또는 'x-slow', 'x-fast' 등을 사용하세요.\n5. pitch는 'low', 'medium', 'high' 등을 사용하세요.",
        responseMimeType: "application/json",
        responseSchema: ssmlSchema,
      },
    });

    const jsonText = response.text.trim();

    // JSON 파싱 전에 응답 검증
    if (!jsonText) {
      throw new Error('EMPTY_RESPONSE: API 응답이 비어있습니다');
    }

    try {
      return JSON.parse(jsonText) as { ssml: string };
    } catch (parseError: any) {
      console.error('JSON Parse Error:', {
        error: parseError.message,
        jsonText: jsonText.substring(0, 200)
      });
      throw new Error(`JSON_PARSE_ERROR: SSML 응답을 파싱할 수 없습니다`);
    }
  } catch (error: any) {
    console.error("Error generating SSML:", error);
    throw new Error("SSML 생성 중 오류가 발생했습니다: " + (error.message || "Unknown error"));
  }
};

export const generateActingPrompt = async (
  text: string,
  apiKey: string
): Promise<string> => {
  try {
    const ai = createAI(apiKey);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `다음 대본을 분석하여, TTS 음성 합성에 가장 어울리는 연기 톤과 감정을 한 문장으로 간결하게 표현해주세요.

대본:
${text}

예시 출력:
- "차분하고 신뢰감 있는 톤으로, 전문가가 설명하듯이 읽어주세요."
- "밝고 경쾌한 톤으로, 친근한 친구처럼 이야기해주세요."
- "극적이고 긴장감 있는 톤으로, 이야기에 몰입하도록 읽어주세요."
- "부드럽고 따뜻한 톤으로, 위로하듯이 천천히 읽어주세요."

출력은 반드시 한 문장으로 작성하고, 연기 지시만 포함해주세요.`,
      config: {
        maxOutputTokens: 100,
        temperature: 0.7,
      },
    });

    return response.text.trim().replace(/^["']|["']$/g, ''); // 따옴표 제거
  } catch (error: any) {
    console.error("Error generating acting prompt:", error);
    throw new Error("연기 프롬프트 생성 중 오류가 발생했습니다: " + (error.message || "Unknown error"));
  }
};
