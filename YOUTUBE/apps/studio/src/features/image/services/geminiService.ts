import { GoogleGenAI, Modality } from "@google/genai";
import type {
  AspectRatio,
  CameraAngle,
  CameraAngleImage,
  Character,
  ImageStyle,
  PhotoComposition,
  RawCharacterData,
  VideoSourceImage,
} from "../types";

const IMAGE_MODELS = [
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
  "gemini-2.0-flash-preview-image-generation",
] as const;
const TEXT_MODEL = "gemini-2.5-flash";
const MAX_CHARACTERS = 6;

type ScenePlanItem = {
  sceneDescription: string;
  keyVisual?: string;
  mood?: string;
  continuityCue?: string;
  relatedCharacters?: string[];
};

const getGoogleAI = (apiKey?: string) => {
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!key) {
    throw new Error("Gemini API key is required.");
  }
  return new GoogleGenAI({ apiKey: key });
};

const extractJson = <T>(text: string): T => {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i)?.[1];
  const raw = (fenced ?? text).trim();

  try {
    return JSON.parse(raw) as T;
  } catch {
    const arrayChunk = raw.match(/\[[\s\S]*\]/)?.[0];
    if (arrayChunk) {
      return JSON.parse(arrayChunk) as T;
    }
    throw new Error("Failed to parse JSON response.");
  }
};

const extractImageBase64 = (response: any): string => {
  const candidates = response?.candidates ?? [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
      const data = part?.inlineData?.data;
      if (typeof data === "string" && data.length > 0) {
        return data;
      }
    }
  }
  throw new Error("No image data returned from Gemini.");
};

const callTextModel = async (ai: GoogleGenAI, prompt: string): Promise<string> => {
  const res: any = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const text =
    res?.text ||
    res?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p?.text === "string")?.text ||
    "";

  if (!text) {
    throw new Error("No text response returned from Gemini.");
  }

  return text;
};

const callImageModel = async (ai: GoogleGenAI, prompt: string): Promise<string> => {
  let lastError: unknown = null;

  for (const model of IMAGE_MODELS) {
    try {
      const res: any = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });
      return extractImageBase64(res);
    } catch (error: any) {
      lastError = error;
      const msg = String(error?.message || "").toLowerCase();
      const isModelAvailabilityError =
        msg.includes("not found") ||
        msg.includes("is not supported") ||
        msg.includes("model") ||
        msg.includes("404");
      if (!isModelAvailabilityError) {
        throw error;
      }
    }
  }

  throw new Error(
    `이미지 생성 모델을 찾지 못했습니다. 시도한 모델: ${IMAGE_MODELS.join(", ")}. ` +
      `원본 오류: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
};

const ratioHint = (aspectRatio: AspectRatio): string => {
  if (aspectRatio === "16:9") return "landscape 16:9 framing";
  if (aspectRatio === "9:16") return "vertical 9:16 framing";
  return "square 1:1 framing";
};

const styleHint = (imageStyle: "realistic" | "animation", personaStyle?: ImageStyle, customStyle?: string): string => {
  const base =
    imageStyle === "animation"
      ? "clean animation style, readable silhouette, controlled color palette"
      : "highly realistic photography style, cinematic lighting, rich texture";

  const persona = typeof personaStyle === "string" && personaStyle.trim() ? `, persona style: ${personaStyle}` : "";
  const custom = typeof customStyle === "string" && customStyle.trim() ? `, custom direction: ${customStyle}` : "";

  return `${base}${persona}${custom}`;
};

const compositionHint = (photoComposition?: PhotoComposition): string => {
  if (!photoComposition) return "balanced framing";
  return `composition preference: ${String(photoComposition)}`;
};

const characterContext = (characters: Character[]): string => {
  if (!characters.length) return "No fixed character list.";
  return characters.map((c) => `${c.name}: ${c.description}`).join("\n");
};

const splitScriptFallback = (script: string, count: number): ScenePlanItem[] => {
  const target = Math.max(1, count);
  const cleaned = script.replace(/\r/g, "\n").trim();
  if (!cleaned) {
    return [{ sceneDescription: "Opening shot with neutral context." }];
  }

  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const source = paragraphs.length ? paragraphs : [cleaned];
  const chunkSize = Math.max(1, Math.ceil(source.length / target));
  const scenes: ScenePlanItem[] = [];

  for (let i = 0; i < source.length; i += chunkSize) {
    const chunk = source.slice(i, i + chunkSize).join(" ").slice(0, 500);
    scenes.push({
      sceneDescription: chunk,
      keyVisual: chunk,
      mood: "neutral",
      continuityCue: i === 0 ? "opening" : "continue from previous scene",
    });
  }

  return scenes.slice(0, target);
};

const buildScenePlan = async (ai: GoogleGenAI, script: string, characters: Character[], sceneCount: number): Promise<ScenePlanItem[]> => {
  const prompt = [
    `Create exactly ${sceneCount} visual scene plans from the script.`,
    "Focus on context-aware visual matching, not repeated generic shots.",
    "Preserve character and background consistency between neighboring scenes.",
    "Return strict JSON array only.",
    "Schema:",
    '[{"sceneDescription":"string","keyVisual":"string","mood":"string","continuityCue":"string","relatedCharacters":["string"]}]',
    "Rules:",
    "- sceneDescription: concise visual direction for image generation",
    "- keyVisual: core object/action to show",
    "- mood: one short emotional tone",
    "- continuityCue: how this scene should connect to previous scene",
    "- relatedCharacters: names from the provided character list",
    `Characters:\n${characterContext(characters)}`,
    `Script:\n${script}`,
  ].join("\n");

  try {
    const text = await callTextModel(ai, prompt);
    const parsed = extractJson<ScenePlanItem[]>(text);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return splitScriptFallback(script, sceneCount);
    }
    return parsed.slice(0, sceneCount);
  } catch {
    return splitScriptFallback(script, sceneCount);
  }
};

export const generateCharacters = async (
  script: string,
  apiKey?: string,
  imageStyle: "realistic" | "animation" = "realistic",
  aspectRatio: AspectRatio = "16:9",
  personaStyle?: ImageStyle,
  customStyle?: string,
  photoComposition?: PhotoComposition,
  _customPrompt?: string,
  _characterStyle?: string,
  _backgroundStyle?: string,
  _customCharacterStyle?: string,
  _customBackgroundStyle?: string,
  _personaReferenceImage?: string | null,
  onProgress?: (message: string) => void
): Promise<Character[]> => {
  const ai = getGoogleAI(apiKey);
  onProgress?.("Analyzing characters...");

  const extractPrompt = [
    `Extract up to ${MAX_CHARACTERS} core recurring characters from the script.`,
    "Return strict JSON array only.",
    'Each item: {"name":"string","description":"string"}',
    `Script:\n${script}`,
  ].join("\n");

  const text = await callTextModel(ai, extractPrompt);
  const parsed = extractJson<RawCharacterData[]>(text);
  const base = (Array.isArray(parsed) ? parsed : []).slice(0, MAX_CHARACTERS);

  const results: Character[] = [];
  for (let i = 0; i < base.length; i += 1) {
    const item = base[i];
    const name = item?.name?.trim() || `Character ${i + 1}`;
    const description = item?.description?.trim() || "Main recurring character";

    onProgress?.(`Generating character image ${i + 1}/${base.length}...`);

    const imagePrompt = [
      styleHint(imageStyle, personaStyle, customStyle),
      ratioHint(aspectRatio),
      compositionHint(photoComposition),
      `Create a consistent portrait for ${name}.`,
      `Details: ${description}`,
      "No text overlay, no watermark.",
    ].join(" ");

    const image = await callImageModel(ai, imagePrompt);
    results.push({
      id: `char-${Date.now()}-${i}`,
      name,
      description,
      image,
    });
  }

  return results;
};

export const regenerateCharacterImage = async (
  description: string,
  name: string,
  apiKey?: string,
  imageStyle: "realistic" | "animation" = "realistic",
  aspectRatio: AspectRatio = "16:9",
  personaStyle?: ImageStyle
): Promise<string> => {
  const ai = getGoogleAI(apiKey);
  const prompt = [
    styleHint(imageStyle, personaStyle),
    ratioHint(aspectRatio),
    `Create a consistent character portrait for ${name}.`,
    `Character details: ${description}`,
    "No text overlay, no watermark.",
  ].join(" ");

  return callImageModel(ai, prompt);
};

export const generateStoryboard = async (
  script: string,
  characters: Character[],
  imageCount: number,
  apiKey?: string,
  imageStyle: "realistic" | "animation" = "realistic",
  subtitleEnabled = false,
  referenceImage?: string | null,
  aspectRatio: AspectRatio = "16:9",
  onProgress?: (message: string) => void
): Promise<VideoSourceImage[]> => {
  const ai = getGoogleAI(apiKey);
  const sceneCount = Math.max(1, imageCount);

  onProgress?.("Planning context-aware scenes...");
  const plan = await buildScenePlan(ai, script, characters, sceneCount);

  const results: VideoSourceImage[] = [];
  let previousSceneSummary = "";

  for (let i = 0; i < sceneCount; i += 1) {
    const item = plan[i] || { sceneDescription: `Scene ${i + 1}` };
    const sceneDescription = item.sceneDescription?.trim() || `Scene ${i + 1}`;
    const continuity = item.continuityCue?.trim() || "maintain visual continuity";
    const related = Array.isArray(item.relatedCharacters) ? item.relatedCharacters.join(", ") : "";

    onProgress?.(`Generating scene image ${i + 1}/${sceneCount}...`);

    const prompt = [
      styleHint(imageStyle),
      ratioHint(aspectRatio),
      `Scene description: ${sceneDescription}.`,
      item.keyVisual ? `Core visual: ${item.keyVisual}.` : "",
      item.mood ? `Mood: ${item.mood}.` : "",
      related ? `Priority characters: ${related}.` : "",
      `Continuity instruction: ${continuity}.`,
      previousSceneSummary ? `Previous scene context: ${previousSceneSummary}.` : "",
      referenceImage ? "Match the overall visual style with the provided reference image." : "",
      subtitleEnabled ? "Reserve clean lower space for subtitles." : "",
      `Character references:\n${characterContext(characters)}`,
      "No text overlay, no watermark.",
    ]
      .filter(Boolean)
      .join(" ");

    const image = await callImageModel(ai, prompt);

    results.push({
      id: `scene-${Date.now()}-${i}`,
      sceneDescription,
      image,
    });

    previousSceneSummary = `${sceneDescription}${item.keyVisual ? ` / ${item.keyVisual}` : ""}`;
  }

  return results;
};

export const regenerateStoryboardImage = async (
  sceneDescription: string,
  characters: Character[],
  apiKey?: string,
  imageStyle: "realistic" | "animation" = "realistic",
  subtitleEnabled = false,
  referenceImage?: string | null,
  aspectRatio: AspectRatio = "16:9"
): Promise<string> => {
  const ai = getGoogleAI(apiKey);

  const prompt = [
    styleHint(imageStyle),
    ratioHint(aspectRatio),
    `Scene description: ${sceneDescription}.`,
    `Character references:\n${characterContext(characters)}`,
    referenceImage ? "Maintain style consistency with the reference image." : "",
    subtitleEnabled ? "Reserve clean lower space for subtitles." : "",
    "No text overlay, no watermark.",
  ]
    .filter(Boolean)
    .join(" ");

  return callImageModel(ai, prompt);
};

export const generateCameraAngles = async (
  _sourceImageBase64: string,
  selectedAngles: CameraAngle[],
  apiKey?: string,
  aspectRatio: AspectRatio = "16:9",
  onProgress?: (message: string, current: number, total: number) => void
): Promise<CameraAngleImage[]> => {
  const ai = getGoogleAI(apiKey);
  const total = selectedAngles.length;
  const results: CameraAngleImage[] = [];

  for (let i = 0; i < selectedAngles.length; i += 1) {
    const angle = selectedAngles[i];
    onProgress?.("Generating camera-angle variants", i + 1, total);

    const prompt = [
      ratioHint(aspectRatio),
      `Generate a ${angle} portrait variant.`,
      "Keep subject identity and styling consistent.",
      "No text overlay, no watermark.",
    ].join(" ");

    const image = await callImageModel(ai, prompt);
    results.push({
      id: `angle-${Date.now()}-${i}`,
      angle,
      angleName: angle,
      description: `${angle} view`,
      image,
    });
  }

  return results;
};
