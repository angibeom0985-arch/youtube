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

const IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation";
const TEXT_MODEL = "gemini-2.0-flash";

const getGoogleAI = (apiKey?: string) => {
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!key) {
    throw new Error("Gemini API key is required.");
  }
  return new GoogleGenAI({ apiKey: key });
};

const extractJson = <T>(text: string): T => {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i)?.[1];
  const raw = fenced ?? text;
  return JSON.parse(raw) as T;
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
  const res: any = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });
  return extractImageBase64(res);
};

const ratioHint = (aspectRatio: AspectRatio): string => {
  if (aspectRatio === "16:9") return "landscape 16:9 composition";
  if (aspectRatio === "9:16") return "portrait 9:16 composition";
  return "square 1:1 composition";
};

const styleHint = (imageStyle: "realistic" | "animation"): string => {
  return imageStyle === "animation"
    ? "clean animation style, vivid colors, clear silhouette"
    : "highly realistic photographic style, cinematic lighting";
};

export const generateCharacters = async (
  script: string,
  apiKey?: string,
  _imageStyle: "realistic" | "animation" = "realistic",
  _aspectRatio: AspectRatio = "16:9",
  _personaStyle?: ImageStyle,
  _customStyle?: string,
  _photoComposition?: PhotoComposition,
  _customPrompt?: string,
  _characterStyle?: string,
  _backgroundStyle?: string,
  _customCharacterStyle?: string,
  _customBackgroundStyle?: string,
  _personaReferenceImage?: string | null,
  onProgress?: (message: string) => void
): Promise<Character[]> => {
  const ai = getGoogleAI(apiKey);
  onProgress?.("인물 분석 중...");

  const prompt = [
    "Extract 3 to 6 main characters from the script.",
    "Return strict JSON array only.",
    'Each item: {"name":"string","description":"string"}',
    `Script:\n${script}`,
  ].join("\n");

  const text = await callTextModel(ai, prompt);
  const parsed = extractJson<RawCharacterData[]>(text);

  return (Array.isArray(parsed) ? parsed : []).map((item, idx) => ({
    id: `char-${Date.now()}-${idx}`,
    name: item?.name || `캐릭터 ${idx + 1}`,
    description: item?.description || "주요 등장인물",
    image: "",
  }));
};

export const regenerateCharacterImage = async (
  description: string,
  name: string,
  apiKey?: string,
  imageStyle: "realistic" | "animation" = "realistic",
  aspectRatio: AspectRatio = "16:9",
  _personaStyle?: ImageStyle
): Promise<string> => {
  const ai = getGoogleAI(apiKey);
  const prompt = [
    `${styleHint(imageStyle)}.`,
    `${ratioHint(aspectRatio)}.`,
    `Create a portrait of ${name}.`,
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
  onProgress?.("장면 분할 중...");

  const characterSummary = characters
    .map((c) => `${c.name}: ${c.description}`)
    .join("\n");

  const splitPrompt = [
    `Split the script into ${Math.max(1, imageCount)} scenes.`,
    "Return strict JSON array only.",
    'Each item: {"sceneDescription":"string"}',
    `Characters:\n${characterSummary || "none"}`,
    `Script:\n${script}`,
  ].join("\n");

  const splitText = await callTextModel(ai, splitPrompt);
  const sceneRows = extractJson<Array<{ sceneDescription: string }>>(splitText);
  const scenes = (Array.isArray(sceneRows) ? sceneRows : []).slice(0, Math.max(1, imageCount));

  const results: VideoSourceImage[] = [];
  for (let i = 0; i < scenes.length; i += 1) {
    onProgress?.(`장면 이미지 생성 중... (${i + 1}/${scenes.length})`);
    const sceneDescription = scenes[i]?.sceneDescription || `Scene ${i + 1}`;
    const prompt = [
      `${styleHint(imageStyle)}.`,
      `${ratioHint(aspectRatio)}.`,
      `Scene: ${sceneDescription}.`,
      referenceImage ? "Keep visual style consistency with provided reference." : "",
      subtitleEnabled ? "Leave clean lower area for subtitles." : "",
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
  const charContext = characters.map((c) => `${c.name}: ${c.description}`).join(" | ");
  const ai = getGoogleAI(apiKey);

  const prompt = [
    `${styleHint(imageStyle)}.`,
    `${ratioHint(aspectRatio)}.`,
    `Scene: ${sceneDescription}.`,
    charContext ? `Characters: ${charContext}.` : "",
    referenceImage ? "Maintain visual consistency with reference style." : "",
    subtitleEnabled ? "Leave clean lower area for subtitles." : "",
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
    onProgress?.("카메라 각도 생성 중", i + 1, total);

    const prompt = [
      `${ratioHint(aspectRatio)}.`,
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
