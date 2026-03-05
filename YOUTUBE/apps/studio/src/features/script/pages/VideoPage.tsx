
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiFilm,
  FiImage,
  FiMonitor,
  FiMic,
  FiPause,
  FiPlay,
  FiScissors,
  FiSettings,
  FiSmartphone,
  FiTrash2,
  FiUpload,
  FiVolume2,
} from "react-icons/fi";

import { supabase } from "@/services/supabase";
import type { User } from "@supabase/supabase-js";
import HomeBackButton from "@/components/HomeBackButton";
import ErrorNotice from "@/components/ErrorNotice";
import type { AnalysisResult, NewPlan } from "@/types";
import {
  analyzeTranscript,
  generateIdeas,
  generateChapterOutline,
  generateChapterScript,
} from "@/services/geminiService";
import { getVideoDetails } from "@/services/youtubeService";
import { generateVideo } from "@/services/videoService";
import { generateCharacters, regenerateStoryboardImage } from "@/features/image/services/geminiService";
import type { CharacterStyle, BackgroundStyle, AspectRatio, Character, ImageStyle } from "@/features/image/types";


import { ProgressTracker } from "@/components/ProgressIndicator";
import UserCreditToolbar from "@/components/UserCreditToolbar";
import { CREDIT_COSTS, formatCreditButtonLabel as formatRawCreditButtonLabel } from "@/constants/creditCosts";

const STORAGE_KEYS = {
  title: "video_project_title",
  notes: "video_project_notes",
  scriptTitle: "video_project_script_title",
  script: "video_project_script",
  tts: "video_project_tts",
  ttsChapters: "video_project_tts_chapters",
  ttsChapterVoices: "video_project_tts_chapter_voices",
  ttsLineVoices: "video_project_tts_line_voices",
  ttsVoiceApplyMode: "video_project_tts_voice_apply_mode",
  ttsFavorites: "video_project_tts_favorites",
  youtubeUrl: "video_project_youtube_url",
  scriptCategory: "video_project_script_category",
  scriptCategoryOrder: "video_project_script_category_order",
  imagePrompt: "video_project_image_prompt",
  imageSubStep: "video_project_image_sub_step",
  scriptStyle: "video_project_script_style",
  renderDuration: "video_project_render_duration",
  renderRatio: "video_project_render_ratio",
  renderFps: "video_project_render_fps",
  geminiApiKey: "video_project_gemini_api_key",
  cloudConsoleApiKey: "video_project_cloud_console_api_key",
  renderNotes: "video_project_render_notes",
  editNotes: "video_project_edit_notes",
  format: "video_project_format",
  step: "video_project_step",
};

const getNormalizedYoutubeUrl = (raw: string): string | null => {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.toLowerCase();
    const isYoutubeHost = host === "youtu.be" || host.endsWith("youtube.com");
    if (!isYoutubeHost) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

const extractYoutubeVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\/+/, "").split("/")[0];
      return id || null;
    }

    if (host.endsWith("youtube.com")) {
      const watchId = parsed.searchParams.get("v");
      if (watchId) return watchId;

      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const markerIndex = pathParts.findIndex((part) => part === "embed" || part === "shorts" || part === "live");
      if (markerIndex >= 0 && pathParts[markerIndex + 1]) {
        return pathParts[markerIndex + 1];
      }
    }

    return null;
  } catch {
    return null;
  }
};

type StepId = "setup" | "script" | "tts" | "image" | "generate" | "render";
type VideoFormat = "long" | "short";

interface VideoPageProps {
  basePath?: string;
}

type Step = {
  id: StepId;
  label: string;
  description: string;
  icon: React.ReactNode;
};

const voiceOptions = [
  { name: "민준", label: "남성 대표", tone: "신뢰감 있는 다큐 스타일" },
  { name: "지훈", label: "남성 보이스", tone: "프로페셔널 프레젠테이션" },
  { name: "서연", label: "여성 대표", tone: "차분한 뉴스 톤" },
  { name: "유나", label: "여성 보이스", tone: "밝고 친근한 진행" },
];

type VoiceModel = "Neural2" | "Wavenet" | "Standard" | "Studio";
type VoiceGender = "남성" | "여성" | "중성";
type VoiceTag =
  | "신뢰감 있는"
  | "발랄한"
  | "차분한"
  | "권위 있는"
  | "나레이션용"
  | "광고/홍보";
type SsmlGender = "MALE" | "FEMALE" | "NEUTRAL";
type VoicePreset = "대화형" | "뉴스형" | "광고형";

type ExtendedVoiceOption = {
  name: string;
  label: string;
  tone: string;
  category: VoiceGender;
  model: VoiceModel;
  googleVoice: string;
  ssmlGender: SsmlGender;
  rate: number;
  pitch: number;
  tags: VoiceTag[];
  sampleText: string;
};

type SupportErrorDialog = {
  title: string;
  context: string;
  message: string;
  troubleshooting: string[];
  reportText: string;
};

type SubtitleCue = {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
};

type EditorCut = {
  id: string;
  startSec: number;
  endSec: number;
  imageUrl: string;
  caption: string;
};

type TimelineDragMode = "move" | "trimStart" | "trimEnd";
type TimelineDragState = {
  cutId: string;
  mode: TimelineDragMode;
  pointerStartX: number;
  trackWidthPx: number;
  totalDurationSec: number;
  baseStartSec: number;
  baseEndSec: number;
};

const getCloudVoiceFeature = (suffix: string): string => {
  const key = String(suffix || "").toUpperCase();
  return key === "A"
    ? "차분한 안내형"
    : key === "B"
      ? "밝은 진행형"
      : key === "C"
        ? "신뢰 해설형"
        : key === "D"
          ? "묵직한 다큐형"
          : "균형형 내레이션";
};

const hashText = (value: string): number => {
  let hash = 2166136261 >>> 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const getCloudVoiceKoreanName = (googleVoice: string, gender: VoiceGender): string => {
  const seed = hashText(googleVoice);
  const maleFirst = ["강", "건", "도", "민", "서", "성", "시", "우", "윤", "재", "준", "진", "태", "하", "현", "호"];
  const maleMiddle = ["기", "도", "민", "석", "선", "수", "승", "우", "윤", "준", "진", "찬", "환", "혁", "현", "훈"];
  const femaleFirst = ["가", "나", "다", "라", "미", "서", "소", "수", "아", "예", "유", "윤", "이", "지", "채", "하"];
  const femaleMiddle = ["나", "다", "라", "린", "리", "민", "빈", "서", "아", "연", "윤", "은", "진", "채", "하", "혜"];
  const neutralFirst = ["가", "다", "라", "민", "보", "새", "서", "시", "온", "주", "진", "하", "한", "해", "현", "율"];
  const neutralMiddle = ["결", "나", "담", "람", "별", "빛", "솔", "온", "율", "이", "재", "찬", "하", "해", "현", "린"];
  const lastPool = ["나", "늘", "담", "린", "서", "아", "연", "온", "윤", "은", "진", "찬", "하", "해", "현", "호"];

  const firstPool = gender === "남성" ? maleFirst : gender === "여성" ? femaleFirst : neutralFirst;
  const middlePool = gender === "남성" ? maleMiddle : gender === "여성" ? femaleMiddle : neutralMiddle;

  const first = firstPool[seed % firstPool.length];
  const middle = middlePool[(seed >>> 8) % middlePool.length];
  const last = lastPool[(seed >>> 16) % lastPool.length];
  return `${first}${middle}${last}`;
};

// 확장된 목소리 옵션 (모달용)
const allVoiceOptions: ExtendedVoiceOption[] = [
  { name: "민준", label: "신뢰 나레이션", tone: "신뢰감 있는 다큐 스타일", category: "남성", model: "Neural2", googleVoice: "ko-KR-Neural2-C", ssmlGender: "MALE", rate: 0.95, pitch: -6.0, tags: ["신뢰감 있는", "나레이션용"], sampleText: "핵심 데이터부터 차분하게 정리해 드리겠습니다." },
  { name: "지훈", label: "권위 비즈니스", tone: "프로페셔널 프레젠테이션", category: "남성", model: "Wavenet", googleVoice: "ko-KR-Wavenet-C", ssmlGender: "MALE", rate: 1.0, pitch: 0.0, tags: ["권위 있는", "광고/홍보"], sampleText: "실무에 바로 적용할 전략 세 가지를 말씀드리겠습니다." },
  { name: "도현", label: "권위 해설", tone: "정중한 해설 톤", category: "남성", model: "Standard", googleVoice: "ko-KR-Standard-C", ssmlGender: "MALE", rate: 0.85, pitch: -8.0, tags: ["권위 있는", "나레이션용"], sampleText: "지금부터 핵심 포인트를 순서대로 짚어보겠습니다." },
  { name: "태양", label: "발랄 에너지", tone: "활기찬 진행 톤", category: "남성", model: "Wavenet", googleVoice: "ko-KR-Wavenet-D", ssmlGender: "MALE", rate: 1.15, pitch: 5.0, tags: ["발랄한", "광고/홍보"], sampleText: "오늘 영상 진짜 알찬 정보 많으니 끝까지 함께해 주세요!" },
  { name: "준서", label: "차분 다큐", tone: "깊이 있는 내레이션", category: "남성", model: "Standard", googleVoice: "ko-KR-Standard-D", ssmlGender: "MALE", rate: 0.90, pitch: -5.0, tags: ["차분한", "나레이션용"], sampleText: "데이터를 바탕으로 변화의 흐름을 천천히 살펴보겠습니다." },
  { name: "동현", label: "신뢰 강연", tone: "리더십 강연 톤", category: "남성", model: "Neural2", googleVoice: "ko-KR-Neural2-C", ssmlGender: "MALE", rate: 1.05, pitch: -3.0, tags: ["신뢰감 있는", "권위 있는"], sampleText: "지금 실행하면 결과가 달라집니다. 방법을 알려드리죠." },
  { name: "상호", label: "차분 설명", tone: "따뜻한 해설 톤", category: "남성", model: "Wavenet", googleVoice: "ko-KR-Wavenet-D", ssmlGender: "MALE", rate: 0.85, pitch: -7.0, tags: ["차분한", "나레이션용"], sampleText: "복잡한 내용을 쉽고 안정적으로 정리해드리겠습니다." },
  { name: "재훈", label: "발랄 진행", tone: "경쾌한 진행", category: "남성", model: "Standard", googleVoice: "ko-KR-Standard-C", ssmlGender: "MALE", rate: 1.20, pitch: 7.0, tags: ["발랄한", "광고/홍보"], sampleText: "이 꿀팁들, 바로 써먹을 수 있게 빠르게 알려드릴게요!" },
  { name: "성민", label: "권위 조언", tone: "묵직한 조언 톤", category: "남성", model: "Standard", googleVoice: "ko-KR-Standard-D", ssmlGender: "MALE", rate: 0.80, pitch: -9.0, tags: ["권위 있는", "신뢰감 있는"], sampleText: "경험에서 나온 현실적인 조언을 전해드리겠습니다." },

  { name: "서연", label: "차분 아나운서", tone: "차분한 뉴스 톤", category: "여성", model: "Wavenet", googleVoice: "ko-KR-Wavenet-A", ssmlGender: "FEMALE", rate: 1.0, pitch: 0.0, tags: ["차분한", "나레이션용"], sampleText: "오늘 영상의 주요 내용을 정확하고 또렷하게 전달해 드립니다." },
  { name: "유나", label: "발랄 친근", tone: "밝고 친근한 진행", category: "여성", model: "Neural2", googleVoice: "ko-KR-Neural2-A", ssmlGender: "FEMALE", rate: 1.15, pitch: 5.0, tags: ["발랄한", "광고/홍보"], sampleText: "반가워요. 오늘도 재미있고 유익한 내용으로 준비했어요." },
  { name: "혜진", label: "신뢰 라디오", tone: "안정적인 라디오 톤", category: "여성", model: "Neural2", googleVoice: "ko-KR-Neural2-B", ssmlGender: "FEMALE", rate: 0.90, pitch: -4.0, tags: ["신뢰감 있는", "차분한"], sampleText: "처음 보는 분도 이해하기 쉽게 차근차근 설명해 드릴게요." },
  { name: "소희", label: "발랄 라이브", tone: "생동감 있는 리액션", category: "여성", model: "Wavenet", googleVoice: "ko-KR-Wavenet-B", ssmlGender: "FEMALE", rate: 1.20, pitch: 6.0, tags: ["발랄한", "광고/홍보"], sampleText: "지금부터 분위기 올려서 핵심만 시원하게 전달하겠습니다!" },
  { name: "하늘", label: "차분 가이드", tone: "명상 가이드 톤", category: "여성", model: "Standard", googleVoice: "ko-KR-Standard-A", ssmlGender: "FEMALE", rate: 0.85, pitch: -6.0, tags: ["차분한", "나레이션용"], sampleText: "호흡을 고르고 중요한 포인트에 집중해 보겠습니다." },
  { name: "수아", label: "발랄 쇼호스트", tone: "쇼핑호스트 스타일", category: "여성", model: "Standard", googleVoice: "ko-KR-Standard-B", ssmlGender: "FEMALE", rate: 1.25, pitch: 8.0, tags: ["발랄한", "광고/홍보"], sampleText: "오늘 영상, 바로 써먹을 수 있는 팁만 골라서 보여드릴게요." },
  { name: "예린", label: "신뢰 브이로그", tone: "가벼운 브이로그 톤", category: "여성", model: "Wavenet", googleVoice: "ko-KR-Wavenet-B", ssmlGender: "FEMALE", rate: 1.05, pitch: 2.0, tags: ["신뢰감 있는", "발랄한"], sampleText: "편하게 보시고 필요한 부분만 쏙 가져가세요." },
  { name: "미정", label: "권위 설명", tone: "안정적 설명 톤", category: "여성", model: "Standard", googleVoice: "ko-KR-Standard-A", ssmlGender: "FEMALE", rate: 0.95, pitch: -2.0, tags: ["권위 있는", "차분한"], sampleText: "복잡한 내용을 간단한 예시로 명확하게 정리해 드립니다." },
  { name: "순자", label: "차분 스토리", tone: "따뜻한 이야기 톤", category: "여성", model: "Neural2", googleVoice: "ko-KR-Neural2-B", ssmlGender: "FEMALE", rate: 0.80, pitch: -8.0, tags: ["차분한", "나레이션용"], sampleText: "오래 사랑받는 콘텐츠의 공통점을 따뜻하게 들려드릴게요." },

];

const escapeSsmlText = (text: string): string =>
  String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const resolveVoicePreset = (voice: ExtendedVoiceOption | null): VoicePreset => {
  if (!voice) return "대화형";
  if (voice.tags.includes("광고/홍보") || voice.tags.includes("발랄한")) return "광고형";
  if (voice.tags.includes("권위 있는") || voice.tags.includes("차분한") || voice.tags.includes("나레이션용")) return "뉴스형";
  return "대화형";
};

const buildPresetSsml = (text: string, preset: VoicePreset): string => {
  const cleaned = escapeSsmlText(text).replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  if (preset === "뉴스형") {
    return `<speak><prosody rate="94%" pitch="-1st"><p>${cleaned}</p></prosody><break time="180ms"/></speak>`;
  }
  if (preset === "광고형") {
    return `<speak><prosody rate="110%" pitch="+2st" volume="+3dB"><emphasis level="moderate">${cleaned}</emphasis></prosody><break time="100ms"/></speak>`;
  }
  return `<speak><prosody rate="102%" pitch="+0.5st"><p>${cleaned}</p></prosody><break time="140ms"/></speak>`;
};

const scriptCategories = [
  "썰 채널",
  "건강",
  "미스터리",
  "야담",
  "49금",
  "국뽕",
  "북한 이슈",
  "정보 전달",
  "쇼핑 리뷰",
  "IT/테크",
  "요리/쿡방",
  "뷰티",
  "게임",
  "먹방",
  "브이로그",
];

const normalizeCategoryOrder = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [...scriptCategories];
  const valid = input.filter(
    (item): item is string =>
      typeof item === "string" &&
      scriptCategories.includes(item)
  );
  const unique = Array.from(new Set(valid));
  const missing = scriptCategories.filter((category) => !unique.includes(category));
  return [...unique, ...missing];
};

const extractGoogleCloudApiKey = (raw: unknown): string => {
  if (!raw) return "";

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (!trimmed.startsWith("{")) return trimmed;

    try {
      const parsed = JSON.parse(trimmed) as { apiKey?: string };
      return typeof parsed.apiKey === "string" ? parsed.apiKey.trim() : "";
    } catch {
      return "";
    }
  }

  if (typeof raw === "object") {
    const obj = raw as { apiKey?: unknown };
    return typeof obj.apiKey === "string" ? obj.apiKey.trim() : "";
  }

  return "";
};

const mapCloudVoiceToExtendedOption = (voice: any): ExtendedVoiceOption | null => {
  const googleVoice = String(voice?.name || "").trim();
  const langCode = String(voice?.languageCodes?.[0] || "").trim().toLowerCase();
  if (!googleVoice || !langCode.startsWith("ko")) return null;

  const ssmlGenderRaw = String(voice?.ssmlGender || "").toUpperCase();
  const letterMatch = googleVoice.match(/-([A-D])$/i);
  const suffixLetter = letterMatch?.[1]?.toUpperCase() || "";
  const inferredGender: SsmlGender =
    suffixLetter === "B" || suffixLetter === "C"
      ? "MALE"
      : suffixLetter === "A" || suffixLetter === "D"
        ? "FEMALE"
        : "NEUTRAL";
  const ssmlGender: SsmlGender =
    ssmlGenderRaw === "MALE"
      ? "MALE"
      : ssmlGenderRaw === "FEMALE"
        ? "FEMALE"
        : inferredGender;
  const category: VoiceGender =
    ssmlGender === "MALE" ? "남성" : ssmlGender === "FEMALE" ? "여성" : "중성";
  const model: VoiceModel =
    googleVoice.includes("Neural2")
      ? "Neural2"
      : googleVoice.includes("Wavenet")
        ? "Wavenet"
        : googleVoice.includes("Studio")
          ? "Studio"
          : "Standard";
  const suffix = googleVoice.split("-").pop() || googleVoice;
  const name = getCloudVoiceKoreanName(googleVoice, category);
  const feature = getCloudVoiceFeature(suffix);

  return {
    name,
    label: feature,
    tone: feature,
    category,
    model,
    googleVoice,
    ssmlGender,
    rate: 1.0,
    pitch: ssmlGender === "MALE" ? -1.5 : ssmlGender === "FEMALE" ? 1.5 : 0,
    tags: ["나레이션용"],
    sampleText: "안녕하세요. Google Cloud 음성 샘플입니다.",
  };
};

const sanitizeCorruptedText = (value: unknown, fallback = ""): string => {
  const text = String(value ?? "");
  const cleaned = text
    .replace(/\uFFFD/g, "")
    .replace(/^(?:[?？]+)\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || fallback;
};

type SortableCategoryChipProps = {
  category: string;
  isSelected: boolean;
  onSelect: (category: string) => void;
};

const SortableCategoryChip: React.FC<SortableCategoryChipProps> = ({
  category,
  isSelected,
  onSelect,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(category)}
      className={`rounded-full border px-3 py-2 text-xs font-semibold transition cursor-grab active:cursor-grabbing touch-none ${isSelected
        ? "border-red-400 bg-red-500/15 text-red-200"
        : "border-white/15 bg-black/30 text-white/70 hover:border-white/30"
        }`}
      title="드래그해서 순서 변경"
    >
      <span className="inline-flex items-center gap-2">
        <span className="text-white/40">::</span>
        <span>{category}</span>
      </span>
    </button>
  );
};

// const imageStyles removed

const characterColors = [
  "text-orange-400",
  "text-amber-400",
  "text-orange-500",
  "text-yellow-500",
  "text-orange-600",
  "text-amber-600",
];

const SCRIPT_USAGE_GUIDE =
  "대본 생성 사용법\n1. 현재 대본의 흐름을 그대로 붙여 넣기\n2. 영상 길이를 선택해 새 대본의 분량 설정\n3. 추천 주제 중 하나를 골라 새 대본 생성";
const steps: Step[] = [
  {
    id: "setup",
    label: "영상 설정",
    description: "프로젝트 제목·출력 기본 값 설정",
    icon: <FiSettings />,
  },
  {
    id: "script",
    label: "대본 생성",
    description: "입력 대본 분석·새 주제 대본 작성",
    icon: <FiFileText />,
  },
  {
    id: "tts",
    label: "음성 생성",
    description: "TTS 선택·내레이션 저장",
    icon: <FiMic />,
  },
  {
    id: "image",
    label: "이미지 생성",
    description: "페르소나·스타일·컷 이미지 생성",
    icon: <FiImage />,
  },
  {
    id: "generate",
    label: "영상 생성",
    description: "이미지·음성·텍스트로 영상 구성",
    icon: <FiFilm />,
  },
  {
    id: "render",
    label: "영상 편집",
    description: "최종 영상 출력·패키지 다운로드",
    icon: <FiDownload />,
  },
];

const getStoredString = (key: string, fallback = "", safe = true): string => {
  if (!safe || typeof localStorage === "undefined") return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    console.error("VideoPage storage read failed:", error);
    return fallback;
  }
};

const setStoredValue = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error("VideoPage storage write failed:", error);
  }
};

const getStoredJson = <T,>(key: string, fallback: T): T => {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error("VideoPage JSON storage read failed:", error);
    return fallback;
  }
};

const setStoredJson = <T,>(key: string, value: T) => {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error("VideoPage JSON storage write failed:", error);
  }
};

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const buildDefaultExpandedChapters = (plan: NewPlan | null): Record<number, boolean> => {
  if (!plan) return {};
  if (Array.isArray(plan.chapters) && plan.chapters.length > 0) {
    return plan.chapters.reduce<Record<number, boolean>>((acc, _, index) => {
      acc[index] = true;
      return acc;
    }, {});
  }
  if (Array.isArray(plan.scriptWithCharacters) && plan.scriptWithCharacters.length > 0) {
    return { 0: true };
  }
  return {};
};

const isNarrationLabel = (value?: string): boolean => {
  const text = String(value || "").trim().toLowerCase();
  return (
    text === "내레이션" ||
    text === "나레이션" ||
    text === "narration" ||
    text === "narrator"
  );
};

const stripNarrationPrefix = (value?: string): string => {
  return String(value || "")
    .replace(/^\s*(내레이션|나레이션|narration|narrator)\s*[:：]\s*/i, "")
    .trim();
};

const stripScriptArtifacts = (value?: string): string => {
  const text = String(value || "");
  const lines = text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*(내레이션|나레이션|나레이터|narration|narrator)\s*[:：]\s*/i, "")
        .replace(/^\s*이미지\s*프롬프트\s*[:：]\s*/i, "")
        .replace(/^\s*image\s*prompt\s*[:：]\s*/i, "")
        .trim()
    )
    .filter((line) => {
      if (!line) return false;
      const lower = line.toLowerCase();
      return !lower.startsWith("이미지 프롬프트") && !lower.startsWith("image prompt");
    });
  return lines.join("\n").trim();
};

const normalizeChapterScriptContent = (value?: string): string => {
  const normalized = String(value || "")
    .split(/\r?\n/)
    .map((line) =>
      String(line || "")
        .replace(/^\s*(내레이션|나레이션|나레이터|narration|narrator)\s*[:：]\s*/i, "")
        .trim()
    )
    .filter(Boolean)
    .join("\n");
  return normalized.trim();
};

const toScriptLineText = (line: { character?: string; line?: string; timestamp?: string }): string => {
  const character = String(line?.character || "").trim();
  const content = stripNarrationPrefix(line?.line);
  if (!content) return "";
  if (!character || isNarrationLabel(character)) return content;

  const duplicatePrefix = new RegExp(`^\\s*${character}\\s*[:：]\\s*`, "i");
  const normalized = content.replace(duplicatePrefix, "").trim();
  return `${character}: ${normalized}`;
};

const VideoPage: React.FC<VideoPageProps> = ({ basePath = "" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const normalizedBasePath = basePath && basePath !== "/" ? basePath.replace(/\/$/, "") : "";
  const [user, setUser] = useState<User | null>(null);

  console.log('[VideoPage] Rendering:', {
    pathname: location.pathname,
    basePath,
    normalizedBasePath
  });

  // currentStep은 useEffect에서 URL 기반으로 설정됨
  const [currentStep, setCurrentStep] = useState(0);
  const [videoFormat, setVideoFormat] = useState<VideoFormat>(() => {
    const stored = getStoredString(STORAGE_KEYS.format, "long");
    return stored === "short" ? "short" : "long";
  });
  const [projectTitle, setProjectTitle] = useState(() =>
    getStoredString(STORAGE_KEYS.title, "환율 1500원 시대, 내 자산은 어떻게 지킬까?")
  );
  const [projectNotes, setProjectNotes] = useState(() =>
    getStoredString(
      STORAGE_KEYS.notes,
      "2030 남녀를 타겟으로 CTA는 구독하기로 유도, 핵심 메시지는 곧 정리할게요."
    )
  );
  const [scriptDraft, setScriptDraft] = useState(() =>
    getStoredString(STORAGE_KEYS.script, "")
  );
  const [scriptTitle, setScriptTitle] = useState(() =>
    getStoredString(STORAGE_KEYS.scriptTitle, "")
  );
  const [youtubeUrl, setYoutubeUrl] = useState(() =>
    getStoredString(STORAGE_KEYS.youtubeUrl, "")
  );
  const normalizedYoutubeUrl = useMemo(
    () => getNormalizedYoutubeUrl(youtubeUrl),
    [youtubeUrl]
  );
  const [youtubeLinkPreview, setYoutubeLinkPreview] = useState<{ title: string; thumbnailUrl: string } | null>(null);
  const [youtubeLinkPreviewLoading, setYoutubeLinkPreviewLoading] = useState(false);
  const [youtubeLinkPreviewError, setYoutubeLinkPreviewError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(() =>
    getStoredString(STORAGE_KEYS.scriptCategory, scriptCategories[0])
  );
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() =>
    normalizeCategoryOrder(
      getStoredJson(STORAGE_KEYS.scriptCategoryOrder, scriptCategories)
    )
  );
  const [ttsScript, setTtsScript] = useState(() =>
    getStoredString(
      STORAGE_KEYS.tts,
      "이런 위기 속에서도 기회를 잡는 방법을 지금부터 소개합니다."
    )
  );
  const [selectedVoice, setSelectedVoice] = useState(voiceOptions[0].name);
  const [favoriteVoiceNames, setFavoriteVoiceNames] = useState<string[]>(() => {
    const defaults = voiceOptions.map((voice) => voice.name);
    const stored = getStoredJson(STORAGE_KEYS.ttsFavorites, defaults);
    if (!Array.isArray(stored)) return defaults;
    const validNames = stored.filter(
      (name): name is string =>
        typeof name === "string" && name.trim().length > 0
    );
    const unique = Array.from(new Set(validNames));
    return unique.length > 0 ? unique : defaults;
  });
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isBulkVoiceDropdownOpen, setIsBulkVoiceDropdownOpen] = useState(false);
  const [voiceGenderFilter, setVoiceGenderFilter] = useState<"전체" | VoiceGender>("전체");
  const [voiceTagFilter, setVoiceTagFilter] = useState<"전체" | VoiceTag>("전체");
  const [currentChapterForVoice, setCurrentChapterForVoice] = useState<number | null>(null);
  const [ttsVoiceApplyMode, setTtsVoiceApplyMode] = useState<"chapter" | "line">(() => {
    const stored = getStoredString(STORAGE_KEYS.ttsVoiceApplyMode, "chapter");
    return stored === "line" ? "line" : "chapter";
  });
  const [chapterVoices, setChapterVoices] = useState<Record<number, string>>(() =>
    getStoredJson(STORAGE_KEYS.ttsChapterVoices, {})
  );
  const [lineVoices, setLineVoices] = useState<Record<string, string>>(() =>
    getStoredJson(STORAGE_KEYS.ttsLineVoices, {})
  );
  const [availableVoiceOptions, setAvailableVoiceOptions] = useState<ExtendedVoiceOption[]>(allVoiceOptions);
  const [isLoadingCloudVoices, setIsLoadingCloudVoices] = useState(false);
  const [chapterScripts, setChapterScripts] = useState<Array<{ title: string; content: string }>>(() =>
    getStoredJson(STORAGE_KEYS.ttsChapters, [])
  );
  const [scriptLengthMinutes, setScriptLengthMinutes] = useState("8");
  const [customScriptLength, setCustomScriptLength] = useState("5");
  const [scriptStyle, setScriptStyle] = useState<"narration" | "dialogue">(() => {
    const stored = getStoredString(STORAGE_KEYS.scriptStyle, "narration");
    return stored === "dialogue" ? "dialogue" : "narration";
  });
  const [scriptAnalysis, setScriptAnalysis] = useState<AnalysisResult | null>(() =>
    getStoredJson("videopage_scriptAnalysis", null)
  );
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);
  const [scriptIdeas, setScriptIdeas] = useState<string[]>(() =>
    getStoredJson("videopage_scriptIdeas", [])
  );
  const [selectedTopic, setSelectedTopic] = useState(() =>
    getStoredString("videopage_selectedTopic", "")
  );
  const [generatedPlan, setGeneratedPlan] = useState<NewPlan | null>(() =>
    getStoredJson("videopage_generatedPlan", null)
  );
  const [scriptError, setScriptError] = useState("");
  const [isAnalyzingScript, setIsAnalyzingScript] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isReformattingTopic, setIsReformattingTopic] = useState(false);
  const [isRefreshingIdeas, setIsRefreshingIdeas] = useState(false);

  // Script sub-step management (대본 생성 단계의 하위 단계)
  const [scriptSubStep, setScriptSubStep] = useState(0); // 0: 입력, 1: 분석, 2: 주제선택, 3: 결과
  const [imageSubStep, setImageSubStep] = useState(() => {
    const stored = Number.parseInt(getStoredString(STORAGE_KEYS.imageSubStep, "0"), 10);
    if (!Number.isFinite(stored)) return 0;
    return Math.min(Math.max(stored, 0), 2);
  }); // 0: 페르소나/스타일, 1: 컷 생성, 2: 결과 확인

  // 대본 챕터별 접기/펼치기 상태
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({});

  // Progress tracking for script analysis
  const [analyzeProgress, setAnalyzeProgress] = useState({
    currentStep: 0,
    steps: ["대본 구조 분석", "핵심 키워드 추출", "추천 주제 생성"],
  });

  // Progress tracking for script generation
  const [generateProgress, setGenerateProgress] = useState({
    currentStep: 0,
    steps: ["대본 구조 설계", "콘텐츠 생성", "최종 검토"],
  });

  const [ttsSamples, setTtsSamples] = useState<
    { id: number; voice: string; text: string; status: string }[]
  >([]);
  const [imagePrompt, setImagePrompt] = useState(() =>
    getStoredString(STORAGE_KEYS.imagePrompt, "")
  );
  const [isImagePromptFocused, setIsImagePromptFocused] = useState(false);
  const [clearImagePromptOnFirstFocus, setClearImagePromptOnFirstFocus] = useState(true);
  const [chapterImagePrompts, setChapterImagePrompts] = useState<Record<number, string>>({});
  const [isGeneratingImagePrompt, setIsGeneratingImagePrompt] = useState(false);
  const [generatingPromptChapter, setGeneratingPromptChapter] = useState<number | null>(null);

  // Image Style States
  const [characterStyle, setCharacterStyle] = useState<CharacterStyle>("실사 극대화");
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>("모던");
  const [customCharacterStyle, setCustomCharacterStyle] = useState<string>("");
  const [customBackgroundStyle, setCustomBackgroundStyle] = useState<string>("");
  const [imageStyle, setImageStyle] = useState<"realistic" | "animation">("realistic"); // Derived/Synced
  const [styleReferenceImage, setStyleReferenceImage] = useState<string | null>(null);
  const [styleReferenceImageName, setStyleReferenceImageName] = useState("");
  const [isReferenceDropActive, setIsReferenceDropActive] = useState(false);

  const [chapterImages, setChapterImages] = useState<Record<string, string>>({});
  const [previewImageModal, setPreviewImageModal] = useState<{ src: string; title: string } | null>(null);
  const [generatingImageChapter, setGeneratingImageChapter] = useState<string | null>(null);
  const [isGeneratingAllCuts, setIsGeneratingAllCuts] = useState(false);
  const [isBatchPaused, setIsBatchPaused] = useState(false);
  const [batchGenerateProgress, setBatchGenerateProgress] = useState<{ done: number; total: number } | null>(null);
  const [personas, setPersonas] = useState<Character[]>([]);
  const [isGeneratingPersonas, setIsGeneratingPersonas] = useState(false);
  const [personaError, setPersonaError] = useState("");
  const [imageStepProgress, setImageStepProgress] = useState<{
    active: boolean;
    title: string;
    detail: string;
    percent: number;
    tone: "running" | "success" | "error";
  }>({
    active: false,
    title: "",
    detail: "",
    percent: 0,
    tone: "running",
  });
  const [isSidebarGuideCollapsed, setIsSidebarGuideCollapsed] = useState(false);

  const [renderDuration, setRenderDuration] = useState(() =>
    getStoredString(STORAGE_KEYS.renderDuration, "60")
  );
  const [renderRatio, setRenderRatio] = useState(() =>
    getStoredString(STORAGE_KEYS.renderRatio, "16:9")
  );
  const [renderFps, setRenderFps] = useState(() =>
    getStoredString(STORAGE_KEYS.renderFps, "30")
  );
  const [geminiApiKey, setGeminiApiKey] = useState(() =>
    getStoredString(STORAGE_KEYS.geminiApiKey, "")
  );
  const [cloudConsoleApiKey, setCloudConsoleApiKey] = useState(() =>
    getStoredString(STORAGE_KEYS.cloudConsoleApiKey, "")
  );
  const [couponBypassCredits, setCouponBypassCredits] = useState(false);
  const [couponGuardChecked, setCouponGuardChecked] = useState(false);
  const withOptionalCreditLabel = useCallback(
    (baseLabel: string, cost: number) =>
      couponBypassCredits ? baseLabel : `${baseLabel} (${formatRawCreditButtonLabel(cost)})`,
    [couponBypassCredits]
  );
  const [renderNotes, setRenderNotes] = useState(() =>
    getStoredString(
      STORAGE_KEYS.renderNotes,
      "컷당 3~4초, 자연스러운 페이드 전환. 자막은 꼭 포함하세요."
    )
  );
  const [editNotes, setEditNotes] = useState(() =>
    getStoredString(STORAGE_KEYS.editNotes, "컷 별 톤 3단계, 컬러는 따뜻하게.")
  );

  const [rendering, setRendering] = useState(false);
  const [renderingStatus, setRenderingStatus] = useState<string | null>(null);
  const [renderingProgress, setRenderingProgress] = useState(0);
  const [isExportingSrt, setIsExportingSrt] = useState(false);
  const [isExportingTtsMp3, setIsExportingTtsMp3] = useState(false);
  const [isApplyingEditorTts, setIsApplyingEditorTts] = useState(false);
  const [editorImageUrls, setEditorImageUrls] = useState<string[]>([]);
  const [editorAudioUrl, setEditorAudioUrl] = useState("");
  const [editorAudioDurationSec, setEditorAudioDurationSec] = useState(0);
  const [editorSubtitleCues, setEditorSubtitleCues] = useState<SubtitleCue[]>([]);
  const [editorCuts, setEditorCuts] = useState<EditorCut[]>([]);
  const [selectedCutId, setSelectedCutId] = useState<string | null>(null);
  const [timelineDragState, setTimelineDragState] = useState<TimelineDragState | null>(null);
  const [timelineCurrentSec, setTimelineCurrentSec] = useState(0);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [timelinePlaybackRate, setTimelinePlaybackRate] = useState(1);
  const [timelineVolume, setTimelineVolume] = useState(1);
  const [isTimelineMuted, setIsTimelineMuted] = useState(false);
  const [previewColorPreset, setPreviewColorPreset] = useState<"base" | "warm" | "cold" | "mono">("base");
  const [logoRemovalMode, setLogoRemovalMode] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState("");
  const [assetFiles, setAssetFiles] = useState<File[]>([]);
  const [isPackaging, setIsPackaging] = useState(false);
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const progressTimerRef = useRef<number | null>(null);
  const timelineTimerRef = useRef<number | null>(null);
  const bulkVoiceDropdownRef = useRef<HTMLDivElement | null>(null);
  const timelineCurrentRef = useRef(0);
  const timelineAudioRef = useRef<HTMLAudioElement | null>(null);
  const timelineVideoTrackRef = useRef<HTMLDivElement | null>(null);
  const timelineAutoPopulateRef = useRef(false);
  const imageStepProgressTimerRef = useRef<number | null>(null);
  const lastRoutePathRef = useRef("");
  const stopBatchGenerationRef = useRef(false);
  const autoAnalyzeKeyRef = useRef("");
  const refreshIdeasRequestIdRef = useRef(0);
  const refreshIdeasInFlightRef = useRef(false);
  const [characterColorMap, setCharacterColorMap] = useState<Map<string, string>>(new Map());
  const recommendedImagePrompt = useMemo(() => {
    const chapterText = chapterScripts.map((chapter) => chapter.content).join(" ");
    const generatedText = generatedPlan?.scriptWithCharacters?.map((line) => line.line).join(" ") || "";
    const base = `${chapterText} ${generatedText} ${scriptDraft} ${selectedCategory}`.toLowerCase();

    if (!base.trim()) {
      return "대본 분위기에 맞는 영화적 조명과 통일된 색감의 장면";
    }

    const isMystery = /미스터리|공포|스릴러|괴이|추적|범죄|사건/.test(base);
    const isEconomic = /경제|환율|투자|자산|시장|돈|금리|부동산/.test(base);
    const isBright = /희망|성장|성공|꿀팁|활기|밝|유쾌/.test(base);
    const isHistorical = /조선|역사|전통|왕|시대/.test(base);

    if (isMystery) {
      return "어두운 대비 조명, 긴장감 있는 그림자, 시네마틱 스릴러 분위기의 장면";
    }
    if (isEconomic) {
      return "도시 야경과 데이터 비주얼이 어우러진 현대적 비즈니스 다큐 분위기의 장면";
    }
    if (isHistorical) {
      return "전통 건축과 질감이 살아있는 사극 영화 톤, 자연광 중심의 깊이 있는 장면";
    }
    if (isBright) {
      return "밝은 자연광과 선명한 컬러, 역동적인 구도로 구성된 활기찬 장면";
    }
    return "스토리 중심의 시네마틱 연출, 주제를 강조하는 조명과 통일된 색감의 장면";
  }, [chapterScripts, generatedPlan, scriptDraft, selectedCategory]);

  const personaSourceScript = useMemo(() => {
    if (chapterScripts.length > 0) {
      return chapterScripts
        .map((chapter, idx) => `챕터 ${idx + 1}: ${chapter.title}\n${chapter.content}`)
        .join("\n\n");
    }
    const generatedText = generatedPlan?.scriptWithCharacters?.map((line) => toScriptLineText(line)).join("\n") || "";
    return generatedText || scriptDraft;
  }, [chapterScripts, generatedPlan, scriptDraft]);

  // Audio playback state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const browserTtsRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [playingChapter, setPlayingChapter] = useState<number | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [supportErrorDialog, setSupportErrorDialog] = useState<SupportErrorDialog | null>(null);
  const [supportCopyStatus, setSupportCopyStatus] = useState("");
  const previewAbortRef = useRef<AbortController | null>(null);
  const previewRequestIdRef = useRef(0);
  const previewCacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (generatedPlan?.characters) {
      const newMap = new Map<string, string>();
      generatedPlan.characters.forEach((char, index) => {
        newMap.set(char, characterColors[index % characterColors.length]);
      });
      setCharacterColorMap(newMap);
    }
  }, [generatedPlan]);

  useEffect(() => {
    const loadUserApiSettings = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setCouponBypassCredits(false);
        setCouponGuardChecked(true);
        return;
      }

      try {
        const response = await fetch("/api/user/settings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          setCouponGuardChecked(true);
          return;
        }

        const data = await response.json();
        const isCouponBypass = data?.coupon_bypass_credits === true;
        const geminiProfileKey = typeof data?.gemini_api_key === "string" ? data.gemini_api_key.trim() : "";
        const cloudProfileKey = extractGoogleCloudApiKey(data?.google_credit_json);

        setCouponBypassCredits(isCouponBypass);

        if (geminiProfileKey) {
          setGeminiApiKey(geminiProfileKey);
          setStoredValue(STORAGE_KEYS.geminiApiKey, geminiProfileKey);
        }
        if (cloudProfileKey) {
          setCloudConsoleApiKey(cloudProfileKey);
          setStoredValue(STORAGE_KEYS.cloudConsoleApiKey, cloudProfileKey);
        }

        if (isCouponBypass && (!geminiProfileKey || !cloudProfileKey)) {
          alert("할인 쿠폰 계정은 마이페이지에서 Gemini/Google Cloud API 키를 먼저 등록해야 합니다.");
          navigate("/mypage", {
            replace: true,
            state: { from: "/video", reason: "coupon_api_key_required" },
          });
        }
      } finally {
        setCouponGuardChecked(true);
      }
    };

    loadUserApiSettings();
  }, [user?.id, navigate]);

  useEffect(() => {
    if (!couponGuardChecked) return;
    if (!couponBypassCredits) return;
    if (geminiApiKey.trim() && cloudConsoleApiKey.trim()) return;
    navigate("/mypage", {
      replace: true,
      state: { from: "/video", reason: "coupon_api_key_required" },
    });
  }, [couponBypassCredits, couponGuardChecked, geminiApiKey, cloudConsoleApiKey, navigate]);

  useEffect(() => {
    const loadCloudVoices = async () => {
      if (!cloudConsoleApiKey.trim()) {
        setAvailableVoiceOptions(allVoiceOptions);
        return;
      }

      setIsLoadingCloudVoices(true);
      try {
        const response = await fetch(`https://texttospeech.googleapis.com/v1/voices?key=${cloudConsoleApiKey.trim()}`);
        const payload = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(payload?.voices)) {
          setAvailableVoiceOptions(allVoiceOptions);
          return;
        }

        const cloudKoreanVoices = payload.voices
          .map((voice: any) => mapCloudVoiceToExtendedOption(voice))
          .filter((voice: ExtendedVoiceOption | null): voice is ExtendedVoiceOption => Boolean(voice));

        const byGoogleVoice = new Map<string, ExtendedVoiceOption>();
        [...allVoiceOptions, ...cloudKoreanVoices].forEach((voice) => {
          if (!byGoogleVoice.has(voice.googleVoice)) {
            byGoogleVoice.set(voice.googleVoice, voice);
          }
        });

        const merged = Array.from(byGoogleVoice.values());
        setAvailableVoiceOptions(merged);
      } catch (error) {
        console.error("클라우드 음성 목록 로드 실패:", error);
        setAvailableVoiceOptions(allVoiceOptions);
      } finally {
        setIsLoadingCloudVoices(false);
      }
    };

    void loadCloudVoices();
  }, [cloudConsoleApiKey]);

  useEffect(() => {
    if (!availableVoiceOptions.some((voice) => voice.name === selectedVoice)) {
      setSelectedVoice(availableVoiceOptions[0]?.name || voiceOptions[0].name);
    }
  }, [availableVoiceOptions, selectedVoice]);

  // Sync imageStyle based on characterStyle
  useEffect(() => {
    if (characterStyle === "애니메이션" || characterStyle === "웹툰" || characterStyle === "졸라맨") {
      setImageStyle("animation");
    } else {
      setImageStyle("realistic");
    }
  }, [characterStyle]);



  useEffect(() => {
    if (!generatedPlan || chapterScripts.length > 0) return;

    const chapters: Array<{ title: string; content: string }> = [];

    if (generatedPlan.chapters && generatedPlan.chapters.length > 0) {
      generatedPlan.chapters.forEach((chapter) => {
        const lines = (chapter.script || [])
          .map((line) => toScriptLineText(line))
          .filter(Boolean)
          .join("\n");
        if (lines.trim()) {
          chapters.push({
            title: sanitizeCorruptedText(chapter.title, `챕터 ${chapters.length + 1}`),
            content: lines.trim(),
          });
        }
      });
    } else if (generatedPlan.scriptWithCharacters && generatedPlan.scriptWithCharacters.length > 0) {
      const scriptText = generatedPlan.scriptWithCharacters
        .map((line) => toScriptLineText(line))
        .filter(Boolean)
        .join("\n");
      chapters.push({
        title: "전체 대본",
        content: scriptText.trim(),
      });
    } else if (generatedPlan.scriptOutline && generatedPlan.scriptOutline.length > 0) {
      generatedPlan.scriptOutline.forEach((stage) => {
        chapters.push({
          title: stage.stage,
          content: stage.details.trim(),
        });
      });
    }

    if (chapters.length > 0) {
      setChapterScripts(chapters);
      setTtsScript(chapters.map(ch => ch.content).join("\n\n"));
    }
  }, [generatedPlan, chapterScripts.length]);

  useEffect(() => setStoredValue(STORAGE_KEYS.title, projectTitle), [projectTitle]);
  useEffect(() => setStoredValue(STORAGE_KEYS.notes, projectNotes), [projectNotes]);
  useEffect(() => setStoredValue(STORAGE_KEYS.scriptTitle, scriptTitle), [scriptTitle]);
  useEffect(() => setStoredValue(STORAGE_KEYS.youtubeUrl, youtubeUrl), [youtubeUrl]);
  useEffect(() => setStoredValue(STORAGE_KEYS.scriptCategory, selectedCategory), [selectedCategory]);
  useEffect(() => setStoredJson(STORAGE_KEYS.scriptCategoryOrder, categoryOrder), [categoryOrder]);
  useEffect(() => setStoredValue(STORAGE_KEYS.script, scriptDraft), [scriptDraft]);
  useEffect(() => setStoredValue(STORAGE_KEYS.tts, ttsScript), [ttsScript]);
  useEffect(() => setStoredJson(STORAGE_KEYS.ttsFavorites, favoriteVoiceNames), [favoriteVoiceNames]);
  useEffect(() => setStoredJson(STORAGE_KEYS.ttsChapters, chapterScripts), [chapterScripts]);
  useEffect(() => setStoredJson(STORAGE_KEYS.ttsChapterVoices, chapterVoices), [chapterVoices]);
  useEffect(() => setStoredJson(STORAGE_KEYS.ttsLineVoices, lineVoices), [lineVoices]);
  useEffect(() => setStoredValue(STORAGE_KEYS.ttsVoiceApplyMode, ttsVoiceApplyMode), [ttsVoiceApplyMode]);
  useEffect(() => setStoredValue(STORAGE_KEYS.scriptStyle, scriptStyle), [scriptStyle]);
  useEffect(() => setStoredValue(STORAGE_KEYS.imageSubStep, String(imageSubStep)), [imageSubStep]);
  useEffect(() => setStoredValue(STORAGE_KEYS.imagePrompt, imagePrompt), [
    imagePrompt,
  ]);
  useEffect(
    () => setStoredValue(STORAGE_KEYS.renderDuration, renderDuration),
    [renderDuration]
  );
  useEffect(
    () => setStoredValue(STORAGE_KEYS.renderRatio, renderRatio),
    [renderRatio]
  );
  useEffect(() => setStoredValue(STORAGE_KEYS.renderFps, renderFps), [renderFps]);
  useEffect(() => setStoredValue(STORAGE_KEYS.geminiApiKey, geminiApiKey), [geminiApiKey]);
  useEffect(() => setStoredValue(STORAGE_KEYS.cloudConsoleApiKey, cloudConsoleApiKey), [cloudConsoleApiKey]);
  useEffect(() => setStoredValue(STORAGE_KEYS.renderNotes, renderNotes), [renderNotes]);
  useEffect(() => setStoredValue(STORAGE_KEYS.editNotes, editNotes), [editNotes]);
  useEffect(() => setStoredValue(STORAGE_KEYS.format, videoFormat), [videoFormat]);
  useEffect(() => setStoredValue(STORAGE_KEYS.step, String(currentStep)), [currentStep]);

  useEffect(() => {
    if (!normalizedYoutubeUrl) {
      setYoutubeLinkPreview(null);
      setYoutubeLinkPreviewLoading(false);
      setYoutubeLinkPreviewError("");
      return;
    }

    let cancelled = false;
    setYoutubeLinkPreviewLoading(true);
    setYoutubeLinkPreviewError("");

    const loadPreview = async () => {
      try {
        const details = await getVideoDetails(normalizedYoutubeUrl);
        if (cancelled) return;
        setYoutubeLinkPreview({
          title: details.title || "유튜브 영상",
          thumbnailUrl: details.thumbnailUrl || "",
        });
      } catch {
        if (cancelled) return;
        const fallbackId = extractYoutubeVideoId(normalizedYoutubeUrl);
        if (fallbackId) {
          setYoutubeLinkPreview({
            title: "유튜브 영상 링크",
            thumbnailUrl: `https://i.ytimg.com/vi/${fallbackId}/hqdefault.jpg`,
          });
        } else {
          setYoutubeLinkPreview(null);
        }
        setYoutubeLinkPreviewError("영상 메타데이터를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) {
          setYoutubeLinkPreviewLoading(false);
        }
      }
    };

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [normalizedYoutubeUrl]);

  useEffect(() => {
    if (ttsVoiceApplyMode !== "chapter") return;
    setChapterScripts((prev) => {
      let changed = false;
      const next = prev.map((chapter) => {
        const cleaned = normalizeChapterScriptContent(chapter.content);
        if (cleaned !== chapter.content) {
          changed = true;
          return { ...chapter, content: cleaned };
        }
        return chapter;
      });
      if (changed) {
        setTtsScript(next.map((chapter) => chapter.content).join("\n\n"));
      }
      return changed ? next : prev;
    });
  }, [ttsVoiceApplyMode]);

  // 분석 및 생성 결과 localStorage 저장
  useEffect(() => setStoredJson("videopage_scriptAnalysis", scriptAnalysis), [scriptAnalysis]);
  useEffect(() => setStoredJson("videopage_scriptIdeas", scriptIdeas), [scriptIdeas]);
  useEffect(() => setStoredValue("videopage_selectedTopic", selectedTopic), [selectedTopic]);
  useEffect(() => setStoredJson("videopage_generatedPlan", generatedPlan), [generatedPlan]);

  useEffect(() => {
    if (chapterScripts.length > 0 && currentChapterForVoice === null) {
      setCurrentChapterForVoice(0);
    }
  }, [chapterScripts, currentChapterForVoice]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const deductCredits = useCallback(async (cost: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setScriptError("로그인이 필요합니다.");
      return false;
    }

    const settingsRes = await fetch("/api/user/settings", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }).catch(() => null);
    if (settingsRes?.ok) {
      const settings = await settingsRes.json().catch(() => ({}));
      if (settings?.coupon_bypass_credits === true) {
        return true;
      }
    }

    const response = await fetch("/api/YOUTUBE/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: "deduct", cost }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (payload?.error === "credit_limit") {
        setScriptError(
          `크레딧이 부족합니다. (필요: ${cost}, 보유: ${Number(payload?.currentCredits ?? 0)})`
        );
      } else {
        setScriptError(String(payload?.message || "크레딧 차감에 실패했습니다."));
      }
      return false;
    }

    window.dispatchEvent(new Event("creditRefresh"));
    return true;
  }, []);

  const handleReset = () => {
    if (!window.confirm('모든 작업 내용을 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    // localStorage 초기화
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    localStorage.removeItem('videopage_scriptAnalysis');
    localStorage.removeItem('videopage_scriptIdeas');
    localStorage.removeItem('videopage_selectedTopic');
    localStorage.removeItem('videopage_generatedPlan');
    localStorage.removeItem(STORAGE_KEYS.ttsChapters);
    localStorage.removeItem(STORAGE_KEYS.ttsChapterVoices);

    // 페이지 새로고침
    window.location.reload();
  };

  const handleReformatTopic = async () => {
    if (!selectedTopic.trim()) {
      alert('변환할 주제를 먼저 입력해주세요.');
      return;
    }

    if (!scriptTitle.trim()) {
      alert('제목 형식으로 변환하려면 먼저 영상 제목을 입력해주세요.');
      return;
    }

    setIsReformattingTopic(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        openSupportErrorDialog("로그인 필요", "주제 형식 변환", new Error("로그인이 필요합니다."));
        return;
      }

      const response = await fetch('/api/youtube_script/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'reformatTopic',
          payload: {
            topic: selectedTopic.trim(),
            titleFormat: scriptTitle.trim(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('주제 변환에 실패했습니다.');
      }

      const data = await response.json();
      if (data.reformattedTopic) {
        setSelectedTopic(data.reformattedTopic);
      } else {
        throw new Error('변환된 주제를 받지 못했습니다.');
      }
    } catch (error) {
      console.error('주제 변환 오류:', error);
      openSupportErrorDialog("주제 변환 오류", "주제 형식 변환", error);
    } finally {
      setIsReformattingTopic(false);
    }
  };

  const handleGeneratePersonas = async (): Promise<boolean> => {
    if (!geminiApiKey) {
      openSupportErrorDialog(
        "API 키 설정 필요",
        "페르소나 생성",
        new Error("API 키가 설정되지 않았습니다. 마이페이지에서 API 키를 등록해주세요.")
      );
      navigate("/mypage", {
        replace: true,
        state: { from: "/video", reason: "coupon_api_key_required" },
      });
      return false;
    }

    const source = personaSourceScript.trim();
    if (!source) {
      setPersonaError("페르소나를 만들 대본이 없습니다. 먼저 대본을 준비해주세요.");
      setImageStepProgress({
        active: true,
        title: "이미지 생성 준비 실패",
        detail: "페르소나를 만들 대본이 없습니다.",
        percent: 100,
        tone: "error",
      });
      return false;
    }

    const charged = await deductCredits(CREDIT_COSTS.GENERATE_IMAGE * 2);
    if (!charged) {
      return false;
    }

    setPersonaError("");
    setIsGeneratingPersonas(true);
    setPersonas([]);
    setImageStepProgress({
      active: true,
      title: "이미지 생성 준비 중",
      detail: "페르소나 분석 중...",
      percent: 8,
      tone: "running",
    });
    try {
      const generated = await generateCharacters(
        source,
        geminiApiKey,
        imageStyle,
        renderRatio as AspectRatio,
        characterStyle === "custom" ? "custom" : (characterStyle as ImageStyle),
        characterStyle === "custom" ? customCharacterStyle : "",
        undefined,
        undefined,
        characterStyle,
        backgroundStyle,
        customCharacterStyle,
        customBackgroundStyle,
        styleReferenceImage,
        (progressMessage) => {
          setImageStepProgress((prev) => ({
            active: true,
            title: "이미지 생성 준비 중",
            detail: progressMessage || "페르소나 생성 중...",
            percent: Math.min(92, prev.percent + 12),
            tone: "running",
          }));
        }
      );

      if (!generated.length) {
        setPersonaError("페르소나 생성 결과가 비어 있습니다. 입력을 바꿔 다시 시도해주세요.");
        setImageStepProgress({
          active: true,
          title: "이미지 생성 준비 실패",
          detail: "페르소나 생성 결과가 비어 있습니다.",
          percent: 100,
          tone: "error",
        });
        return false;
      }

      setPersonas(generated);
      setImageStepProgress({
        active: true,
        title: "이미지 생성 준비 완료",
        detail: `페르소나 ${generated.length}개 생성 완료`,
        percent: 100,
        tone: "success",
      });
      return true;
    } catch (error) {
      console.error("페르소나 생성 오류:", error);
      const message = error instanceof Error ? error.message : "페르소나 생성 중 오류가 발생했습니다.";
      setPersonaError(message);
      setImageStepProgress({
        active: true,
        title: "이미지 생성 준비 실패",
        detail: message,
        percent: 100,
        tone: "error",
      });
      return false;
    } finally {
      setIsGeneratingPersonas(false);
    }
  };

  const handleGenerateImage = async (
    cut: {
      imageKey: string;
      chapterTitle: string;
      content: string;
      chapterIndex: number;
      localCutIndex: number;
      globalCutIndex: number;
      secondsFrom: number;
      secondsTo: number;
    },
    customPrompt?: string
  ) => {
    if (personas.length === 0) {
      alert("먼저 페르소나를 생성해주세요.");
      return;
    }

    if (!geminiApiKey) {
      openSupportErrorDialog(
        "API 키 설정 필요",
        "이미지 생성",
        new Error("API 키가 설정되지 않았습니다. 마이페이지에서 API 키를 등록해주세요.")
      );
      navigate("/mypage", {
        replace: true,
        state: { from: "/video", reason: "coupon_api_key_required" },
      });
      return;
    }

    const charged = await deductCredits(CREDIT_COSTS.GENERATE_IMAGE);
    if (!charged) {
      return;
    }

    setGeneratingImageChapter(cut.imageKey);

    try {
      const contentSummary = cut.content.slice(0, 500).replace(/\n/g, " ");
      const basePrompt = imagePrompt.trim() || recommendedImagePrompt;

      // Construct detailed style prompt
      let stylePrompt = "";
      if (styleReferenceImage) {
        stylePrompt += "Use only the uploaded reference image for visual style consistency. Ignore preset character/background style options. ";
      } else {
        if (characterStyle === "custom") {
          stylePrompt += `Character Style: ${customCharacterStyle}. `;
        } else {
          stylePrompt += `Character Style: ${characterStyle}. `;
        }

        if (backgroundStyle === "custom") {
          stylePrompt += `Background Style: ${customBackgroundStyle}. `;
        } else {
          stylePrompt += `Background Style: ${backgroundStyle}. `;
        }
      }

      const fullPrompt = [
        basePrompt,
        `Chapter ${cut.chapterIndex + 1}: ${cut.chapterTitle}.`,
        `This is cut ${cut.localCutIndex + 1} (global cut ${cut.globalCutIndex + 1}), timeline ${cut.secondsFrom}s to ${cut.secondsTo}s.`,
        `Cut script context: ${contentSummary}.`,
        customPrompt?.trim() ? `Additional revision request: ${customPrompt.trim()}.` : "",
        "Generate one still frame that matches this exact cut context only.",
        "Use concrete objects/actions from the cut script context; avoid generic repeated city/graph shots.",
        "Vary framing and action from previous/next cuts while keeping overall story continuity.",
        stylePrompt,
        "High quality, detailed.",
        "No text, no letters, no numbers, no subtitles, no logos, no watermark.",
      ].join(" ");

      // Use generated personas to keep character consistency per cut.
      const imageUrl = await regenerateStoryboardImage(
        fullPrompt,
        personas,
        geminiApiKey,
        imageStyle,
        false, // subtitleEnabled
        styleReferenceImage, // referenceImage
        renderRatio as AspectRatio
      );

      const normalizedImageSrc = normalizeGeneratedImageSrc(imageUrl);
      if (!normalizedImageSrc) {
        throw new Error("유효한 이미지 데이터가 반환되지 않았습니다.");
      }

      setChapterImages((prev) => ({ ...prev, [cut.imageKey]: normalizedImageSrc }));

    } catch (error) {
      console.error('이미지 생성 오류:', error);
      openSupportErrorDialog("이미지 생성 오류", "이미지 생성", error);
    } finally {
      setGeneratingImageChapter(null);
    }
  };

  const handleGenerateVideo = async () => {
    const prompt = videoPrompt.trim();
    if (!prompt) {
      setVideoError("영상 프롬프트를 입력해 주세요.");
      return;
    }

    setVideoError("");
    setIsGeneratingVideo(true);
    try {
      const url = await generateVideo({
        prompt,
        duration: resolveRenderDurationSeconds(),
        ratio: renderRatio,
      });
      setGeneratedVideoUrl(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "영상 생성에 실패했습니다.";
      setVideoError(message);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleVideoGenerate = async () => {
    const fallbackPrompt = timelineScenes
      .slice(0, 6)
      .map((scene) => scene.desc)
      .filter(Boolean)
      .join(" ");
    const prompt = videoPrompt.trim() || fallbackPrompt || "시네마틱한 영상 편집 결과물";

    setVideoError("");
    setVideoGenerating(true);
    try {
      const url = await generateVideo({
        prompt,
        duration: resolveRenderDurationSeconds(),
        ratio: renderRatio,
      });
      setVideoUrl(url);
      if (!generatedVideoUrl) setGeneratedVideoUrl(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "영상 생성 요청에 실패했습니다.";
      setVideoError(message);
    } finally {
      setVideoGenerating(false);
    }
  };

  const handleFilesAdded = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setAssetFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setAssetFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePackageDownload = async () => {
    if (!assetFiles.length) return;

    setIsPackaging(true);
    try {
      const summary = [
        "Video Package Manifest",
        `Created At: ${new Date().toISOString()}`,
        `Render Duration: ${renderDuration}s`,
        `Render Ratio: ${renderRatio}`,
        `Render FPS: ${renderFps}`,
        "",
        "Assets:",
        ...assetFiles.map((file, idx) => `${idx + 1}. ${file.name} (${formatFileSize(file.size)})`),
      ].join("\n");

      const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "video-package-manifest.txt";
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsPackaging(false);
    }
  };

  const processStyleReferenceFile = (file: File) => {
    if (!file) return;

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("레퍼런스 이미지는 10MB 이하만 업로드할 수 있습니다.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        alert("이미지 로딩에 실패했습니다. 다시 시도해주세요.");
        return;
      }
      setStyleReferenceImage(result);
      setStyleReferenceImageName(file.name);
    };
    reader.onerror = () => {
      alert("이미지 파일을 읽는 중 오류가 발생했습니다.");
    };
    reader.readAsDataURL(file);
  };

  const handleStyleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processStyleReferenceFile(file);
    }
    e.target.value = "";
  };

  const handleStyleReferencePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(e.clipboardData.files || []);
    if (files.length === 0) return;
    e.preventDefault();
    const imageFile = files.find((file) => file.type.startsWith("image/"));
    if (!imageFile) {
      alert("클립보드에 이미지가 없습니다.");
      return;
    }
    processStyleReferenceFile(imageFile);
  };

  const handleStyleReferenceDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsReferenceDropActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    const imageFile = files.find((file) => file.type.startsWith("image/"));
    if (!imageFile) {
      alert("이미지 파일만 드롭할 수 있습니다.");
      return;
    }
    processStyleReferenceFile(imageFile);
  };

  const handleGenerateAllCutImages = async () => {
    if (isGeneratingAllCuts) return;
    if (personas.length === 0) {
      alert("먼저 페르소나를 생성해주세요.");
      return;
    }

    const pendingCuts = allCuts.filter((cut) => !chapterImages[cut.imageKey]);
    if (pendingCuts.length === 0) {
      alert("생성할 컷이 없습니다. 이미 모든 컷 이미지가 생성되었습니다.");
      return;
    }

    setIsGeneratingAllCuts(true);
    setIsBatchPaused(false);
    stopBatchGenerationRef.current = false;
    setBatchGenerateProgress({ done: 0, total: pendingCuts.length });
    let paused = false;
    try {
      for (let idx = 0; idx < pendingCuts.length; idx += 1) {
        if (stopBatchGenerationRef.current) {
          paused = true;
          break;
        }
        const cut = pendingCuts[idx];
        await handleGenerateImage(cut);
        setBatchGenerateProgress({ done: idx + 1, total: pendingCuts.length });
        if (stopBatchGenerationRef.current) {
          paused = true;
          break;
        }
      }
    } finally {
      setIsGeneratingAllCuts(false);
      setIsBatchPaused(paused);
      if (!paused) {
        setBatchGenerateProgress(null);
      }
      stopBatchGenerationRef.current = false;
    }
  };

  const handlePauseAllCutGeneration = () => {
    if (!isGeneratingAllCuts) return;
    stopBatchGenerationRef.current = true;
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveImageBySrc = async (src: string, fileName: string) => {
    const normalized = normalizeGeneratedImageSrc(src);
    if (!normalized) {
      throw new Error("저장할 이미지가 없습니다.");
    }
    const response = await fetch(normalized);
    const blob = await response.blob();
    downloadBlob(blob, fileName);
  };

  const handleSaveAllCutImages = async () => {
    const generatedCuts = allCuts.filter((cut) => Boolean(chapterImages[cut.imageKey]));
    if (generatedCuts.length === 0) {
      alert("저장할 이미지가 없습니다. 먼저 이미지를 생성해주세요.");
      return;
    }

    try {
      const baseName = (projectTitle || "video").trim().replace(/[^\w\-가-힣]+/g, "_");
      for (let index = 0; index < generatedCuts.length; index += 1) {
        const cut = generatedCuts[index];
        const src = chapterImages[cut.imageKey];
        if (!src) continue;
        await saveImageBySrc(
          src,
          `${baseName}-chapter-${cut.chapterIndex + 1}-cut-${cut.localCutIndex + 1}.png`
        );
        if (index < generatedCuts.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
      }
    } catch (error) {
      console.error("전체 이미지 저장 오류:", error);
      alert("전체 이미지 저장 중 오류가 발생했습니다.");
    }
  };



  const handleDownloadEditNotes = () => {
    const content = editNotes.trim() || "편집 안내를 여기에 작성해 주세요.";
    downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }),
      `${projectTitle || "video"}-edit-notes.txt`
    );
  };

  const formatSrtTimestamp = (ms: number): string => {
    const safe = Math.max(0, Math.floor(ms));
    const hours = Math.floor(safe / 3600000);
    const minutes = Math.floor((safe % 3600000) / 60000);
    const seconds = Math.floor((safe % 60000) / 1000);
    const millis = safe % 1000;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
  };

  const totalEditorDurationSec = useMemo(
    () =>
      Math.max(
        1,
        Number(renderDuration || 0),
        editorAudioDurationSec,
        ...editorCuts.map((cut) => cut.endSec),
        ...editorSubtitleCues.map((cue) => cue.endSec)
      ),
    [renderDuration, editorAudioDurationSec, editorCuts, editorSubtitleCues]
  );

  const clearTimelineTimer = useCallback(() => {
    if (timelineTimerRef.current !== null) {
      window.clearInterval(timelineTimerRef.current);
      timelineTimerRef.current = null;
    }
  }, []);

  const seekTimeline = useCallback(
    (nextSec: number) => {
      const clamped = Math.max(0, Math.min(totalEditorDurationSec, Number(nextSec || 0)));
      setTimelineCurrentSec(clamped);
      timelineCurrentRef.current = clamped;
      if (timelineAudioRef.current) {
        timelineAudioRef.current.currentTime = clamped;
      }
    },
    [totalEditorDurationSec]
  );

  const pauseTimeline = useCallback(() => {
    clearTimelineTimer();
    if (timelineAudioRef.current) {
      timelineAudioRef.current.pause();
    }
    setIsTimelinePlaying(false);
  }, [clearTimelineTimer]);

  const playTimeline = useCallback(() => {
    if (timelineCurrentRef.current >= totalEditorDurationSec) {
      seekTimeline(0);
    }

    if (timelineAudioRef.current && editorAudioUrl) {
      const audio = timelineAudioRef.current;
      audio.currentTime = timelineCurrentRef.current;
      audio.playbackRate = timelinePlaybackRate;
      audio.volume = isTimelineMuted ? 0 : timelineVolume;
      void audio.play().catch(() => {
        setIsTimelinePlaying(false);
      });
      setIsTimelinePlaying(true);
      clearTimelineTimer();
      timelineTimerRef.current = window.setInterval(() => {
        const next = audio.currentTime;
        setTimelineCurrentSec(next);
        timelineCurrentRef.current = next;
        if (next >= totalEditorDurationSec || audio.ended) {
          pauseTimeline();
        }
      }, 80);
      return;
    }

    setIsTimelinePlaying(true);
    clearTimelineTimer();
    timelineTimerRef.current = window.setInterval(() => {
      const next = timelineCurrentRef.current + 0.1 * timelinePlaybackRate;
      if (next >= totalEditorDurationSec) {
        seekTimeline(totalEditorDurationSec);
        pauseTimeline();
        return;
      }
      setTimelineCurrentSec(next);
      timelineCurrentRef.current = next;
    }, 100);
  }, [
    clearTimelineTimer,
    editorAudioUrl,
    isTimelineMuted,
    pauseTimeline,
    seekTimeline,
    timelinePlaybackRate,
    timelineVolume,
    totalEditorDurationSec,
  ]);

  const toggleTimelinePlayback = useCallback(() => {
    if (isTimelinePlaying) {
      pauseTimeline();
    } else {
      playTimeline();
    }
  }, [isTimelinePlaying, pauseTimeline, playTimeline]);

  const buildSubtitleLines = (): string[] => {
    const chapterLines = chapterScripts
      .flatMap((chapter) =>
        String(chapter.content || "")
          .split(/\r?\n/)
          .map((line) => stripNarrationPrefix(line).trim())
          .filter(Boolean)
      );
    if (chapterLines.length > 0) return chapterLines;
    return String(ttsScript || "")
      .split(/\r?\n/)
      .map((line) => stripNarrationPrefix(line).trim())
      .filter(Boolean);
  };

  const handleDownloadSrt = () => {
    const lines = buildSubtitleLines();
    if (lines.length === 0) {
      alert("SRT로 변환할 대본이 없습니다.");
      return;
    }

    setIsExportingSrt(true);
    try {
      const totalDurationMs = Math.max(10000, Number(renderDuration || 0) * 1000 || 60000);
      const weights = lines.map((line) => Math.max(1, line.replace(/\s+/g, "").length));
      const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
      const minCueMs = 1200;

      const rawDurations = weights.map((w) => Math.max(minCueMs, (totalDurationMs * w) / totalWeight));
      const rawTotal = rawDurations.reduce((sum, d) => sum + d, 0) || totalDurationMs;
      const scale = totalDurationMs / rawTotal;
      const durations = rawDurations.map((d) => Math.max(minCueMs, Math.floor(d * scale)));

      let cursor = 0;
      const cues = lines.map((line, idx) => {
        const start = cursor;
        const end = idx === lines.length - 1 ? totalDurationMs : Math.min(totalDurationMs, start + durations[idx]);
        cursor = end;
        return `${idx + 1}\n${formatSrtTimestamp(start)} --> ${formatSrtTimestamp(end)}\n${line}\n`;
      });

      const baseName = (projectTitle || "video").trim().replace(/[^\w\-가-힣]+/g, "_");
      downloadBlob(
        new Blob([cues.join("\n")], { type: "application/x-subrip;charset=utf-8" }),
        `${baseName || "video"}-subtitle.srt`
      );
    } finally {
      setIsExportingSrt(false);
    }
  };

  const handleDownloadTtsMp3 = async () => {
    setIsExportingTtsMp3(true);
    try {
      const text = buildSubtitleLines().join(" ").replace(/\s+/g, " ").trim();
      if (!text) {
        alert("MP3로 생성할 대본이 없습니다.");
        return;
      }

      const blob = await requestTtsMp3Blob(text);
      const baseName = (projectTitle || "video").trim().replace(/[^\w\-가-힣]+/g, "_");
      downloadBlob(blob, `${baseName || "video"}-tts.mp3`);
    } catch (error) {
      console.error("MP3 생성 오류:", error);
      alert("MP3 생성 중 오류가 발생했습니다. API 키/권한을 확인해 주세요.");
    } finally {
      setIsExportingTtsMp3(false);
    }
  };

  const requestTtsMp3Blob = async (text: string): Promise<Blob> => {
    const normalizedText = String(text || "").replace(/\s+/g, " ").trim();
    if (!normalizedText) {
      throw new Error("empty_tts_text");
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("로그인이 필요합니다.");
    }

    const strictProfile = strictVoiceProfileMap[selectedVoice];
    const voice = strictProfile?.voice || "ko-KR-Standard-A";
    const ssmlGender = strictProfile?.ssmlGender || "FEMALE";
    const speakingRate = Math.min(2.0, Math.max(0.8, ttsSpeed * (strictProfile?.rate || 1)));
    const pitch = strictProfile?.pitch || 0;

    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        text: normalizedText,
        voice,
        ssmlGender,
        speakingRate,
        pitch,
        preview: false,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.audioContent) {
      throw new Error(String(payload?.message || "mp3_generation_failed"));
    }

    const binary = atob(String(payload.audioContent));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: "audio/mpeg" });
  };

  const getGeneratedEditorImages = useCallback((): string[] => {
    return Object.entries(chapterImages)
      .filter(([, src]) => Boolean(src))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, src]) => normalizeGeneratedImageSrc(src))
      .filter(Boolean);
  }, [chapterImages]);

  const applyAudioBlobToEditor = async (
    blob: Blob,
    images: string[] = editorImageUrls,
    cues: SubtitleCue[] = editorSubtitleCues
  ) => {
    const url = URL.createObjectURL(blob);
    setEditorAudioUrl(url);

    const duration = await new Promise<number>((resolve) => {
      const audio = new Audio(url);
      audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      audio.onerror = () => resolve(0);
    });

    setEditorAudioDurationSec(duration);
    rebuildEditorCuts(images, cues, duration);
  };

  const handleApplyScriptToEditorSrt = (forcedImages?: string[]) => {
    const lines = buildSubtitleLines();
    if (lines.length === 0) {
      alert("SRT로 변환할 대본이 없습니다.");
      return [] as SubtitleCue[];
    }
    const cues = buildAutoSubtitleCues(lines, editorAudioDurationSec || Number(renderDuration || 60));
    const images = forcedImages ?? editorImageUrls;
    setEditorSubtitleCues(cues);
    rebuildEditorCuts(images, cues, editorAudioDurationSec);
    return cues;
  };

  const handleApplyTtsToEditorMp3 = async (forcedImages?: string[], forcedCues?: SubtitleCue[]) => {
    const text = buildSubtitleLines().join(" ").replace(/\s+/g, " ").trim();
    if (!text) {
      alert("MP3로 생성할 대본이 없습니다.");
      return;
    }

    setIsApplyingEditorTts(true);
    try {
      const blob = await requestTtsMp3Blob(text);
      await applyAudioBlobToEditor(blob, forcedImages ?? editorImageUrls, forcedCues ?? editorSubtitleCues);
    } catch (error) {
      console.error("에디터 MP3 적용 오류:", error);
      alert("TTS를 MP3로 생성해 컷 편집에 적용하지 못했습니다.");
    } finally {
      setIsApplyingEditorTts(false);
    }
  };

  const handleApplyGeneratedAssetsToEditor = async () => {
    const generated = getGeneratedEditorImages();
    if (generated.length === 0) {
      alert("불러올 생성 이미지가 없습니다. 먼저 이미지 생성 단계에서 컷을 생성해 주세요.");
      return;
    }

    setEditorImageUrls(generated);
    const cues = handleApplyScriptToEditorSrt(generated);
    await handleApplyTtsToEditorMp3(generated, cues);
  };

  const parseSrtTimestampToSec = (value: string): number => {
    const normalized = String(value || "").trim().replace(".", ",");
    const m = normalized.match(/(\d{2}):(\d{2}):(\d{2}),(\d{1,3})/);
    if (!m) return 0;
    const h = Number(m[1] || 0);
    const min = Number(m[2] || 0);
    const sec = Number(m[3] || 0);
    const ms = Number((m[4] || "0").padEnd(3, "0"));
    return h * 3600 + min * 60 + sec + ms / 1000;
  };

  const parseSrtText = (raw: string): SubtitleCue[] => {
    const blocks = String(raw || "")
      .replace(/\r/g, "")
      .split("\n\n")
      .map((b) => b.trim())
      .filter(Boolean);

    const cues: SubtitleCue[] = [];
    blocks.forEach((block, idx) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const timelineLine = lines.find((line) => line.includes("-->")) || "";
      if (!timelineLine) return;
      const [startRaw, endRaw] = timelineLine.split("-->").map((v) => v.trim());
      const startSec = parseSrtTimestampToSec(startRaw);
      const endSec = parseSrtTimestampToSec(endRaw);
      const text = lines.filter((line) => !line.includes("-->") && !/^\d+$/.test(line)).join(" ").trim();
      if (!text || endSec <= startSec) return;
      cues.push({ id: `cue-${idx + 1}`, startSec, endSec, text });
    });
    return cues.sort((a, b) => a.startSec - b.startSec);
  };

  const buildAutoSubtitleCues = (lines: string[], durationSec: number): SubtitleCue[] => {
    if (lines.length === 0) return [];
    const totalDuration = Math.max(10, durationSec || Number(renderDuration || 60));
    const weights = lines.map((line) => Math.max(1, line.replace(/\s+/g, "").length));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
    const minCueSec = 1.2;
    const raw = weights.map((w) => Math.max(minCueSec, (totalDuration * w) / totalWeight));
    const rawTotal = raw.reduce((sum, v) => sum + v, 0) || totalDuration;
    const scale = totalDuration / rawTotal;
    const durations = raw.map((v) => Math.max(minCueSec, v * scale));

    let cursor = 0;
    return lines.map((text, idx) => {
      const startSec = cursor;
      const endSec = idx === lines.length - 1 ? totalDuration : Math.min(totalDuration, startSec + durations[idx]);
      cursor = endSec;
      return { id: `auto-cue-${idx + 1}`, startSec, endSec, text };
    });
  };

  const rebuildEditorCuts = useCallback(
    (images: string[], cues: SubtitleCue[], audioDuration: number) => {
      const totalDuration = Math.max(
        1,
        audioDuration,
        cues.length > 0 ? cues[cues.length - 1].endSec : 0,
        Number(renderDuration || 0)
      );
      if (images.length === 0) {
        setEditorCuts([]);
        setSelectedCutId(null);
        return;
      }

      let nextCuts: EditorCut[] = [];
      if (cues.length > 0) {
        nextCuts = cues.map((cue, idx) => ({
          id: `cut-${idx + 1}`,
          startSec: Math.max(0, cue.startSec),
          endSec: Math.max(cue.startSec + 0.2, cue.endSec),
          imageUrl: images[idx % images.length],
          caption: cue.text,
        }));
      } else {
        const segment = totalDuration / images.length;
        nextCuts = images.map((img, idx) => ({
          id: `cut-${idx + 1}`,
          startSec: Number((idx * segment).toFixed(2)),
          endSec: Number(((idx + 1) * segment).toFixed(2)),
          imageUrl: img,
          caption: `컷 ${idx + 1}`,
        }));
      }
      setEditorCuts(nextCuts);
      setSelectedCutId((prev) => prev || nextCuts[0]?.id || null);
    },
    [renderDuration]
  );

  const handleEditorImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    const urls = files.map((file) => URL.createObjectURL(file));
    setEditorImageUrls((prev) => {
      const next = [...prev, ...urls];
      rebuildEditorCuts(next, editorSubtitleCues, editorAudioDurationSec);
      return next;
    });
    event.target.value = "";
  };

  const handleEditorAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = Array.from(event.target.files || [])[0];
    if (!file || !file.type.startsWith("audio/")) return;
    const url = URL.createObjectURL(file);
    setEditorAudioUrl(url);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setEditorAudioDurationSec(duration);
      rebuildEditorCuts(editorImageUrls, editorSubtitleCues, duration);
    };
    event.target.value = "";
  };

  const handleEditorSrtUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = Array.from(event.target.files || [])[0];
    if (!file) return;
    const text = await file.text().catch(() => "");
    const cues = parseSrtText(text);
    setEditorSubtitleCues(cues);
    rebuildEditorCuts(editorImageUrls, cues, editorAudioDurationSec);
    event.target.value = "";
  };

  const handleLoadGeneratedImagesToEditor = () => {
    const generated = getGeneratedEditorImages();

    if (generated.length === 0) {
      alert("불러올 생성 이미지가 없습니다. 먼저 이미지 생성 단계에서 컷을 생성해 주세요.");
      return;
    }

    setEditorImageUrls(generated);
    rebuildEditorCuts(generated, editorSubtitleCues, editorAudioDurationSec);
  };

  const handleGenerateAutoSrtForEditor = () => {
    const lines = buildSubtitleLines();
    if (lines.length === 0) {
      alert("자막으로 변환할 대본이 없습니다.");
      return;
    }
    const cues = buildAutoSubtitleCues(lines, editorAudioDurationSec || Number(renderDuration || 60));
    setEditorSubtitleCues(cues);
    rebuildEditorCuts(editorImageUrls, cues, editorAudioDurationSec);
  };

  const updateEditorCutTime = (cutId: string, field: "startSec" | "endSec", value: number) => {
    setEditorCuts((prev) =>
      prev.map((cut) => {
        if (cut.id !== cutId) return cut;
        const next = { ...cut, [field]: Math.max(0, value) } as EditorCut;
        if (next.endSec <= next.startSec) {
          if (field === "startSec") next.endSec = next.startSec + 0.2;
          else next.startSec = Math.max(0, next.endSec - 0.2);
        }
        return next;
      })
    );
  };

  const deleteEditorCut = (cutId: string) => {
    setEditorCuts((prev) => prev.filter((cut) => cut.id !== cutId));
    setSelectedCutId((prev) => (prev === cutId ? null : prev));
  };

  const splitEditorCut = (cutId: string) => {
    setEditorCuts((prev) => {
      const idx = prev.findIndex((cut) => cut.id === cutId);
      if (idx < 0) return prev;
      const target = prev[idx];
      const mid = Number(((target.startSec + target.endSec) / 2).toFixed(2));
      if (mid <= target.startSec + 0.1 || mid >= target.endSec - 0.1) return prev;
      const first: EditorCut = { ...target, id: `${target.id}-a`, endSec: mid };
      const second: EditorCut = { ...target, id: `${target.id}-b`, startSec: mid };
      return [...prev.slice(0, idx), first, second, ...prev.slice(idx + 1)];
    });
  };

  const ensureEditorCutsForTimelineEdit = useCallback((): EditorCut[] => {
    return editorCuts;
  }, [editorCuts]);

  const beginTimelineCutDrag = useCallback(
    (event: React.MouseEvent, cutId: string, mode: TimelineDragMode, totalDurationSec: number) => {
      event.preventDefault();
      event.stopPropagation();
      const trackEl = timelineVideoTrackRef.current;
      if (!trackEl) return;

      const editableCuts = ensureEditorCutsForTimelineEdit();
      const target = editableCuts.find((cut) => cut.id === cutId);
      if (!target) return;

      const trackWidthPx = trackEl.getBoundingClientRect().width;
      if (!Number.isFinite(trackWidthPx) || trackWidthPx <= 0) return;

      setSelectedCutId(cutId);
      setTimelineDragState({
        cutId,
        mode,
        pointerStartX: event.clientX,
        trackWidthPx,
        totalDurationSec: Math.max(0.001, totalDurationSec),
        baseStartSec: target.startSec,
        baseEndSec: target.endSec,
      });
    },
    [ensureEditorCutsForTimelineEdit]
  );

  useEffect(() => {
    if (!timelineDragState) return;
    const minDurationSec = 0.2;
    const minGapSec = 0.02;

    const handleMouseMove = (event: MouseEvent) => {
      const deltaRatio = (event.clientX - timelineDragState.pointerStartX) / Math.max(1, timelineDragState.trackWidthPx);
      const deltaSec = deltaRatio * timelineDragState.totalDurationSec;

      setEditorCuts((prev) => {
        const idx = prev.findIndex((cut) => cut.id === timelineDragState.cutId);
        if (idx < 0) return prev;
        const prevCut = prev[idx - 1] || null;
        const nextCut = prev[idx + 1] || null;
        const minStartBound = prevCut ? prevCut.endSec + minGapSec : 0;
        const maxEndBound = nextCut ? nextCut.startSec - minGapSec : timelineDragState.totalDurationSec;
        const baseStart = timelineDragState.baseStartSec;
        const baseEnd = timelineDragState.baseEndSec;
        const baseDuration = Math.max(minDurationSec, baseEnd - baseStart);
        const target = prev[idx];

        if (timelineDragState.mode === "move") {
          const nextStart = Math.max(minStartBound, Math.min(baseStart + deltaSec, maxEndBound - baseDuration));
          const nextEnd = nextStart + baseDuration;
          const next = [...prev];
          next[idx] = {
            ...target,
            startSec: Number(nextStart.toFixed(3)),
            endSec: Number(nextEnd.toFixed(3)),
          };
          return next;
        }

        if (timelineDragState.mode === "trimStart") {
          const nextStart = Math.max(minStartBound, Math.min(baseStart + deltaSec, baseEnd - minDurationSec));
          const next = [...prev];
          next[idx] = { ...target, startSec: Number(nextStart.toFixed(3)) };
          return next;
        }

        const nextEnd = Math.max(baseStart + minDurationSec, Math.min(baseEnd + deltaSec, maxEndBound));
        const next = [...prev];
        next[idx] = { ...target, endSec: Number(nextEnd.toFixed(3)) };
        return next;
      });
    };

    const handleMouseUp = () => {
      setTimelineDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [timelineDragState]);

  const handleGenerateTts = () => {
    if (!ttsScript.trim()) {
      alert("음성으로 변환할 텍스트를 입력해 주세요.");
      return;
    }
    const newSample = {
      id: Date.now(),
      voice: ttsVoiceApplyMode === "line" ? "대사별 목소리" : selectedVoice,
      text: ttsScript.trim().slice(0, 60) + (ttsScript.trim().length > 60 ? "..." : ""),
      status: "생성 완료",
    };
    setTtsSamples((prev) => [newSample, ...prev].slice(0, 3));
    setRenderingStatus("AI 음성 출력을 준비했습니다.");
  };

  useEffect(() => {
    timelineCurrentRef.current = timelineCurrentSec;
  }, [timelineCurrentSec]);

  useEffect(() => {
    if (timelineCurrentSec > totalEditorDurationSec) {
      seekTimeline(totalEditorDurationSec);
    }
  }, [timelineCurrentSec, totalEditorDurationSec, seekTimeline]);

  useEffect(() => {
    return () => {
      if (timelineTimerRef.current !== null) {
        window.clearInterval(timelineTimerRef.current);
      }
      if (imageStepProgressTimerRef.current !== null) {
        window.clearInterval(imageStepProgressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!timelineAudioRef.current) return;
    timelineAudioRef.current.playbackRate = timelinePlaybackRate;
    timelineAudioRef.current.volume = isTimelineMuted ? 0 : timelineVolume;
  }, [isTimelineMuted, timelinePlaybackRate, timelineVolume, editorAudioUrl]);

  const voiceStyleMap: Record<string, { rate: number; pitch: number }> = useMemo(
    () =>
      Object.fromEntries(
        availableVoiceOptions.map((voice) => [voice.name, { rate: voice.rate, pitch: voice.pitch }])
      ),
    [availableVoiceOptions]
  );

  const ENABLE_BROWSER_TTS_FALLBACK = false;
  const PREVIEW_FALLBACK_DELAY_MS = 900;
  const strictVoiceProfileMap: Record<string, { voice: string; ssmlGender: SsmlGender; rate: number; pitch: number }> =
    useMemo(
      () =>
        Object.fromEntries(
          availableVoiceOptions.map((voice) => [
            voice.name,
            {
              voice: voice.googleVoice,
              ssmlGender: voice.ssmlGender,
              rate: voice.rate,
              pitch: voice.pitch,
            },
          ])
        ),
      [availableVoiceOptions]
    );
  const stripGenderPrefix = (label: string): string =>
    String(label || "").replace(/^(?:\uB0A8\uC131|\uC5EC\uC131|\uC911\uC131)\s*/, "").trim();
  const resolveAvailableVoiceMeta = useCallback(
    (voiceName: string) => availableVoiceOptions.find((voice) => voice.name === voiceName) || null,
    [availableVoiceOptions]
  );
  const favoriteVoiceOptions = useMemo(
    () =>
      favoriteVoiceNames
        .map((voiceName) => resolveAvailableVoiceMeta(voiceName))
        .filter((voice): voice is ExtendedVoiceOption => Boolean(voice && "googleVoice" in voice)),
    [favoriteVoiceNames, resolveAvailableVoiceMeta]
  );
  const isFavoriteVoice = (voiceName: string) => favoriteVoiceNames.includes(voiceName);
  const toggleFavoriteVoice = (voiceName: string) => {
    setFavoriteVoiceNames((prev) => {
      if (prev.includes(voiceName)) {
        const next = prev.filter((name) => name !== voiceName);
        return next.length > 0 ? next : [voiceOptions[0].name];
      }
      return [...prev, voiceName];
    });
  };
  const voiceTagFilters: Array<"전체" | VoiceTag> = [
    "전체",
    "신뢰감 있는",
    "발랄한",
    "차분한",
    "권위 있는",
    "나레이션용",
    "광고/홍보",
  ];
  const filteredVoiceModalOptions = availableVoiceOptions.filter((voice) => {
    if (voiceGenderFilter !== "전체" && voice.category !== voiceGenderFilter) return false;
    if (voiceTagFilter !== "전체" && !voice.tags.includes(voiceTagFilter)) return false;
    return true;
  });
  const voiceModalSections = useMemo(() => {
    if (voiceGenderFilter !== "전체") {
      return [{ key: "filtered", title: "", voices: filteredVoiceModalOptions }];
    }
    const order: VoiceGender[] = ["남성", "여성", "중성"];
    return order
      .map((gender) => ({
        key: gender,
        title: gender,
        voices: filteredVoiceModalOptions.filter((voice) => voice.category === gender),
      }))
      .filter((section) => section.voices.length > 0);
  }, [filteredVoiceModalOptions, voiceGenderFilter]);
  const buildTroubleshootingSteps = (message: string): string[] => {
    const normalized = String(message || "").toLowerCase();
    if (normalized.includes("api key") || normalized.includes("invalid_api_key")) {
      return [
        "마이페이지에서 Google/Gemini API 키를 다시 저장한 뒤 재시도하세요.",
        "키 앞뒤 공백이 없는지 확인하세요.",
        "Cloud 콘솔에서 해당 API(Text-to-Speech 또는 Gemini) 활성화를 확인하세요.",
      ];
    }
    if (normalized.includes("quota") || normalized.includes("429")) {
      return [
        "할당량/요금제 상태를 확인한 뒤 1~5분 후 재시도하세요.",
        "같은 작업을 짧은 시간에 반복 실행하지 마세요.",
        "필요하면 모델 또는 품질 옵션을 낮춰 요청량을 줄이세요.",
      ];
    }
    if (normalized.includes("not found") || normalized.includes("model")) {
      return [
        "사용 가능한 모델 목록에서 해당 모델 지원 여부를 확인하세요.",
        "문제가 지속되면 기본 모델(Standard)로 변경 후 다시 시도하세요.",
        "오류 전문을 복사해 제작자에게 전달하세요.",
      ];
    }
    if (normalized.includes("auth_required") || normalized.includes("로그인이 필요")) {
      return [
        "다시 로그인한 후 동일 작업을 재시도하세요.",
        "다른 탭에서 로그아웃되어 세션이 만료되지 않았는지 확인하세요.",
      ];
    }
    return [
      "페이지를 새로고침한 뒤 동일 작업을 다시 시도하세요.",
      "브라우저 캐시를 지우거나 시크릿 창에서 재현 여부를 확인하세요.",
      "아래 오류 내용을 복사해 제작자에게 전달하세요.",
    ];
  };
  const openSupportErrorDialog = (title: string, context: string, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error || "알 수 없는 오류");
    const troubleshooting = buildTroubleshootingSteps(message);
    const reportText = [
      "[제작자에게 전달]",
      `시간: ${new Date().toISOString()}`,
      `페이지: ${location.pathname}`,
      `기능: ${context}`,
      `오류: ${message}`,
    ].join("\n");
    setSupportCopyStatus("");
    setSupportErrorDialog({
      title,
      context,
      message,
      troubleshooting,
      reportText,
    });
  };
  const handleCopySupportReport = async () => {
    if (!supportErrorDialog) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(supportErrorDialog.reportText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = supportErrorDialog.reportText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setSupportCopyStatus("복사 완료");
      window.setTimeout(() => setSupportCopyStatus(""), 1800);
    } catch {
      setSupportCopyStatus("복사 실패");
    }
  };

  // 오디오 재생 함수 (간단한 미리듣기용)
  const maleVoiceNames = /민준|지훈|준서|도현|태양|동현|상호|재훈|성민|건우|시우|수현|지수|해준|준호/i;

  const playBrowserTtsFallback = (
    chapterIndex: number,
    voiceName: string,
    text: string
  ): boolean => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return false;
    }

    const synth = window.speechSynthesis;
    const previewText = String(text || "")
      .split("\n")
      .map((line) => stripNarrationPrefix(line))
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);

    if (!previewText) {
      return false;
    }

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(previewText);
    utterance.lang = "ko-KR";
    const strictProfile = strictVoiceProfileMap[voiceName];
    const style = strictProfile
      ? { rate: strictProfile.rate, pitch: strictProfile.pitch }
      : (voiceStyleMap[voiceName] || { rate: 1, pitch: 0 });
    const isMaleVoice = maleVoiceNames.test(voiceName);
    const adjustedPitch = style.pitch !== 0 ? style.pitch : (isMaleVoice ? -2 : 2);
    utterance.rate = Math.min(2.0, Math.max(0.8, ttsSpeed * style.rate));
    utterance.pitch = Math.min(2, Math.max(0, 1 + adjustedPitch * 0.15));

    const voices = synth.getVoices();
    const koVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith("ko"));
    if (koVoices.length > 0) {
      const isMale = maleVoiceNames.test(voiceName);
      const maleCandidates = koVoices.filter((v) => /male|man|남|masculine|m$/i.test(v.name));
      const femaleCandidates = koVoices.filter((v) => /female|woman|여|feminine|f$/i.test(v.name));

      const genderBucket = isMale ? maleCandidates : femaleCandidates;
      const oppositeBucket = isMale ? femaleCandidates : maleCandidates;
      const bucket = genderBucket.length ? genderBucket : (oppositeBucket.length ? oppositeBucket : koVoices);

      const preferred =
        bucket.find((v) => v.name.includes(voiceName)) ||
        // 같은 성별 후보가 여러 개면 서로 다른 인덱스로 강제 분리
        (isMale ? bucket[Math.min(0, bucket.length - 1)] : bucket[Math.min(1, bucket.length - 1)]) ||
        koVoices[0];
      utterance.voice = preferred || null;
    }

    utterance.onstart = () => {
      setPlayingChapter(chapterIndex);
      setPlayingVoice(voiceName);
      setIsPlayingPreview(true);
    };
    utterance.onend = () => {
      setPlayingChapter(null);
      setPlayingVoice(null);
      setIsPlayingPreview(false);
    };
    utterance.onerror = () => {
      setPlayingChapter(null);
      setPlayingVoice(null);
      setIsPlayingPreview(false);
    };

    browserTtsRef.current = utterance;
    synth.speak(utterance);
    return true;
  };

  const playPreviewAudio = async (chapterIndex: number, voiceName: string, text: string) => {
    if (playingChapter === chapterIndex && playingVoice === voiceName && isPlayingPreview) {
      stopAudio();
      return;
    }

    try {
      previewAbortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const requestId = ++previewRequestIdRef.current;
      setSupportErrorDialog(null);
      setIsPlayingPreview(true);
      setPlayingChapter(chapterIndex);
      setPlayingVoice(voiceName);

      const strictProfile = strictVoiceProfileMap[voiceName];
      const googleVoice = strictProfile?.voice || "ko-KR-Standard-A";
      const ssmlGender = strictProfile?.ssmlGender || (maleVoiceNames.test(voiceName) ? "MALE" : "FEMALE");
      const voiceMeta = resolveAvailableVoiceMeta(voiceName);
      const voicePreset = resolveVoicePreset(voiceMeta);
      const voiceStyle = strictProfile
        ? { rate: strictProfile.rate, pitch: strictProfile.pitch }
        : (voiceStyleMap[voiceName] || { rate: 1, pitch: 0 });
      const isMaleVoice = maleVoiceNames.test(voiceName);
      const adjustedPitch = voiceStyle.pitch !== 0 ? voiceStyle.pitch : (isMaleVoice ? -2 : 2);
      const previewText = String(text || "")
        .split("\n")
        .map((line) => stripNarrationPrefix(line))
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 72);

      if (!previewText) {
        throw new Error("음성으로 변환할 텍스트가 없습니다.");
      }
      const ssml = buildPresetSsml(previewText, voicePreset);
      const presetAdjustedRate =
        voicePreset === "광고형" ? ttsSpeed * voiceStyle.rate * 1.08 :
          voicePreset === "뉴스형" ? ttsSpeed * voiceStyle.rate * 0.94 :
            ttsSpeed * voiceStyle.rate;
      const presetAdjustedPitch =
        voicePreset === "광고형" ? adjustedPitch + 1.6 :
          voicePreset === "뉴스형" ? adjustedPitch - 0.6 :
            adjustedPitch;

      const cacheKey = `${googleVoice}::${voicePreset}::${ssml}`;
      const cachedUrl = previewCacheRef.current.get(cacheKey);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        openSupportErrorDialog("로그인 필요", "TTS 미리듣기", new Error("로그인이 필요합니다."));
        setIsPlayingPreview(false);
        setPlayingChapter(null);
        setPlayingVoice(null);
        return;
      }

      let audioUrl = cachedUrl || "";
      let fallbackStarted = false;
      let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

      if (!audioUrl) {
        if (ENABLE_BROWSER_TTS_FALLBACK) {
          fallbackTimer = setTimeout(() => {
            fallbackStarted = playBrowserTtsFallback(chapterIndex, voiceName, text);
          }, PREVIEW_FALLBACK_DELAY_MS);
        }

        const controller = new AbortController();
        previewAbortRef.current = controller;

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            text: previewText,
            ssml,
            voice: googleVoice,
            ssmlGender,
            speakingRate: Math.min(2.0, Math.max(0.8, presetAdjustedRate)),
            pitch: presetAdjustedPitch,
            preview: true,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const vercelId = response.headers.get("x-vercel-id") || "";
          const contentType = response.headers.get("content-type") || "";
          const rawBody = await response.text().catch(() => "");
          let message = "";
          let details = "";
          let hint = "";

          if (contentType.includes("application/json")) {
            try {
              const payload = JSON.parse(rawBody || "{}");
              message = String(payload?.message || "").trim();
              details = String(payload?.details || "").trim();
              hint = String(payload?.hint || "").trim();
            } catch {
              message = "";
            }
          } else {
            details = rawBody.slice(0, 300).replace(/\s+/g, " ").trim();
          }

          const reason = (message || details || "tts_generation_failed").trim().toLowerCase();
          const friendlyMessage =
            reason.includes("invalid_api_key") || reason.includes("api key not valid")
              ? "Google Cloud API 키가 유효하지 않습니다. 마이페이지에서 API 키를 다시 등록해 주세요."
              : reason.includes("coupon_user_key_required") || reason.includes("preview_user_key_required")
                ? "할인 쿠폰 코드 적용 모드에서는 마이페이지에 Google Cloud API 키 등록이 필요합니다."
                : reason.includes("tts_permission_denied")
                  ? "Google Cloud TTS 권한이 없습니다. API 키 권한을 확인해 주세요."
                  : reason.includes("tts_quota_exceeded")
                    ? "TTS 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요."
                    : reason.includes("tts_voice_not_supported")
                      ? "선택한 음성을 현재 계정에서 사용할 수 없습니다. 다른 음성을 선택해 주세요."
                      : "음성 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
          const requestMeta = [`HTTP ${response.status}`, vercelId ? `요청ID: ${vercelId}` : ""]
            .filter(Boolean)
            .join(" · ");
          const finalMessage = [friendlyMessage, hint, requestMeta].filter(Boolean).join("\n\n");
          console.error("[TTS] API 오류:", { status: response.status, message, details, vercelId });
          throw new Error(finalMessage);
        }

        const data = await response.json();
        if (!data.audioContent) {
          throw new Error('오디오 데이터가 없습니다');
        }

        audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;

        previewCacheRef.current.set(cacheKey, audioUrl);
        if (previewCacheRef.current.size > 8) {
          const firstKey = previewCacheRef.current.keys().next().value;
          const oldUrl = previewCacheRef.current.get(firstKey);
          if (oldUrl && oldUrl.startsWith("blob:")) URL.revokeObjectURL(oldUrl);
          previewCacheRef.current.delete(firstKey);
        }
      }

      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      if (fallbackStarted && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      if (requestId !== previewRequestIdRef.current) {
        return;
      }

      audioRef.current = new Audio(audioUrl);
      audioRef.current.preload = "auto";
      audioRef.current.onended = () => {
        setPlayingChapter(null);
        setPlayingVoice(null);
        setIsPlayingPreview(false);
      };
      audioRef.current.onerror = (e) => {
        console.error('[TTS] 오디오 재생 오류:', e);
        setPlayingChapter(null);
        setPlayingVoice(null);
        setIsPlayingPreview(false);
      };

      await audioRef.current.play();
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        return;
      }
      console.error('[TTS] 오디오 재생 실패:', error);
      const fallbackOk = ENABLE_BROWSER_TTS_FALLBACK
        ? playBrowserTtsFallback(chapterIndex, voiceName, text)
        : false;
      if (!fallbackOk) {
        openSupportErrorDialog("TTS 미리듣기 오류", "TTS 미리듣기", error);
        setIsPlayingPreview(false);
        setPlayingChapter(null);
        setPlayingVoice(null);
      }
    }
  };

  const stopAudio = () => {
    previewAbortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingChapter(null);
    setPlayingVoice(null);
    setIsPlayingPreview(false);
  };

  const applyVoiceToAllChapters = (voiceName: string) => {
    if (!voiceName) return;
    const next: Record<number, string> = {};
    chapterScripts.forEach((_, index) => {
      next[index] = voiceName;
    });
    setChapterVoices(next);
    setSelectedVoice(voiceName);
  };

  const getLineVoiceKey = (chapterIndex: number, lineIndex: number) => `${chapterIndex}:${lineIndex}`;
  const getChapterDialogueLines = (content: string): string[] =>
    String(content || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  const parseDialogueLine = (line: string): { speaker: string; body: string } => {
    const matched = String(line || "").match(/^\s*([^:：]{1,24})\s*[:：]\s*(.+)$/);
    if (!matched) {
      return { speaker: "나레이터", body: String(line || "").trim() };
    }
    return { speaker: matched[1].trim(), body: matched[2].trim() };
  };
  const resolveLineVoice = (chapterIndex: number, lineIndex: number, fallbackVoice: string) => {
    const key = getLineVoiceKey(chapterIndex, lineIndex);
    return lineVoices[key] || fallbackVoice;
  };
  const applyVoiceToAllLines = (voiceName: string) => {
    if (!voiceName) return;
    const next = { ...lineVoices };
    chapterScripts.forEach((chapter, chapterIndex) => {
      const lines = getChapterDialogueLines(chapter.content);
      lines.forEach((_, lineIndex) => {
        next[getLineVoiceKey(chapterIndex, lineIndex)] = voiceName;
      });
    });
    setLineVoices(next);
    setSelectedVoice(voiceName);
  };



  const startRendering = () => {
    if (rendering) return;
    setRendering(true);
    setRenderingProgress(0);
    setRenderingStatus("출력을 예약하고 있습니다.");
    const interval = window.setInterval(() => {
      setRenderingProgress((prev) => {
        const next = prev + 20;
        if (next >= 100) {
          window.clearInterval(interval);
          setRendering(false);
          setRenderingStatus(
            "출력이 완료되었습니다. 결과를 다운로드하거나 패키지를 확인하세요."
          );
          return 100;
        }
        return next;
      });
    }, 400);
    progressTimerRef.current = interval;
  };

  const SCRIPT_SUBSTEP_COUNT = 4;
  const IMAGE_SUBSTEP_COUNT = 3;

  const stepPaths = useMemo(
    () => [
      `${normalizedBasePath}/video/setup`,
      `${normalizedBasePath}/video/script/1`,
      `${normalizedBasePath}/video/tts`,
      `${normalizedBasePath}/video/image/1`,
      `${normalizedBasePath}/video/generate`,
      `${normalizedBasePath}/video/render`,
    ],
    [normalizedBasePath]
  );

  const buildStepPath = useCallback(
    (stepIndex: number, options?: { scriptSubStep?: number; imageSubStep?: number }) => {
      if (stepIndex === 1) {
        const raw = options?.scriptSubStep ?? 0;
        const clamped = Math.min(Math.max(raw, 0), SCRIPT_SUBSTEP_COUNT - 1);
        return `${normalizedBasePath}/video/script/${clamped + 1}`;
      }
      if (stepIndex === 3) {
        const raw = options?.imageSubStep ?? 0;
        const clamped = Math.min(Math.max(raw, 0), IMAGE_SUBSTEP_COUNT - 1);
        return `${normalizedBasePath}/video/image/${clamped + 1}`;
      }
      return stepPaths[Math.min(Math.max(stepIndex, 0), stepPaths.length - 1)];
    },
    [normalizedBasePath, stepPaths]
  );

  const normalizePath = (path: string) =>
    path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
  const parseStepStateFromPath = (
    path: string
  ): { stepIndex: number; scriptSubStep?: number; imageSubStep?: number } | null => {
    const normalized = normalizePath(path);
    const legacyPersonaPath = normalizePath(`${normalizedBasePath}/video/persona`);
    if (normalized === legacyPersonaPath) {
      return { stepIndex: 3, imageSubStep: 0 };
    }

    const scriptMatch = normalized.match(new RegExp(`${normalizePath(`${normalizedBasePath}/video/script`)}(?:/(\\d+))?$`));
    if (scriptMatch) {
      const parsed = Number.parseInt(scriptMatch[1] || "1", 10);
      const sub = Number.isFinite(parsed) ? parsed - 1 : 0;
      return { stepIndex: 1, scriptSubStep: Math.min(Math.max(sub, 0), SCRIPT_SUBSTEP_COUNT - 1) };
    }

    const imageMatch = normalized.match(new RegExp(`${normalizePath(`${normalizedBasePath}/video/image`)}(?:/(\\d+))?$`));
    if (imageMatch) {
      const parsed = Number.parseInt(imageMatch[1] || "1", 10);
      const sub = Number.isFinite(parsed) ? parsed - 1 : 0;
      return { stepIndex: 3, imageSubStep: Math.min(Math.max(sub, 0), IMAGE_SUBSTEP_COUNT - 1) };
    }

    const index = stepPaths.indexOf(normalized);
    if (index >= 0) return { stepIndex: index };
    return null;
  };
  const getStoredStepIndex = () => {
    const stored = getStoredString(STORAGE_KEYS.step, "0");
    const value = Number.parseInt(stored, 10);
    if (!Number.isFinite(value)) return 0;
    const migrated = value > 3 ? value - 1 : value;
    return Math.min(Math.max(migrated, 0), steps.length - 1);
  };
  const goToStep = (index: number, replace = false) => {
    const safeIndex = Math.min(Math.max(index, 0), steps.length - 1);
    if (safeIndex === 1) setScriptSubStep(0);
    if (safeIndex === 3) setImageSubStep(0);
    setCurrentStep(safeIndex);
    const targetPath = buildStepPath(safeIndex, {
      scriptSubStep: safeIndex === 1 ? 0 : scriptSubStep,
      imageSubStep: safeIndex === 3 ? 0 : imageSubStep,
    });
    if (normalizePath(location.pathname) !== targetPath) {
      navigate(targetPath, { replace });
    }
    // 페이지 최상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const normalizedPath = normalizePath(location.pathname);
    const pathState = parseStepStateFromPath(normalizedPath);
    const storedIndex = getStoredStepIndex();
    const isPathChanged = lastRoutePathRef.current !== normalizedPath;

    console.log('[VideoPage] URL 라우팅:', {
      pathname: location.pathname,
      normalizedPath,
      pathState,
      storedIndex,
      currentStep,
      stepPaths
    });

    // /video 경로는 저장된 step이 있으면 그걸 사용하고, 없으면 /video/setup으로
    const isBaseVideoPath = normalizedPath === `${normalizedBasePath}/video` || normalizedPath === normalizedBasePath + '/video';
    const shouldUseStored = isBaseVideoPath && storedIndex !== 0;
    const nextIndex = shouldUseStored
      ? storedIndex
      : (pathState?.stepIndex ?? (isBaseVideoPath ? 0 : storedIndex));

    console.log('[VideoPage] Step 결정:', {
      isBaseVideoPath,
      shouldUseStored,
      nextIndex,
      willNavigate: normalizedPath !== buildStepPath(nextIndex, {
        scriptSubStep: isPathChanged && pathState?.scriptSubStep !== undefined ? pathState.scriptSubStep : scriptSubStep,
        imageSubStep: isPathChanged && pathState?.imageSubStep !== undefined ? pathState.imageSubStep : imageSubStep,
      })
    });

    if (nextIndex !== currentStep) {
      setCurrentStep(nextIndex);
    }
    if (
      isPathChanged &&
      pathState?.scriptSubStep !== undefined &&
      pathState.scriptSubStep !== scriptSubStep
    ) {
      setScriptSubStep(pathState.scriptSubStep);
    }
    if (
      isPathChanged &&
      pathState?.imageSubStep !== undefined &&
      pathState.imageSubStep !== imageSubStep
    ) {
      setImageSubStep(pathState.imageSubStep);
    }
    const targetPath = buildStepPath(nextIndex, {
      scriptSubStep: isPathChanged && pathState?.scriptSubStep !== undefined ? pathState.scriptSubStep : scriptSubStep,
      imageSubStep: isPathChanged && pathState?.imageSubStep !== undefined ? pathState.imageSubStep : imageSubStep,
    });
    if (normalizedPath !== targetPath) {
      navigate(targetPath, { replace: true });
    }
    lastRoutePathRef.current = normalizePath(targetPath);
  }, [
    location.pathname,
    navigate,
    stepPaths,
    normalizedBasePath,
    currentStep,
    buildStepPath,
    scriptSubStep,
    imageSubStep,
  ]);

  const canGoPrev =
    currentStep > 0 ||
    (steps[currentStep].id === "script" && scriptSubStep > 0) ||
    (steps[currentStep].id === "image" && imageSubStep > 0);

  // 각 단계별로 다음 단계 진행 가능 여부 체크
  const canGoNext = (() => {
    if (currentStep >= steps.length - 1) return false;

    const currentStepId = steps[currentStep].id;

    // script 단계: 하위 단계별 진행 조건
    if (currentStepId === 'script') {
      if (scriptSubStep === 0) return scriptDraft.trim().length > 0;
      if (scriptSubStep === 1) return Boolean(scriptAnalysis);
      if (scriptSubStep === 2) return Boolean(selectedTopic.trim()) && !isGeneratingScript;
      if (scriptSubStep === 3) return Boolean(generatedPlan) && !isGeneratingScript;
      return false;
    }
    if (currentStepId === "image") {
      if (imageSubStep === 0) return !isGeneratingPersonas;
      if (imageSubStep === 1) return Object.keys(chapterImages).length > 0;
      return true;
    }

    // 나머지 단계는 항상 진행 가능
    return true;
  })();

  const handlePrev = () => {
    if (!canGoPrev) return;
    if (steps[currentStep].id === "script" && scriptSubStep > 0) {
      setScriptSubStep((prev) => Math.max(prev - 1, 0));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (steps[currentStep].id === "image" && imageSubStep > 0) {
      setImageSubStep((prev) => Math.max(prev - 1, 0));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    goToStep(currentStep - 1);
  };

  const handleNext = async () => {
    if (!canGoNext) return;
    if (steps[currentStep].id === "script") {
      if (scriptSubStep === 2) {
        setScriptSubStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (scriptSubStep < 3) {
        setScriptSubStep((prev) => Math.min(prev + 1, 3));
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    // Step 2 (대본 작성)에서 Step 3 (음성 생성)으로 이동할 때 대본 자동 입력
    if (currentStep === 1 && generatedPlan) {
      const chapters: Array<{ title: string; content: string }> = [];

      if (generatedPlan.chapters && generatedPlan.chapters.length > 0) {
        // chapters 형식 - 챕터별로 분리
        generatedPlan.chapters.forEach((chapter) => {
          const lines = (chapter.script || [])
            .map((line) => toScriptLineText(line))
            .filter(Boolean)
            .join("\n");
          if (lines.trim()) {
            chapters.push({
              title: sanitizeCorruptedText(chapter.title, `챕터 ${chapters.length + 1}`),
              content: lines.trim()
            });
          }
        });
      } else if (generatedPlan.scriptWithCharacters && generatedPlan.scriptWithCharacters.length > 0) {
        // scriptWithCharacters 형식 - 하나의 챕터로
        const scriptText = generatedPlan.scriptWithCharacters
          .map((line) => toScriptLineText(line))
          .filter(Boolean)
          .join("\n");
        chapters.push({
          title: "전체 대본",
          content: scriptText.trim()
        });
      } else if (generatedPlan.scriptOutline && generatedPlan.scriptOutline.length > 0) {
        // scriptOutline 형식 - 단계별로 분리
        generatedPlan.scriptOutline.forEach((stage) => {
          chapters.push({
            title: stage.stage,
            content: stage.details.trim()
          });
        });
      }

      if (chapters.length > 0) {
        setChapterScripts(chapters);
        // 전체 스크립트도 설정
        const fullScript = chapters.map(ch => ch.content).join("\n\n");
        setTtsScript(fullScript);
      }
    }
    if (steps[currentStep].id === "image") {
      if (imageSubStep === 0 && personas.length === 0) {
        const created = await handleGeneratePersonas();
        if (imageStepProgressTimerRef.current !== null) {
          window.clearInterval(imageStepProgressTimerRef.current);
          imageStepProgressTimerRef.current = null;
        }
        if (!created) {
          window.setTimeout(() => {
            setImageStepProgress((prev) => ({ ...prev, active: false }));
          }, 2400);
          return;
        }
        window.setTimeout(() => {
          setImageStepProgress((prev) => ({ ...prev, active: false }));
        }, 1400);
      }
      if (imageSubStep < 2) {
        setImageSubStep((prev) => Math.min(prev + 1, 2));
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    goToStep(currentStep + 1);
  };

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const ads = document.querySelectorAll("ins.adsbygoogle");
      if (ads.length === 0) return;
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      ads.forEach((ad) => {
        if (ad.getAttribute("data-adsbygoogle-status") === "done") return;
        try {
          (window as any).adsbygoogle.push({});
        } catch {
          // ignore per-slot errors and continue remaining slots
        }
      });
    } catch (error) {
      console.error("Footer AdSense error:", error);
    }
  }, [currentStep, scriptSubStep, imageSubStep]);

  const activeStep = steps[currentStep];

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!bulkVoiceDropdownRef.current) return;
      if (!bulkVoiceDropdownRef.current.contains(event.target as Node)) {
        setIsBulkVoiceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (activeStep.id !== "render") return;
    if (timelineAutoPopulateRef.current) return;
    if (editorImageUrls.length > 0 && editorSubtitleCues.length > 0 && editorAudioUrl) {
      timelineAutoPopulateRef.current = true;
      return;
    }
    if (Object.keys(chapterImages).length === 0) return;
    timelineAutoPopulateRef.current = true;
    void handleApplyGeneratedAssetsToEditor();
  }, [activeStep.id, chapterImages, editorAudioUrl, editorImageUrls.length, editorSubtitleCues.length]);

  useEffect(() => {
    if (activeStep.id === "image" && imageSubStep === 0) return;
    if (imageStepProgressTimerRef.current !== null) {
      window.clearInterval(imageStepProgressTimerRef.current);
      imageStepProgressTimerRef.current = null;
    }
    setImageStepProgress((prev) => (prev.active ? { ...prev, active: false } : prev));
  }, [activeStep.id, imageSubStep]);

  const currentActionGuide = useMemo(() => {
    if (activeStep.id === "setup") {
      return {
        title: "지금 할 일",
        items: [
          "롱폼 또는 숏폼 카드 중 하나를 선택하세요.",
          "선택이 끝나면 하단의 다음 단계 버튼을 누르세요.",
        ],
      };
    }

    if (activeStep.id === "script") {
      if (scriptSubStep === 0) {
        return {
          title: "대본 입력 순서",
          items: [
            "벤치마킹할 원본 대본을 '대본 내용' 칸에 붙여넣으세요.",
            "필요하면 제목/카테고리/길이를 먼저 설정하세요.",
            "'다음 단계'를 눌러 분석 단계로 이동하세요.",
          ],
        };
      }
      if (scriptSubStep === 1) {
        return {
          title: "대본 분석 순서",
          items: [
            "2단계에 진입하면 대본 구조 분석이 자동으로 시작됩니다.",
            "분석과 추천 주제가 생성될 때까지 기다리세요.",
            "완료되면 '다음 단계'를 눌러 주제 선택으로 이동하세요.",
          ],
        };
      }
      if (scriptSubStep === 2) {
        return {
          title: "대본 생성 순서",
          items: [
            "영상 길이와 대본 스타일을 먼저 선택하세요.",
            "추천 주제를 선택하거나 직접 주제를 입력하세요.",
            "선택이 끝나면 하단 '다음 단계' 버튼을 눌러 대본 생성을 시작하세요.",
          ],
        };
      }
      return {
        title: "결과 확인 순서",
        items: [
          "생성된 대본 내용을 챕터별로 확인하세요.",
          "필요하면 챕터별/전체 대본 다운로드를 누르세요.",
          "작업이 끝나면 하단 '다음 단계'로 이동하세요.",
        ],
      };
    }

    if (activeStep.id === "tts") {
      return {
        title: "음성 생성 순서",
        items: [
          "'챕터별 적용' 또는 \"대사별 적용\" 방식을 먼저 선택하세요.",
          "선택한 방식에 맞춰 음성을 지정하고 필요하면 '미리듣기'를 하세요.",
          "대본을 확인한 뒤 \"음성 생성\" 버튼을 눌러 저장하세요.",
          "완료 후 다음 단계로 이동하세요.",
        ],
      };
    }

    if (activeStep.id === "image") {
      if (imageSubStep === 0) {
        return {
          title: "이미지 생성 1단계",
          items: [
            "인물/배경 스타일을 선택하세요.",
            "하단 '다음 단계'를 누르면 페르소나가 자동 생성됩니다.",
          ],
        };
      }
      if (imageSubStep === 1) {
        return {
          title: "이미지 생성 2단계",
          items: [
            "프롬프트를 조정하고 컷 이미지를 생성하세요.",
            "이미지 생성이 끝나면 '다음 단계'로 이동하세요.",
          ],
        };
      }
      return {
        title: "이미지 생성 3단계",
        items: [
          "생성된 컷 이미지를 챕터별로 최종 점검하세요.",
          "필요하면 '전체 이미지 저장'으로 내려받으세요.",
        ],
      };
    }

    if (activeStep.id === "generate") {
      return {
        title: "영상 생성 순서",
        items: [
          "영상 프롬프트를 입력하세요.",
          "영상 생성하기 또는 영상 생성 요청하기 버튼을 누르세요.",
          "결과 미리보기를 확인한 뒤 다음 단계로 이동하세요.",
        ],
      };
    }

    return {
      title: "출력 순서",
      items: [
        "출력 옵션과 편집 메모를 점검하세요.",
        "`영상 출력 시작` 버튼을 눌러 최종 렌더링을 시작하세요.",
        "완료 후 결과 파일을 다운로드하세요.",
      ],
    };
  }, [activeStep.id, scriptSubStep, imageSubStep]);
  const sidebarGuideItems = useMemo(() => {
    const seen = new Set<string>();
    const deduped = currentActionGuide.items.filter((item) => {
      const normalized = String(item || "").replace(/\s+/g, " ").trim();
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
    return deduped;
  }, [currentActionGuide.items]);
  const formatOptions = [
    {
      value: "long" as VideoFormat,
      title: "롱폼",
      subtitle: "가로형 16:9",
      size: "1920 x 1080",
      ratio: "16:9",
      icon: <FiMonitor className="text-lg" />,
      description: "YouTube 본 콘텐츠",
    },
    {
      value: "short" as VideoFormat,
      title: "숏폼",
      subtitle: "세로형 9:16",
      size: "1080 x 1920",
      ratio: "9:16",
      icon: <FiSmartphone className="text-lg" />,
      description: "Shorts / Reels / TikTok",
    },
  ];

  const handleFormatChange = (format: VideoFormat) => {
    setVideoFormat(format);
    setRenderRatio(format === "short" ? "9:16" : "16:9");
  };
  const scriptLengthOptions = [
    { value: "1", label: "1분" },
    { value: "8", label: "8분" },
    { value: "60", label: "1시간" },
    { value: "custom", label: "사용자 입력" },
  ];
  const resolveScriptLengthMinutes = () => {
    return scriptLengthMinutes === "custom" ? customScriptLength : scriptLengthMinutes;
  };
  const formatScriptLengthLabel = () => {
    if (scriptLengthMinutes === "custom") {
      return `${customScriptLength || "-"}분`;
    }
    if (scriptLengthMinutes === "60") {
      return "1시간";
    }
    return `${scriptLengthMinutes}분`;
  };
  const resolveScriptLengthValue = () => {
    const value = resolveScriptLengthMinutes();
    const minutes = Number(value);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : 8;
  };
  const getTargetChapters = (minutes: number) => {
    if (minutes >= 60) return 12;
    if (minutes >= 45) return 9;
    if (minutes >= 30) return 6;
    if (minutes >= 20) return 5;
    if (minutes >= 15) return 4;
    if (minutes >= 10) return 3;
    if (minutes >= 5) return 2;
    return 1;
  };
  const handleSelectScriptLength = (minutes: string) => {
    setScriptLengthMinutes(minutes);
    const resolved = minutes === "custom" ? customScriptLength : minutes;
    const seconds = Number(resolved) * 60;
    if (Number.isFinite(seconds) && seconds > 0) {
      setRenderDuration(String(seconds));
    }
  };
  const handleCustomScriptLengthChange = (value: string) => {
    setCustomScriptLength(value);
    if (scriptLengthMinutes !== "custom") return;
    const seconds = Number(value) * 60;
    if (Number.isFinite(seconds) && seconds > 0) {
      setRenderDuration(String(seconds));
    }
  };
  const resolveRenderDurationSeconds = () => {
    const seconds = Number(renderDuration);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
  };
  const normalizeGeneratedImageSrc = (rawImage: string) => {
    const value = String(rawImage ?? "").trim();
    if (!value) return "";
    if (value.startsWith("data:image/")) return value;
    if (value.startsWith("http://") || value.startsWith("https://")) return value;

    const stripped = value.replace(/\s+/g, "");
    const hasDataUriPrefix = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(stripped);
    return hasDataUriPrefix ? stripped : `data:image/png;base64,${stripped}`;
  };
  const requiredImageCount = useMemo(() => {
    const seconds = resolveRenderDurationSeconds();
    return Math.max(1, Math.ceil((seconds / 60) * 4));
  }, [renderDuration]);
  useEffect(() => {
    const seconds = resolveRenderDurationSeconds();
    const minutes = Math.max(1, Math.round(seconds / 60));
    if ([1, 8, 60].includes(minutes)) {
      const next = String(minutes);
      if (scriptLengthMinutes !== next) {
        setScriptLengthMinutes(next);
      }
      return;
    }
    if (scriptLengthMinutes !== "custom") {
      setScriptLengthMinutes("custom");
    }
    if (customScriptLength !== String(minutes)) {
      setCustomScriptLength(String(minutes));
    }
  }, [renderDuration]);
  const isScriptStepReady = (index: number) => {
    switch (index) {
      case 0:
        return Boolean(scriptDraft.trim());
      case 1: {
        const value = resolveScriptLengthMinutes();
        return Boolean(value) && Number(value) > 0;
      }
      case 2:
        return Boolean(scriptAnalysis);
      case 3:
        return Boolean(selectedTopic);
      case 4:
        return Boolean(generatedPlan);
      default:
        return true;
    }
  };
  const handleAnalyzeScript = async (options?: { autoAdvance?: boolean; showDetails?: boolean }) => {
    if (!scriptDraft.trim()) {
      setScriptError("분석할 대본을 먼저 입력해 주세요.");
      return;
    }

    const scriptLength = scriptDraft.trim().length;

    setScriptError("");
    setShowAnalysisDetails(!!options?.showDetails);
    setIsAnalyzingScript(true);
    setAnalyzeProgress({ ...analyzeProgress, currentStep: 0 });

    if (options?.autoAdvance) {
      setScriptSubStep(2);
    }

    try {
      // Step 1: 대본 구조 분석
      setAnalyzeProgress(prev => ({ ...prev, currentStep: 0 }));
      const analysis = await analyzeTranscript(
        scriptDraft.trim(),
        selectedCategory,
        scriptTitle || projectTitle,
        !options?.showDetails
      );
      setScriptAnalysis(analysis);

      // Step 2: 핵심 키워드 추출 (이미 analysis에 포함됨)
      setAnalyzeProgress(prev => ({ ...prev, currentStep: 1 }));

      // Step 3: 추천 주제 생성 (소재 중심)
      setAnalyzeProgress(prev => ({ ...prev, currentStep: 2 }));
      const ideas = await generateIdeas(
        analysis,
        selectedCategory,
        undefined
      );
      setScriptIdeas(ideas);
      if (ideas.length > 0) {
        setSelectedTopic(ideas[0]);
      }

      // 분석 완료! 사용자가 결과를 확인하고 "다음 단계" 버튼으로 진행하도록 유지
      // (자동 이동 제거: 사용자가 분석 결과를 볼 수 있도록 함)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "대본 분석에 실패했습니다.";

      // Check if it's a timeout error or network error
      if (errorMessage.includes("FUNCTION_INVOCATION_TIMEOUT") || errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
        setScriptError(
          "분석 작업이 시간 초과되었습니다.\n\n" +
          `대본 길이: ${scriptLength.toLocaleString()}자\n\n` +
          "긴 대본은 처리 시간이 오래 걸립니다.\n" +
          "해결 방법:\n" +
          "- 5분 후 다시 시도해 주세요 (서버가 일시적으로 바쁠 수 있습니다)\n" +
          "- 대본을 2-3개로 나눠서 분석한 후 결합하는 것을 권장합니다\n" +
          "- 다시 시도 버튼을 눌러주세요\n\n" +
          "문제가 계속되면 관리자에게 문의해 주세요."
        );
      } else if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
        setScriptError(
          "네트워크 오류가 발생했습니다.\n\n" +
          "- 인터넷 연결을 확인해 주세요.\n" +
          "- 잠시 후 다시 시도해 주세요.\n\n" +
          `상세 정보: ${errorMessage}`
        );
      } else {
        setScriptError(errorMessage);
      }
    } finally {
      setIsAnalyzingScript(false);
      setAnalyzeProgress({ ...analyzeProgress, currentStep: 0 });
    }
  };

  const handleReanalyzeScript = () => {
    if (isAnalyzingScript || !scriptDraft.trim()) return;
    autoAnalyzeKeyRef.current = "";
    setScriptError("");
    setShowAnalysisDetails(true);
    void handleAnalyzeScript({ autoAdvance: false, showDetails: true });
  };

  const handleRefreshIdeas = async () => {
    if (!scriptAnalysis || isAnalyzingScript || isRefreshingIdeas) return;
    setScriptError("");
    setIsRefreshingIdeas(true);

    // 1) 즉시 체감 반응: 기존 추천 목록을 빠르게 재정렬/순환해 바로 갱신
    const quickIdeas = (() => {
      if (!scriptIdeas.length) return [];
      const seed = Date.now() % scriptIdeas.length;
      const rotated = scriptIdeas.map((_, index) => scriptIdeas[(index + seed) % scriptIdeas.length]);
      return rotated.map((idea, index) => {
        const suffixes = [
          "실전 적용 포인트",
          "핵심 구조 해부",
          "수익화 시나리오",
          "비용 절감 전략",
          "리스크 관리 포인트",
          "현장 실행 가이드",
        ];
        const base = idea.replace(/\s*[-|:]\s*.*$/, "").trim();
        return `${base} ${suffixes[index % suffixes.length]}`;
      });
    })();

    if (quickIdeas.length > 0) {
      setScriptIdeas(quickIdeas);
      setSelectedTopic(quickIdeas[0]);
      // 즉시 UI 잠금 해제해서 버튼 체감 지연 제거
      setTimeout(() => setIsRefreshingIdeas(false), 250);
    }

    // 2) 서버 추천은 백그라운드 갱신 (이미 요청 중이면 중복 요청 방지)
    if (refreshIdeasInFlightRef.current) return;
    refreshIdeasInFlightRef.current = true;
    const requestId = ++refreshIdeasRequestIdRef.current;

    try {
      setAnalyzeProgress((prev) => ({ ...prev, currentStep: 2 }));
      const ideas = await generateIdeas(scriptAnalysis, selectedCategory, undefined);
      if (refreshIdeasRequestIdRef.current !== requestId) return;
      if (ideas.length > 0) {
        setScriptIdeas(ideas);
        setSelectedTopic(ideas[0]);
      }
    } catch (error) {
      if (refreshIdeasRequestIdRef.current !== requestId) return;
      const errorMessage = error instanceof Error ? error.message : "추천 주제 생성에 실패했습니다.";
      if (!quickIdeas.length) {
        setScriptError(errorMessage);
      }
    } finally {
      if (refreshIdeasRequestIdRef.current === requestId) {
        setIsRefreshingIdeas(false);
      }
      refreshIdeasInFlightRef.current = false;
    }
  };

  useEffect(() => {
    const isScriptAnalyzeStep = steps[currentStep]?.id === "script" && scriptSubStep === 1;
    if (!isScriptAnalyzeStep) {
      autoAnalyzeKeyRef.current = "";
      return;
    }
    if (isAnalyzingScript) return;
    if (!scriptDraft.trim()) return;
    if (scriptAnalysis) return;

    const analysisKey = `${selectedCategory}::${scriptTitle}::${scriptDraft.trim()}`;
    if (autoAnalyzeKeyRef.current === analysisKey) return;

    autoAnalyzeKeyRef.current = analysisKey;
    void handleAnalyzeScript({ autoAdvance: false, showDetails: true });
  }, [currentStep, scriptSubStep, isAnalyzingScript, scriptDraft, selectedCategory, scriptTitle, scriptAnalysis]);

  useEffect(() => {
    const isScriptResultStep = steps[currentStep]?.id === "script" && scriptSubStep === 3;
    if (!isScriptResultStep) return;
    if (!scriptAnalysis || !selectedTopic.trim()) return;
    if (generatedPlan || isGeneratingScript) return;
    if (scriptError) return;
    void handleGenerateScript();
  }, [currentStep, scriptSubStep, scriptAnalysis, selectedTopic, generatedPlan, isGeneratingScript, scriptError]);

  useEffect(() => {
    if (!generatedPlan) {
      setExpandedChapters({});
      return;
    }
    setExpandedChapters(buildDefaultExpandedChapters(generatedPlan));
  }, [generatedPlan]);

  const ensureChaptersByLength = (plan: NewPlan): NewPlan => {
    const minutes = resolveScriptLengthValue();
    const targetChapters = getTargetChapters(minutes);
    const scriptLines = plan.scriptWithCharacters ?? [];
    const hasChapters = plan.chapters && plan.chapters.length > 0;
    if (hasChapters && plan.chapters!.length >= targetChapters) {
      return plan;
    }
    if (scriptLines.length === 0) {
      return plan;
    }
    const chunkSize = Math.max(1, Math.ceil(scriptLines.length / targetChapters));
    const estimatedPerChapter = Math.max(1, Math.round(minutes / targetChapters));
    const chapters = Array.from({ length: targetChapters }, (_, index) => {
      const start = index * chunkSize;
      const end = start + chunkSize;
      const script = scriptLines.slice(start, end);
      return {
        id: `chapter-${index + 1}`,
        title: `챕터 ${index + 1}`,
        purpose: "영상 길이에 맞춰 자동 분할된 챕터",
        estimatedDuration: `${estimatedPerChapter}분`,
        script,
      };
    }).filter((chapter) => chapter.script && chapter.script.length > 0);
    if (chapters.length === 0) return plan;
    return {
      ...plan,
      chapters,
    };
  };
  const handleGenerateScript = async () => {
    if (!scriptAnalysis) {
      setScriptError("대본 구조 분석을 먼저 진행해 주세요.");
      return;
    }
    if (!selectedTopic) {
      setScriptError("추천 주제를 선택해 주세요.");
      return;
    }
    setScriptError("");
    // 이전 생성 결과가 남아 있으면 실패 시에도 4단계처럼 보일 수 있어 시작 시 초기화
    setGeneratedPlan(null);
    setScriptSubStep(3);
    setIsGeneratingScript(true);
    setGenerateProgress({ ...generateProgress, currentStep: 0 });

    try {
      // Step 1: 대본 구조 설계
      setGenerateProgress(prev => ({ ...prev, currentStep: 0 }));
      await new Promise(resolve => setTimeout(resolve, 300)); // UI 업데이트를 위한 짧은 지연

      // Step 2: 콘텐츠 생성 (/script 페이지와 동일한 챕터 파이프라인)
      setGenerateProgress(prev => ({ ...prev, currentStep: 1 }));
      const chapterScriptStyle = scriptStyle === "narration" ? "나레이션 버전" : "대화 버전";
      const outline = await generateChapterOutline(
        scriptAnalysis,
        selectedTopic,
        formatScriptLengthLabel(),
        selectedCategory,
        undefined,
        chapterScriptStyle
      );
      const chapters = outline.chapters || [];
      const chapterScripts = [];
      for (let index = 0; index < chapters.length; index += 1) {
        const chapter = chapters[index];
        const script = await generateChapterScript(
          chapter,
          outline.characters || [],
          selectedTopic,
          selectedCategory,
          chapters,
          chapterScriptStyle
        );
        chapterScripts.push({
          ...chapter,
          script,
        });
      }
      const plan: NewPlan = {
        newIntent: outline.newIntent || [],
        characters: outline.characters || [],
        chapters: chapterScripts,
      };

      // Step 3: AI 응답 정제 (마크다운 기호 제거)
      setGenerateProgress(prev => ({ ...prev, currentStep: 2 }));
      await new Promise(resolve => setTimeout(resolve, 300));

      // 대본 내용에서 마크다운 기호 제거
      const cleanPlan = cleanAIResponse(plan);

      const normalizedPlan = ensureChaptersByLength(cleanPlan);
      setGeneratedPlan(normalizedPlan);

      // 대본 생성 완료 후 결과 단계로 자동 이동
      setScriptSubStep(3);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "대본 생성에 실패했습니다.";

      // Check if it's a timeout error
      if (errorMessage.includes("FUNCTION_INVOCATION_TIMEOUT") || errorMessage.includes("timeout")) {
        setScriptError(
          "대본 생성이 시간 초과되었습니다.\n\n" +
          "요청한 대본이 너무 길거나 서버가 응답하지 않았습니다.\n" +
          "- 대본 길이를 줄여서 다시 시도해 주세요.\n" +
          "- 잠시 후 다시 시도해 주세요.\n\n" +
          "문제가 계속되면 관리자에게 문의해 주세요."
        );
      } else {
        setScriptError(errorMessage);
      }
    } finally {
      setIsGeneratingScript(false);
      setGenerateProgress({ ...generateProgress, currentStep: 0 });
    }
  };

  // AI 응답 정제 함수 - 마크다운 기호 제거
  const cleanAIResponse = (plan: NewPlan): NewPlan => {
    const cleanText = (text: string): string => {
      return text
        .replace(/\*\*/g, '')   // **굵은글씨** 제거
        .replace(/\*/g, '')     // *기울임* 제거
        .replace(/\_\_/g, '')   // __밑줄__ 제거
        .replace(/\_/g, '')     // _기울임_ 제거
        .replace(/\#\#\#\#/g, '') // #### 제거
        .replace(/\#\#\#/g, '')   // ### 제거
        .replace(/\#\#/g, '')     // ## 제거
        .replace(/\#/g, '')       // # 제거
        .trim();
    };

    return {
      ...plan,
      chapters: plan.chapters?.map(chapter => ({
        ...chapter,
        title: sanitizeCorruptedText(cleanText(chapter.title || '')),
        purpose: cleanText(chapter.purpose || ''),
        script: chapter.script?.map(line => ({
          ...line,
          character: cleanText(line.character),
          line: stripScriptArtifacts(stripNarrationPrefix(cleanText(line.line))),
        })),
      })),
      scriptWithCharacters: plan.scriptWithCharacters?.map(line => ({
        ...line,
        character: cleanText(line.character),
        line: stripScriptArtifacts(stripNarrationPrefix(cleanText(line.line))),
      })),
      scriptOutline: plan.scriptOutline?.map(stage => ({
        ...stage,
        stage: cleanText(stage.stage),
        purpose: cleanText(stage.purpose),
        details: stripScriptArtifacts(cleanText(stage.details)),
      })),
      newIntent: plan.newIntent?.map(item => ({
        ...item,
        title: cleanText(item.title),
        description: cleanText(item.description),
      })),
    };
  };

  // 챕터별 대본 다운로드 포맷
  const formatChapterScriptToText = (
    chapter: { title: string; script?: { character: string; line: string; timestamp?: string }[] }
  ): string => {
    if (!chapter.script) return "";

    const safeTitle = sanitizeCorruptedText(chapter.title, "챕터");
    let text = `${safeTitle}\n${"=".repeat(50)}\n\n`;
    chapter.script.forEach((item) => {
      const lineText = toScriptLineText(item);
      if (!lineText) return;
      if (item.timestamp) {
        text += `[${item.timestamp}] ${lineText}\n\n`;
      } else {
        text += `${lineText}\n\n`;
      }
    });
    return text;
  };

  // 전체 챕터 대본 다운로드 포맷
  const formatAllChaptersToText = (chapters: any[]): string => {
    return chapters
      .filter((chapter) => chapter.script)
      .map((chapter, index) => {
        const safeTitle = sanitizeCorruptedText(chapter.title, `챕터 ${index + 1}`);
        let text = `챕터 ${index + 1}: ${safeTitle}\n${"=".repeat(50)}\n\n`;
        chapter.script.forEach((item: any) => {
          const lineText = toScriptLineText(item);
          if (!lineText) return;
          if (item.timestamp) {
            text += `[${item.timestamp}] ${lineText}\n\n`;
          } else {
            text += `${lineText}\n\n`;
          }
        });
        return text;
      })
      .join("\n\n" + "=".repeat(50) + "\n\n");
  };

  const formatGeneratedScript = (plan: NewPlan | null) => {
    if (!plan) return "";
    if (plan.chapters && plan.chapters.length > 0) {
      return plan.chapters
        .map((chapter, index) => {
          const lines = (chapter.script || [])
            .map((line) => toScriptLineText(line))
            .filter(Boolean)
            .join("\n");
          const safeTitle = sanitizeCorruptedText(chapter.title, `챕터 ${index + 1}`);
          return `# 챕터 ${index + 1}. ${safeTitle}\n${lines || chapter.purpose}`;
        })
        .join("\n\n");
    }
    if (plan.scriptWithCharacters && plan.scriptWithCharacters.length > 0) {
      return plan.scriptWithCharacters
        .map((line) => toScriptLineText(line))
        .filter(Boolean)
        .join("\n");
    }
    if (plan.scriptOutline && plan.scriptOutline.length > 0) {
      return plan.scriptOutline
        .map((stage) => `[${stage.stage}]\n${stage.details}`)
        .join("\n\n");
    }
    return "";
  };

  const recommendationReasons = useMemo(() => {
    if (!scriptIdeas.length || !scriptAnalysis) return [];
    const keywords = (scriptAnalysis.keywords || []).filter(Boolean);
    const intents = (scriptAnalysis.intent || []).map((item) => item?.title).filter(Boolean) as string[];
    const stages = (scriptAnalysis.scriptStructure || []).map((item) => item?.purpose).filter(Boolean) as string[];
    const shortLabels = [
      "핵심 메시지",
      "문제 인식",
      "타깃 시청자",
      "전개 구조",
      "실행 관점",
      "수익 관점",
      "리스크 관점",
      "사례 확장",
    ];

    return scriptIdeas.map((idea, index): string => {
      const matchedKeyword = keywords.find((keyword) => idea.includes(keyword));
      const intentHint = intents[index % Math.max(intents.length, 1)];
      const stageHint = stages[index % Math.max(stages.length, 1)];
      const fallbackLabel = shortLabels[index % shortLabels.length];

      if (matchedKeyword) {
        return `'${matchedKeyword}' 키워드에 집중한 주제`;
      }
      if (intentHint) {
        return `'${intentHint}' 흐름에 맞춘 주제`;
      }
      if (stageHint) {
        return `'${stageHint}' 포인트를 살린 주제`;
      }
      return `'${fallbackLabel}'에 집중한 주제`;
    });
  }, [scriptIdeas, scriptAnalysis]);

  const chapterCutPlans = useMemo(() => {
    const source = chapterScripts.length
      ? chapterScripts.map((chapter, index) => ({
        chapterIndex: index,
        title: sanitizeCorruptedText(chapter.title, `챕터 ${index + 1}`),
        content: String(chapter.content || "").trim(),
      }))
      : generatedPlan?.chapters?.map((chapter, index) => ({
        chapterIndex: index,
        title: sanitizeCorruptedText(chapter.title, `챕터 ${index + 1}`),
        content: (chapter.script || [])
          .map((line) => toScriptLineText(line))
          .filter(Boolean)
          .join("\n")
          .trim(),
      })) || [];

    if (!source.length) return [];

    const weights = source.map((chapter) => Math.max(1, chapter.content.length));
    const totalWeight = weights.reduce((acc, cur) => acc + cur, 0);
    const baseCuts = source.map((chapter, idx) => ({
      ...chapter,
      cuts: Math.floor((requiredImageCount * weights[idx]) / totalWeight),
    }));
    let allocated = baseCuts.reduce((acc, chapter) => acc + chapter.cuts, 0);
    let cursor = 0;
    while (allocated < requiredImageCount) {
      baseCuts[cursor % baseCuts.length].cuts += 1;
      allocated += 1;
      cursor += 1;
    }
    while (allocated > requiredImageCount) {
      const target = baseCuts[cursor % baseCuts.length];
      if (target.cuts > 0) {
        target.cuts -= 1;
        allocated -= 1;
      }
      cursor += 1;
    }

    let globalCutIndex = 0;
    const totalSeconds = resolveRenderDurationSeconds();
    return baseCuts.map((chapter) => {
      const sceneUnits = chapter.content
        .split(/(?<=[.!?。！？])\s+|\n+/)
        .map((unit) => unit.trim())
        .filter(Boolean);
      const fallback = sceneUnits.length ? sceneUnits : [chapter.content || chapter.title];
      const cuts = Array.from({ length: chapter.cuts }, (_, localCutIndex) => {
        const isLast = globalCutIndex === requiredImageCount - 1;
        const used = globalCutIndex * 4;
        const remain = Math.max(1, totalSeconds - used);
        const duration = isLast ? Math.min(4, remain) : 4;
        const imageKey = `chapter-${chapter.chapterIndex}-cut-${localCutIndex}`;
        const sliceStart = Math.floor((localCutIndex * fallback.length) / Math.max(1, chapter.cuts));
        const rawSliceEnd = Math.floor(((localCutIndex + 1) * fallback.length) / Math.max(1, chapter.cuts));
        const sliceEnd = Math.max(sliceStart + 1, rawSliceEnd);
        const cutSummary = fallback
          .slice(sliceStart, sliceEnd)
          .join(" ")
          .trim()
          .slice(0, 600);
        const cut = {
          chapterIndex: chapter.chapterIndex,
          globalCutIndex,
          localCutIndex,
          imageKey,
          secondsFrom: used,
          secondsTo: used + duration,
          content: cutSummary || fallback[localCutIndex % fallback.length],
          chapterTitle: chapter.title,
        };
        globalCutIndex += 1;
        return cut;
      });
      return {
        chapterIndex: chapter.chapterIndex,
        title: chapter.title,
        cuts,
      };
    });
  }, [chapterScripts, generatedPlan, requiredImageCount, renderDuration]);
  const timelineScenes = useMemo(
    () =>
      chapterCutPlans.flatMap((chapter) =>
        chapter.cuts.map((cut) => ({
          id: cut.globalCutIndex,
          label: `챕터 ${chapter.chapterIndex + 1} · 컷 ${cut.localCutIndex + 1}`,
          duration: `${cut.secondsTo - cut.secondsFrom}초`,
          desc: cut.content,
        }))
      ),
    [chapterCutPlans]
  );
  const allCuts = useMemo(
    () =>
      chapterCutPlans.flatMap((chapter) =>
        chapter.cuts.map((cut) => ({
          ...cut,
          chapterIndex: chapter.chapterIndex,
        }))
      ),
    [chapterCutPlans]
  );

  const categorySensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 2 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCategoryDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCategoryOrder((current) => {
      const oldIndex = current.indexOf(String(active.id));
      const newIndex = current.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  }, []);

  const renderStepContent = () => {
    switch (activeStep.id) {
      case "setup":
        return (
          <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
            <div className="rounded-[clamp(1rem,2vw,1.4rem)] border border-white/20 bg-black/40 p-[clamp(1rem,2vw,1.4rem)]">
              <h3 className="text-2xl font-bold text-white">영상 기본 설정</h3>
              <p className="mt-3 text-sm text-white/70">
                롱폼/숏폼 화면 비율을 선택해 주세요.
              </p>
              <div className="mt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {formatOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleFormatChange(option.value)}
                      className={`group rounded-2xl border px-5 py-6 text-center transition ${videoFormat === option.value
                        ? "border-red-400 bg-red-500/10 shadow-[0_10px_20px_rgba(239,68,68,0.2)]"
                        : "border-white/15 bg-black/30 hover:border-white/30 hover:bg-black/50"
                        }`}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <span className={`flex h-12 w-12 items-center justify-center rounded-full transition ${videoFormat === option.value ? "bg-red-500/20" : "bg-white/10 group-hover:bg-white/15"
                          }`}>
                          {option.icon}
                        </span>
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">{option.title}</p>
                          <p className="mt-1 text-sm font-semibold text-white/60">{option.subtitle}</p>
                          <p className="mt-0.5 text-xs text-white/40">{option.size}</p>
                        </div>
                        <p className="mt-1 text-xs text-white/50">{option.description}</p>
                        <div className="mt-2 flex justify-center">
                          <div
                            className={`relative transition ${option.ratio === "16:9" ? "h-16 w-28" : "h-28 w-16"
                              }`}
                          >
                            <div
                              className={`absolute inset-0 rounded-lg border transition ${videoFormat === option.value ? "border-red-400/70 shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "border-white/20 group-hover:border-white/30"
                                } bg-black/40`}
                            >
                              <div className="absolute inset-1 rounded-md bg-gradient-to-br from-white/10 to-white/5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case "script": {
        const scriptLineCount = scriptDraft
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean).length;

        // 하위 단계별 제목과 설명
        const scriptSubSteps = [
          { title: "대본 입력", description: "입력 대본을 분석하고 원하는 길이에 맞춰 새 스크립트를 만들어 드립니다." },
          { title: "대본 분석", description: "입력하신 대본의 구조와 흐름을 AI가 분석합니다." },
          { title: "주제 선택", description: "AI가 추천하는 주제 중 하나를 선택하거나 직접 입력하세요." },
          { title: "대본 생성 결과", description: "선택한 주제로 생성된 완성 대본을 확인하세요." },
        ];

        const currentSubStep = scriptSubSteps[scriptSubStep];

        return (
          <div className="mt-0">
            <div className="rounded-[clamp(1rem,2vw,1.6rem)] border border-white/10 bg-black/40 p-[clamp(1.25rem,2vw,1.8rem)] shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-white">{currentSubStep.title}</h3>
                  <p className="mt-2 text-sm text-white/60 text-right">
                    {currentSubStep.description}
                  </p>
                </div>
                <a
                  href="/script?no_ads=true"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-red-500/30 px-4 py-1 text-sm font-semibold text-red-300 hover:border-red-400"
                >
                  대본 페이지 열기
                </a>
              </div>

              {/* 하위 단계 진행 표시 */}
              <div className="mt-4 flex items-center gap-2">
                {scriptSubSteps.map((step, index) => (
                  <React.Fragment key={index}>
                    <button
                      onClick={() => setScriptSubStep(index)}
                      className={`px-3 py-1 text-xs rounded-full transition-all ${scriptSubStep === index
                        ? 'bg-red-500/20 text-red-300 border border-red-400/50'
                        : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                        }`}
                    >
                      {index + 1}. {step.title}
                    </button>
                    {index < scriptSubSteps.length - 1 && (
                      <FiChevronRight className="text-white/30" size={14} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="mt-6 space-y-5">
                {/* Step 0: 대본 입력 */}
                {scriptSubStep === 0 && (
                  <>
                    {/* 유튜브 URL 입력 */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/80">
                        유튜브 URL 입력 (선택사항)
                      </label>
                      <input
                        type="text"
                        value={youtubeUrl}
                        onChange={(event) => setYoutubeUrl(event.target.value)}
                        className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                      {normalizedYoutubeUrl && (
                        <div className="rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3">
                          <p className="text-xs font-semibold text-red-300 mb-2">외부 링크</p>
                          <a
                            href={normalizedYoutubeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="group block rounded-lg border border-red-300/30 bg-slate-950/40 p-3 hover:border-red-300/50 hover:bg-slate-900/55 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-20 w-36 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/40">
                                {youtubeLinkPreviewLoading ? (
                                  <div className="h-full w-full animate-pulse bg-white/10" />
                                ) : youtubeLinkPreview?.thumbnailUrl ? (
                                  <img
                                    src={youtubeLinkPreview.thumbnailUrl}
                                    alt={youtubeLinkPreview.title || "유튜브 썸네일"}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-xs text-white/45">
                                    미리보기 없음
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-red-100 line-clamp-2">
                                  {youtubeLinkPreviewLoading
                                    ? "영상 정보를 불러오는 중..."
                                    : (youtubeLinkPreview?.title || "유튜브 영상 열기")}
                                </p>
                                <p className="mt-1 text-xs text-red-100/75 break-all line-clamp-2">
                                  {normalizedYoutubeUrl}
                                </p>
                                {youtubeLinkPreviewError && (
                                  <p className="mt-1 text-[11px] text-amber-200/90">{youtubeLinkPreviewError}</p>
                                )}
                              </div>

                              <FiExternalLink className="mt-0.5 shrink-0 text-red-100/80 group-hover:text-red-50" />
                            </div>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* 카테고리 선택 */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/80">
                        카테고리 선택
                      </label>
                      <DndContext
                        sensors={categorySensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleCategoryDragEnd}
                      >
                        <SortableContext items={categoryOrder} strategy={rectSortingStrategy}>
                          <div className="flex flex-wrap gap-2">
                            {categoryOrder.map((category) => (
                              <SortableCategoryChip
                                key={category}
                                category={category}
                                isSelected={selectedCategory === category}
                                onSelect={setSelectedCategory}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                      <p className="text-xs text-white/40">카테고리를 드래그해서 순서를 바꿀 수 있습니다.</p>
                    </div>

                    {/* 대본 내용 입력 */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/80">
                        대본 내용
                      </label>
                      <textarea
                        value={scriptDraft}
                        onChange={(event) => setScriptDraft(event.target.value)}
                        rows={7}
                        className="transcript-input w-full rounded-2xl border border-white/20 bg-black/30 px-4 py-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="분석할 대본 내용을 입력하세요.\n\n예:\n(온도) 그럼 여기서 말하는 건 뭐냐? 졸라 좋은 주식은 뭐냐?..."
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between text-sm text-white/50">
                      <span>
                        {scriptLineCount}줄 · {scriptDraft.length.toLocaleString()}자
                      </span>
                      <span>대본 구조 분석용 입력</span>
                    </div>

                    {scriptDraft.length > 20000 && (
                      <div className="rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        <div className="flex items-start gap-2">
                          <span className="text-lg">안내</span>
                          <div>
                            <p className="font-semibold">긴 대본 분석 안내</p>
                            <p className="text-xs mt-1 opacity-80">
                              현재: {scriptDraft.length.toLocaleString()}자
                            </p>
                            <p className="text-xs mt-1 opacity-80">
                              ? 긴 대본은 분석에 20-30초 정도 소요될 수 있습니다
                            </p>
                            <p className="text-xs opacity-80">
                              ? 타임아웃 발생 시 다시 시도하거나 대본을 나눠서 분석하세요
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  </>
                )}

                {/* Step 1: 대본 분석 */}
                {scriptSubStep === 1 && (
                  <>
                    <div className="space-y-3">
                      <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100/90">
                        이 단계는 자동으로 대본 구조를 분석합니다. 분석이 완료되면 다음 단계로 이동하세요.
                      </div>

                      {isAnalyzingScript && (
                        <ProgressTracker
                          currentStepIndex={analyzeProgress.currentStep}
                          stepLabels={analyzeProgress.steps}
                          stepDescriptions={[
                            "대본의 전체 구조와 흐름을 분석하고 있습니다",
                            "중요한 키워드와 주제를 추출하고 있습니다",
                            "분석 결과를 바탕으로 새로운 주제를 생성하고 있습니다"
                          ]}
                          estimatedTimeSeconds={20}
                        />
                      )}

                      {scriptAnalysis?.scriptStructure && (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-white/70">
                          <div className="mb-4 pb-3 border-b border-white/10">
                            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                              <span className="text-red-400">구조</span>
                              분석된 대본 구조
                            </h3>
                            <p className="text-xs text-white/50">
                              입력하신 대본의 흐름과 구조를 분석한 결과입니다
                            </p>
                          </div>
                          <div className="space-y-3">
                            {scriptAnalysis.scriptStructure.map((stage) => (
                              <div
                                key={stage.stage}
                                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                              >
                                <p className="font-semibold text-white">{stage.stage}</p>
                                <p className="text-sm text-white/50">{stage.purpose}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 border-t border-white/10 pt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={handleReanalyzeScript}
                              disabled={isAnalyzingScript || !scriptDraft.trim()}
                              className="rounded-full border border-red-300/60 bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              다시 분석
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  </>
                )}

                {/* Step 2: 주제 선택 */}
                {scriptSubStep === 2 && (
                  <>
                    <div className="space-y-4">
                      {/* 영상 길이 선택 */}
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                        <div className="mb-4 pb-3 border-b border-white/10">
                          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                            <span className="text-red-300">길이</span>
                            영상 길이 설정
                          </h3>
                          <p className="text-xs text-white/50">
                            생성할 대본의 길이를 선택하세요
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {scriptLengthOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleSelectScriptLength(option.value)}
                              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${scriptLengthMinutes === option.value
                                ? "border-red-400 bg-red-500/15 text-red-200"
                                : "border-white/15 bg-black/30 text-white/70 hover:border-white/30"
                                }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        {scriptLengthMinutes === "custom" && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={customScriptLength}
                              onChange={(event) => handleCustomScriptLengthChange(event.target.value)}
                              className="w-32 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-red-500"
                              placeholder="분"
                            />
                            <span className="text-sm text-white/60">분</span>
                          </div>
                        )}
                        <p className="text-sm text-white/50 mt-2">
                          선택한 길이: <span className="font-semibold text-red-300">{formatScriptLengthLabel()}</span>
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                        <div className="mb-4 pb-3 border-b border-white/10">
                          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                            <span className="text-red-300">스타일</span>
                            대본 스타일 선택
                          </h3>
                          <p className="text-xs text-white/50">
                            대본 생성 전에 스타일을 먼저 선택해 주세요.
                          </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setScriptStyle("narration")}
                            className={`rounded-xl border px-4 py-4 text-left transition ${scriptStyle === "narration"
                              ? "border-red-400 bg-red-500/15 text-white shadow-lg"
                              : "border-white/15 bg-black/30 text-white/70 hover:border-white/30"
                              }`}
                          >
                            <div className="text-sm font-semibold mb-1">나레이션 버전</div>
                            <div className="text-xs text-white/50">
                              해설 중심으로 흐름을 이어가는 내레이션 스타일
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setScriptStyle("dialogue")}
                            className={`rounded-xl border px-4 py-4 text-left transition ${scriptStyle === "dialogue"
                              ? "border-red-400 bg-red-500/15 text-white shadow-lg"
                              : "border-white/15 bg-black/30 text-white/70 hover:border-white/30"
                              }`}
                          >
                            <div className="text-sm font-semibold mb-1">대화 버전</div>
                            <div className="text-xs text-white/50">
                              여러 인물의 대화로 전개되는 스크립트 스타일
                            </div>
                          </button>
                        </div>
                      </div>

                      {scriptIdeas.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                          <div className="mb-3 pb-3 border-b border-white/10 flex items-center justify-between gap-3">
                            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                              <span className="text-red-300">추천</span>
                              AI 추천 주제
                            </h3>
                            <button
                              type="button"
                              onClick={handleRefreshIdeas}
                              disabled={isRefreshingIdeas || !scriptAnalysis}
                              className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isRefreshingIdeas ? "추천 갱신 중..." : "다시 추천"}
                            </button>
                          </div>
                          <p className="text-xs text-white/50">
                            분석 결과를 바탕으로 생성할 수 있는 소재 중심 주제들입니다
                          </p>
                          <p className="text-sm text-white/60 mb-4">
                            {isAnalyzingScript
                              ? "추천 주제를 생성 중입니다. 잠시만 기다려 주세요."
                              : "대본 분석이 끝나면 추천 주제가 자동으로 표시됩니다."}
                          </p>
                          {isAnalyzingScript && (
                            <ProgressTracker
                              currentStepIndex={analyzeProgress.currentStep}
                              stepLabels={analyzeProgress.steps}
                              stepDescriptions={[
                                "대본의 전체 구조와 흐름을 분석하고 있습니다",
                                "중요한 키워드와 주제를 추출하고 있습니다",
                                "분석 결과를 바탕으로 새로운 주제를 생성하고 있습니다"
                              ]}
                              estimatedTimeSeconds={20}
                            />
                          )}

                          {/* 직접 입력 칸 */}
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-white/80 flex items-center gap-2">
                              <span>입력</span>
                              또는 직접 주제 입력
                            </label>
                            <input
                              type="text"
                              value={selectedTopic}
                              onChange={(e) => setSelectedTopic(e.target.value)}
                              placeholder="원하는 주제를 직접 입력하세요 (예: 경제 위기 속에서 살아남는 방법)"
                              className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                          <div className="mb-4 pb-3 border-b border-white/10 flex items-center justify-between gap-3">
                            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                              <span className="text-red-300">추천</span>
                              AI 추천 주제
                            </h3>
                            <button
                              type="button"
                              onClick={handleRefreshIdeas}
                              disabled={isRefreshingIdeas || isAnalyzingScript || !scriptAnalysis}
                              className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isRefreshingIdeas ? "추천 갱신 중..." : "다시 추천"}
                            </button>
                          </div>
                          <p className="text-xs text-white/50 mb-4">
                            원하는 주제를 선택하면 해당 주제로 새로운 대본을 작성합니다 ({scriptIdeas.length}개)
                          </p>
                          <div className="grid gap-2 mb-4">
                            {scriptIdeas.map((idea, index) => (
                              <button
                                key={idea}
                                type="button"
                                onClick={() => setSelectedTopic(idea)}
                                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${selectedTopic === idea
                                  ? "border-red-400 bg-gradient-to-r from-red-600/25 to-red-500/20 text-white shadow-lg"
                                  : "border-white/15 bg-black/30 text-white/70 hover:border-red-400/50 hover:bg-red-500/10"
                                  }`}
                              >
                                <span className="font-semibold text-white/80 mr-2">주제 {index + 1}.</span>
                                {idea}
                                <p className="mt-1 text-xs text-white/55">
                                  추천 이유: {recommendationReasons[index] || "입력 대본 흐름에 맞는 소재 확장 추천입니다."}
                                </p>
                              </button>
                            ))}
                          </div>

                          {/* 직접 입력 칸 */}
                          <div className="space-y-2 pt-4 border-t border-white/10">
                            <label className="text-sm font-semibold text-white/80 flex items-center gap-2">
                              <span>입력</span>
                              또는 직접 주제 입력
                            </label>
                            <input
                              type="text"
                              value={selectedTopic && !scriptIdeas.includes(selectedTopic) ? selectedTopic : ''}
                              onChange={(e) => setSelectedTopic(e.target.value)}
                              placeholder="원하는 주제를 직접 입력하세요 (예: 경제 위기 속에서 살아남는 방법)"
                              className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            {selectedTopic && !scriptIdeas.includes(selectedTopic) && (
                              <p className="text-xs text-red-300 flex items-center gap-1">
                                <span>참고</span>
                                직접 입력한 주제로 대본을 작성합니다
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                  </>
                )}

                {/* Step 3: 대본 생성 결과 */}
                {scriptSubStep === 3 && (
                  <>
                    {isGeneratingScript && (
                      <ProgressTracker
                        currentStepIndex={generateProgress.currentStep}
                        stepLabels={generateProgress.steps}
                        stepDescriptions={[
                          "선택한 주제에 맞는 대본 구조를 설계하고 있습니다",
                          "각 챕터의 내용을 상세하게 작성하고 있습니다",
                          "생성된 대본의 품질을 확인하고 있습니다"
                        ]}
                        estimatedTimeSeconds={25}
                      />
                    )}

                    {!isGeneratingScript && !generatedPlan && (
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-center">
                        <p className="text-sm text-white/70 mb-4">
                          대본 생성 결과를 준비하지 못했습니다. 다시 생성해 주세요.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setScriptError("");
                            void handleGenerateScript();
                          }}
                          className="rounded-full bg-gradient-to-r from-red-600 to-red-500 px-5 py-2 text-sm font-semibold text-white hover:from-red-500 hover:to-red-400 transition-all"
                        >
                          다시 생성
                        </button>
                      </div>
                    )}

                    {generatedPlan && (
                      <div className="space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="mb-4 pb-3 border-b border-white/10 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                              <span className="text-green-400">완료</span>
                              생성된 대본
                            </h3>
                            <p className="text-xs text-white/50">
                              AI가 선택한 주제로 작성한 완성된 대본입니다 ({generatedPlan.chapters?.length || 0}개 챕터)
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {generatedPlan.chapters && generatedPlan.chapters.length > 0 && (
                              <button
                                onClick={() => {
                                  const text = formatAllChaptersToText(generatedPlan.chapters || []);
                                  if (!text || text.trim() === "") {
                                    alert("다운로드할 대본이 없습니다.");
                                    return;
                                  }
                                  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = "all-chapters-script.txt";
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white/80 transition-all flex items-center gap-1"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                전체 대본
                              </button>
                            )}
                          </div>
                        </div>
                        {generatedPlan.chapters && generatedPlan.chapters.length > 0 ? (
                          <>
                            <div className="space-y-4">
                              {generatedPlan.chapters.map((chapter, index) => (
                                <div
                                  key={chapter.id}
                                  className="rounded-xl border border-white/10 bg-black/30 p-4"
                                >
                                  <div className="flex items-center justify-between mb-3 gap-2">
                                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                                      <span className="text-red-400">챕터</span>
                                      챕터 {index + 1}. {sanitizeCorruptedText(chapter.title, `챕터 ${index + 1}`)}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => {
                                          const text = formatChapterScriptToText(chapter);
                                          if (!text || text.trim() === "") {
                                            alert("다운로드할 대본이 없습니다.");
                                            return;
                                          }
                                          const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement("a");
                                          a.href = url;
                                          a.download = `chapter-${index + 1}-script.txt`;
                                          a.click();
                                          URL.revokeObjectURL(url);
                                        }}
                                        className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white/80 transition-all flex items-center gap-1"
                                      >
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        다운로드
                                      </button>
                                      <button
                                        onClick={() => {
                                          setExpandedChapters(prev => ({
                                            ...prev,
                                            [index]: !prev[index]
                                          }));
                                        }}
                                        className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1"
                                      >
                                        {expandedChapters[index] ? (
                                          <>
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                            접기
                                          </>
                                        ) : (
                                          <>
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                            펼치기
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-sm text-white/60 mb-4 pb-3 border-b border-white/10">
                                    {chapter.purpose}
                                  </p>
                                  {expandedChapters[index] && chapter.script && chapter.script.length > 0 && (
                                    <>
                                      <div className="space-y-3 max-h-[400px] overflow-y-auto p-3 bg-black/40 rounded-lg">
                                        {chapter.script.map((line, lineIndex) => (
                                          <div key={`${chapter.id}-${lineIndex}`}>
                                            <div className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-black/30 p-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-0">
                                              <div className="rounded-md bg-white/5 px-3 py-2 sm:rounded-none sm:bg-transparent sm:px-2 sm:py-1">
                                                <span className={`font-bold text-sm ${characterColorMap.get(line.character) || "text-orange-400"}`}>
                                                  {line.character}
                                                </span>
                                                {line.timestamp && (
                                                  <div className="text-xs text-white/40 font-mono mt-0.5">
                                                    [{line.timestamp}]
                                                  </div>
                                                )}
                                              </div>
                                              <div className="border-t border-white/10 pt-2 text-sm text-white/90 leading-relaxed whitespace-pre-wrap sm:border-t-0 sm:border-l sm:border-white/10 sm:pl-4 sm:pt-0">
                                                {line.line}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      {/* 다운로드 버튼 이동됨 */}
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        ) : generatedPlan.scriptWithCharacters && generatedPlan.scriptWithCharacters.length > 0 ? (
                          <>
                            <div className="mb-3 flex items-center gap-2">
                              <button
                                onClick={() => {
                                  if (!generatedPlan.scriptWithCharacters || generatedPlan.scriptWithCharacters.length === 0) {
                                    alert("다운로드할 대본이 없습니다.");
                                    return;
                                  }

                                  const text = generatedPlan.scriptWithCharacters
                                    .map((line) => `${line.character}: ${line.line}`)
                                    .join("\n\n");

                                  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = "script.txt";
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white/80 transition-all flex items-center gap-1"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                다운로드
                              </button>
                              <button
                                onClick={() => {
                                  setExpandedChapters(prev => ({
                                    ...prev,
                                    [0]: !prev[0]
                                  }));
                                }}
                                className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1"
                              >
                                {expandedChapters[0] ? (
                                  <>
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                    접기
                                  </>
                                ) : (
                                  <>
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    펼치기
                                  </>
                                )}
                              </button>
                            </div>
                            {expandedChapters[0] && (
                              <div className="space-y-3 max-h-[500px] overflow-y-auto p-3 bg-black/40 rounded-lg">
                                {generatedPlan.scriptWithCharacters.map((line, lineIndex) => (
                                  <div key={`script-${lineIndex}`}>
                                    <div className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-black/30 p-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-0">
                                      <div className="rounded-md bg-white/5 px-3 py-2 sm:rounded-none sm:bg-transparent sm:px-2 sm:py-1">
                                        <span className={`font-bold text-sm ${characterColorMap.get(line.character) || "text-orange-400"}`}>
                                          {line.character}
                                        </span>
                                        {line.timestamp && (
                                          <div className="text-xs text-white/40 font-mono mt-0.5">
                                            [{line.timestamp}]
                                          </div>
                                        )}
                                      </div>
                                      <div className="border-t border-white/10 pt-2 text-sm text-white/90 leading-relaxed whitespace-pre-wrap sm:border-t-0 sm:border-l sm:border-white/10 sm:pl-4 sm:pt-0">
                                        {line.line}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 다운로드 버튼 이동됨 */}
                          </>
                        ) : generatedPlan.scriptOutline && generatedPlan.scriptOutline.length > 0 ? (
                          <div className="space-y-3">
                            {generatedPlan.scriptOutline.map((stage, index) => (
                              <div
                                key={`outline-${index}`}
                                className="rounded-xl border border-white/10 bg-black/30 p-4"
                              >
                                <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                                  <span className="text-red-400">단계</span>
                                  {stage.stage}
                                </h4>
                                <p className="text-sm text-white/60 mb-3 pb-3 border-b border-white/10">
                                  {stage.purpose}
                                </p>
                                <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                                  {stage.details}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-white/60 p-4 bg-black/30 rounded-lg text-center">
                            대본 내용이 없습니다.
                          </div>
                        )}
                      </div>
                    </div>
                    )}
                  </>
                )}

                <ErrorNotice error={scriptError} context="대본 생성" />
              </div>
            </div>
          </div>
        );
      }
      case "tts": {
        return (
          <div className="h-full">
            <div className="h-full rounded-[clamp(1rem,2vw,1.6rem)] border border-white/10 bg-black/40 p-[clamp(1.25rem,2vw,1.8rem)] shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mt-1">음성 생성</h3>
                  <p className="mt-2 text-sm text-white/60">
                    챕터별 또는 대사별로 목소리를 선택하고 편집할 수 있습니다.
                  </p>
                </div>
                <a
                  href="/tts?no_ads=true"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-red-500/30 px-4 py-1 text-sm font-semibold text-red-300 hover:border-red-400"
                >
                  TTS 페이지 열기
                </a>
              </div>

              {chapterScripts.length > 0 ? (
                <div className="space-y-4 overflow-visible">
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                    <span className="text-sm font-semibold text-white/70">음성 적용 방식</span>
                    <button
                      type="button"
                      onClick={() => setTtsVoiceApplyMode("chapter")}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${ttsVoiceApplyMode === "chapter"
                        ? "border-red-400 bg-red-500/20 text-red-100"
                        : "border-white/20 bg-white/5 text-white/70 hover:border-white/40"
                        }`}
                    >
                      챕터별 적용
                    </button>
                    <button
                      type="button"
                      onClick={() => setTtsVoiceApplyMode("line")}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${ttsVoiceApplyMode === "line"
                        ? "border-red-400 bg-red-500/20 text-red-100"
                        : "border-white/20 bg-white/5 text-white/70 hover:border-white/40"
                        }`}
                    >
                      대사별 적용
                    </button>
                    <span className="ml-auto text-xs text-white/50">
                      {isLoadingCloudVoices
                        ? "클라우드 음성 불러오는 중..."
                        : `사용 가능 음성 ${availableVoiceOptions.length}개`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                    <span className="text-sm font-semibold text-white/70">
                      {ttsVoiceApplyMode === "line" ? "전체 대사 목소리 적용" : "전체 챕터 목소리 적용"}
                    </span>
                    <div ref={bulkVoiceDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBulkVoiceDropdownOpen((prev) => !prev)}
                        className="inline-flex min-w-[230px] items-center justify-between gap-3 rounded-lg border border-red-400/70 bg-black px-3 py-2 text-sm font-semibold text-white transition hover:border-red-300"
                      >
                        <span>목소리 선택</span>
                        <span className={`text-xs text-red-200 transition-transform ${isBulkVoiceDropdownOpen ? "rotate-180" : ""}`}>▼</span>
                      </button>
                      {isBulkVoiceDropdownOpen && (
                        <div className="absolute left-0 top-full z-50 mt-2 w-[min(90vw,360px)] max-h-[380px] overflow-y-auto rounded-xl border border-red-400/50 bg-[#3c3c3c] p-2 shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
                          {(["남성", "여성", "중성"] as const).map((group) => {
                            const voices = availableVoiceOptions.filter((voice) => voice.category === group);
                            if (voices.length === 0) return null;
                            return (
                              <div key={`bulk-voice-group-${group}`} className="mb-2 last:mb-0">
                                <p className="px-2 py-1 text-xs font-bold text-white/90">{group}</p>
                                <div className="space-y-1">
                                  {voices.map((voice) => (
                                    <button
                                      key={`bulk-voice-option-${group}-${voice.name}`}
                                      type="button"
                                      onClick={() => {
                                        if (ttsVoiceApplyMode === "line") {
                                          applyVoiceToAllLines(voice.name);
                                        } else {
                                          applyVoiceToAllChapters(voice.name);
                                        }
                                        setIsBulkVoiceDropdownOpen(false);
                                      }}
                                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-white/90 transition hover:bg-red-500/20 hover:text-white"
                                    >
                                      <span>{voice.name}</span>
                                      <span className="ml-2 truncate text-xs text-white/70">{voice.tone}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  {chapterScripts.map((chapter, index) => (
                    <div key={index} className="relative rounded-2xl border border-white/10 bg-black/30 p-5 overflow-visible">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                          <span className="text-red-400">챕터</span>
                          {sanitizeCorruptedText(chapter.title, `챕터 ${index + 1}`)}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-orange-400 font-semibold mr-3">
                            {ttsVoiceApplyMode === "line"
                              ? "대사별"
                              : (chapterVoices[index] || favoriteVoiceOptions[0]?.name || "민준")}
                          </span>
                          <span className="text-xs text-white/50">{chapter.content.length}자</span>
                        </div>
                      </div>

                      <textarea
                        value={chapter.content}
                        onChange={(e) => {
                          const newChapters = [...chapterScripts];
                          newChapters[index].content = e.target.value;
                          setChapterScripts(newChapters);
                          // 전체 스크립트도 업데이트
                          setTtsScript(newChapters.map(ch => ch.content).join("\n\n"));
                        }}
                        rows={6}
                        className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-y"
                        placeholder="스크립트를 입력하세요..."
                      />

                      {ttsVoiceApplyMode === "chapter" ? (
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <div className="text-sm font-semibold text-white/60">TTS 즐겨찾기</div>
                          <div className="flex flex-wrap gap-2">
                            {favoriteVoiceOptions.map((voice) => (
                              <div key={voice.name} className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurrentChapterForVoice(index);
                                    setChapterVoices({ ...chapterVoices, [index]: voice.name });
                                  }}
                                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all inline-flex items-center gap-2 ${(chapterVoices[index] || favoriteVoiceOptions[0]?.name || "민준") === voice.name
                                    ? "border-red-400 bg-gradient-to-r from-red-600/30 to-red-500/25 text-red-200 shadow-lg"
                                    : "border-white/20 bg-black/40 text-white/70 hover:border-red-400/50 hover:bg-red-500/10"
                                    }`}
                                >
                                  <span>{voice.name}</span>
                                  <span className="text-xs opacity-70 max-w-[170px] truncate">{voice.tone}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">{resolveVoicePreset(voice)}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurrentChapterForVoice(index);
                                    const sampleText = availableVoiceOptions.find(v => v.name === voice.name)?.sampleText || "안녕하세요, 유튜브 채널 미리듣기 샘플입니다.";
                                    playPreviewAudio(index, voice.name, sampleText);
                                  }}
                                  className={`p-2 rounded-lg border transition-all ${playingChapter === index && playingVoice === voice.name
                                    ? 'border-red-400 bg-red-500 shadow-lg'
                                    : 'border-white/10 bg-black/40 hover:bg-red-500/20 hover:border-red-400/50'
                                    }`}
                                  title={playingChapter === index && playingVoice === voice.name ? '정지' : '미리듣기'}
                                >
                                  {playingChapter === index && playingVoice === voice.name ? (
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentChapterForVoice(index);
                                setVoiceGenderFilter("전체");
                                setVoiceTagFilter("전체");
                                setShowVoiceModal(true);
                              }}
                              className="px-4 py-2 rounded-lg border border-red-400/50 bg-red-500/10 text-red-300 text-sm font-medium hover:bg-red-500/20 transition-all"
                            >
                              더 많은 TTS
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3">
                          <p className="text-xs text-white/60 mb-2">대사별 목소리 선택</p>
                          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                            {getChapterDialogueLines(chapter.content).map((rawLine, lineIndex) => {
                              const parsed = parseDialogueLine(rawLine);
                              const fallbackVoice = chapterVoices[index] || favoriteVoiceOptions[0]?.name || "민준";
                              const selectedLineVoice = resolveLineVoice(index, lineIndex, fallbackVoice);
                              return (
                                <div key={`${index}-${lineIndex}`} className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-black/30 p-2 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-center">
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-orange-300 truncate">{parsed.speaker}</p>
                                    <p className="text-xs text-white/75 line-clamp-2">{parsed.body}</p>
                                  </div>
                                  <select
                                    value={selectedLineVoice}
                                    onChange={(e) => {
                                      const nextVoice = e.target.value;
                                      setLineVoices((prev) => ({
                                        ...prev,
                                        [getLineVoiceKey(index, lineIndex)]: nextVoice,
                                      }));
                                    }}
                                    className="rounded-lg border border-white/20 bg-black/60 px-2 py-1.5 text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-red-500"
                                  >
                                    {availableVoiceOptions.map((voice) => (
                                      <option key={voice.name} value={voice.name}>
                                        {voice.name} · {voice.tone}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCurrentChapterForVoice(index);
                                      playPreviewAudio(index, selectedLineVoice, parsed.body || rawLine);
                                    }}
                                    className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-red-400/50 hover:bg-red-500/10"
                                  >
                                    미리듣기
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <label className="text-xs text-white/50">속도</label>
                            <input
                              type="range"
                              min={0.7}
                              max={2.0}
                              step={0.1}
                              value={ttsSpeed}
                              onChange={(e) => setTtsSpeed(Number(e.target.value))}
                              className="w-32 ml-2"
                            />
                            <span className="text-xs text-white/70 ml-2">{ttsSpeed.toFixed(1)}x</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setCurrentChapterForVoice(index);
                              const lines = getChapterDialogueLines(chapter.content);
                              const fallbackVoice = chapterVoices[index] || favoriteVoiceOptions[0]?.name || "민준";
                              const voiceName = ttsVoiceApplyMode === "line"
                                ? resolveLineVoice(index, 0, fallbackVoice)
                                : fallbackVoice;
                              const text = ttsVoiceApplyMode === "line"
                                ? (lines[0] || chapter.content)
                                : chapter.content;
                              if (playingChapter === index) {
                                stopAudio();
                              } else {
                                playPreviewAudio(index, voiceName, text);
                              }
                            }}
                            className={`px-4 py-2 rounded-full text-white text-sm font-semibold shadow-lg transition-all flex items-center gap-2 ${playingChapter === index
                              ? 'bg-gradient-to-r from-red-700 to-red-500 hover:from-red-600 hover:to-red-500'
                              : 'bg-gradient-to-r from-red-700 to-red-500 hover:from-red-600 hover:to-red-500'
                              }`}
                          >
                            {playingChapter === index ? (
                              <>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                </svg>
                                정지
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                                읽어보기
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              handleGenerateTts();
                            }}
                            className="px-4 py-2 rounded-full bg-gradient-to-r from-red-600 to-red-500 text-white text-sm font-semibold shadow-lg hover:from-red-500 hover:to-red-400 transition-all"
                          >
                            음성 생성
                          </button>
                        </div>
                      </div>

                      {/* 더 많은 TTS 목소리 선택 플로팅 패널 */}
                      {showVoiceModal && currentChapterForVoice === index && typeof document !== "undefined" &&
                        createPortal(
                          <div className="fixed inset-0 z-[99999]">
                            <button
                              type="button"
                              aria-label="목소리 패널 닫기"
                              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
                              onClick={() => setShowVoiceModal(false)}
                            />
                            <div
                              className="fixed inset-x-3 top-3 bottom-3 sm:inset-y-4 sm:right-4 sm:left-auto sm:w-[460px] bg-gradient-to-br from-zinc-900 to-zinc-800 border border-white/20 sm:border-l shadow-2xl overflow-hidden animate-slide-in-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="sticky top-0 bg-gradient-to-br from-zinc-900 to-zinc-800 border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
                                <div>
                                  <h3 className="text-xl font-bold text-white">TTS 선택</h3>
                                  <p className="text-xs text-white/60 mt-1">{sanitizeCorruptedText(chapter.title, `챕터 ${index + 1}`)}</p>
                                </div>
                                <button
                                  onClick={() => setShowVoiceModal(false)}
                                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                                >
                                  <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>

                              <div className="h-[calc(100%-78px)] overflow-y-auto p-6 space-y-4">
                                <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-3">
                                  <div className="flex flex-wrap gap-2">
                                    {(["전체", "남성", "여성", "중성"] as const).map((gender) => (
                                      <button
                                        key={gender}
                                        type="button"
                                        onClick={() => setVoiceGenderFilter(gender)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${voiceGenderFilter === gender ? "border-red-300 bg-red-500/25 text-red-100" : "border-white/15 text-white/70 hover:border-red-300/40"}`}
                                      >
                                        {gender}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {voiceTagFilters.map((tag) => (
                                      <button
                                        key={tag}
                                        type="button"
                                        onClick={() => setVoiceTagFilter(tag)}
                                        className={`px-3 py-1.5 rounded-full text-xs border transition ${voiceTagFilter === tag ? "border-red-300 bg-red-500/20 text-red-100" : "border-white/15 text-white/70 hover:border-red-300/35"}`}
                                      >
                                        {tag}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {voiceModalSections.map((section) => (
                                    <div key={section.key} className="space-y-2">
                                      {voiceGenderFilter === "전체" && (
                                        <div className="px-1 pb-1 pt-2 text-xs font-semibold tracking-wide text-white/55">
                                          {section.title}
                                        </div>
                                      )}
                                      {section.voices.map((voice) => (
                                        <button
                                          key={voice.name}
                                          onClick={() => {
                                            if (currentChapterForVoice !== null) {
                                              setChapterVoices({ ...chapterVoices, [currentChapterForVoice]: voice.name });
                                              playPreviewAudio(currentChapterForVoice, voice.name, voice.sampleText);
                                            }
                                            setShowVoiceModal(false);
                                          }}
                                          className="w-full rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 hover:from-red-500/20 hover:to-red-500/10 hover:border-red-400/50 transition-all group p-3 flex items-center gap-3"
                                        >
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (currentChapterForVoice !== null) {
                                                playPreviewAudio(currentChapterForVoice, voice.name, voice.sampleText);
                                              }
                                            }}
                                            className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${playingChapter === currentChapterForVoice && playingVoice === voice.name
                                              ? "bg-red-500 shadow-lg"
                                              : "bg-white/10 hover:bg-red-500/50"
                                              }`}
                                            title={playingChapter === currentChapterForVoice && playingVoice === voice.name ? "정지" : "미리듣기"}
                                          >
                                            {playingChapter === currentChapterForVoice && playingVoice === voice.name ? (
                                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                              </svg>
                                            ) : (
                                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                              </svg>
                                            )}
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleFavoriteVoice(voice.name);
                                            }}
                                            className={`flex-shrink-0 w-8 h-8 rounded-full border transition ${isFavoriteVoice(voice.name)
                                                ? "border-amber-300 bg-amber-500/25 text-amber-200"
                                                : "border-white/20 bg-white/5 text-white/70 hover:border-amber-300/50"
                                              }`}
                                            title={isFavoriteVoice(voice.name) ? "즐겨찾기 해제" : "즐겨찾기 등록"}
                                          >
                                            {isFavoriteVoice(voice.name) ? "★" : "☆"}
                                          </button>
                                          <div className="flex-1 text-left min-w-0">
                                            <p className="text-base font-bold text-white group-hover:text-red-300 transition-colors">{voice.name}</p>
                                            <p className="text-xs text-white/60 mt-0.5 truncate">
                                              {stripGenderPrefix(voice.label) === voice.tone
                                                ? voice.tone
                                                : `${stripGenderPrefix(voice.label)} · ${voice.tone}`}
                                            </p>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">{voice.category}</span>
                                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">{voice.model}</span>
                                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">{resolveVoicePreset(voice)}</span>
                                            </div>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  ))}
                                  {filteredVoiceModalOptions.length === 0 && (
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                                      선택한 필터에 해당하는 목소리가 없습니다.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>,
                          document.body
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-8 text-center">
                  <p className="text-white/60 mb-4">챕터별 대본이 없습니다.</p>
                  <p className="text-sm text-white/40">Step 2에서 대본을 생성하고 다음 단계로 이동하세요.</p>
                </div>
              )}

              {/* 최근 생성 샘플 */}
              {ttsSamples.length > 0 && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm font-semibold text-white/60 mb-3">최근 생성</p>
                  <div className="space-y-2">
                    {ttsSamples.map((sample) => (
                      <div key={sample.id} className="rounded-xl bg-black/30 px-3 py-2">
                        <p className="text-sm text-white/40">{sample.voice}</p>
                        <p className="text-sm text-white">{sample.text}</p>
                        <p className="text-sm text-white/40">{sample.status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }
      case "image": {
        const characterStylesOptions = [
          "실사 극대화",
          "애니메이션",
          "동물",
          "웹툰",
          "졸라맨",
        ] as CharacterStyle[];
        const getCharacterStyleImage = (style: CharacterStyle) =>
          style === "졸라맨"
            ? "/stickman.png"
            : `/${encodeURIComponent(style)}.png`;

        const backgroundStylesOptions = [
          "감성 멜로",
          "서부극",
          "공포 스릴러",
          "사이버펑크",
          "판타지",
          "미니멀",
          "빈티지",
          "모던",
          "1980년대",
          "2000년대",
          "먹방",
          "귀여움",
          "AI",
          "괴이함",
          "창의적인",
          "조선시대",
        ] as BackgroundStyle[];
        const getBackgroundStyleImage = (style: BackgroundStyle) =>
          `/${encodeURIComponent(style === "AI" ? "ai" : style)}.png`;
        const imageSubSteps = [
          { title: "페르소나/스타일", description: "인물·배경 스타일을 고르고 이미지 생성 기준을 설정합니다." },
          { title: "컷 이미지 생성", description: "챕터별 컷 이미지를 생성하고 필요 시 개별 재생성합니다." },
          { title: "결과 확인", description: "생성된 컷 이미지를 확인하고 전체 저장을 진행하세요." },
        ];
        const currentImageSubStep = imageSubSteps[imageSubStep];
        const renderImageSubStepHeader = () => (
          <div className="mt-4 flex items-center gap-2">
              {imageSubSteps.map((step, index) => (
                <React.Fragment key={index}>
                  <button
                    type="button"
                    onClick={() => setImageSubStep(index)}
                    className={`px-3 py-1 text-xs rounded-full transition-all ${imageSubStep === index
                      ? "bg-red-500/20 text-red-300 border border-red-400/50"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                      }`}
                  >
                    {index + 1}. {step.title}
                  </button>
                  {index < imageSubSteps.length - 1 && (
                    <FiChevronRight className="text-white/30" size={14} />
                  )}
                </React.Fragment>
              ))}
          </div>
        );
        const renderImageSubStepShell = (content: React.ReactNode) => (
          <div className="mt-0">
            <div className="rounded-[clamp(1rem,2vw,1.6rem)] border border-white/10 bg-black/40 p-[clamp(1.25rem,2vw,1.8rem)] shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-white">{currentImageSubStep.title}</h3>
                  <p className="mt-2 text-sm text-white/60 text-right">
                    {currentImageSubStep.description}
                  </p>
                </div>
                <a
                  href="/image?no_ads=true"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-red-500/30 px-4 py-1 text-sm font-semibold text-red-300 hover:border-red-400"
                >
                  이미지 페이지 열기
                </a>
              </div>
              {renderImageSubStepHeader()}
              <div className="mt-6">{content}</div>
            </div>
          </div>
        );
        if (!chapterScripts || chapterScripts.length === 0) {
          return (
            <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-8 text-center">
                <div className="text-4xl mb-4">안내</div>
                <h3 className="text-xl font-bold text-white mb-2">대본이 없습니다</h3>
                <p className="text-white/60">먼저 대본 생성 단계에서 대본을 작성해주세요.</p>
                <button
                  onClick={() => goToStep(1)}
                  className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-500 text-white font-semibold hover:shadow-lg transition"
                >
                  대본 생성하러 가기
                </button>
              </div>
            </div>
          );
        }

        if (imageSubStep === 0) {
          return renderImageSubStepShell(
              <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
                <div className="mt-8 bg-black/30 border border-white/10 rounded-xl p-[clamp(1rem,2vw,1.4rem)]">
                  {styleReferenceImage && (
                    <p className="mb-4 rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                      참조 이미지 사용 중: 인물/배경 스타일 선택은 비활성화됩니다.
                    </p>
                  )}

                  <div className="mb-6">
                    <div className="mb-3">
                      <h4 className="text-red-200 font-medium text-base">인물</h4>
                    </div>
                    <div className={`grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 ${styleReferenceImage ? "opacity-50" : ""}`}>
                      {characterStylesOptions.map((style) => (
                        <button
                          key={style}
                          onClick={() => setCharacterStyle(style)}
                          disabled={Boolean(styleReferenceImage)}
                          className={`relative w-full aspect-square rounded-lg font-medium text-xs transition-all duration-200 overflow-hidden ${characterStyle === style
                            ? "ring-2 ring-red-500 shadow-lg scale-[1.02]"
                            : "hover:ring-1 hover:ring-red-400"
                            } disabled:cursor-not-allowed disabled:hover:ring-0`}
                          style={{
                            backgroundImage: `url('${getCharacterStyleImage(style)}')`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                          <div className="relative h-full flex items-end p-2 text-left">
                            <div className="text-white font-semibold text-xs">{style}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="mb-3">
                      <h4 className="text-red-200 font-medium text-base">배경 스타일</h4>
                    </div>
                    <div className={`grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 ${styleReferenceImage ? "opacity-50" : ""}`}>
                      {backgroundStylesOptions.map((style) => (
                        <button
                          key={style}
                          onClick={() => setBackgroundStyle(style)}
                          disabled={Boolean(styleReferenceImage)}
                          className={`w-full aspect-square rounded-lg text-xs font-semibold transition-all border ${backgroundStyle === style
                            ? "border-red-400 ring-2 ring-red-400/70 text-white shadow-lg"
                            : "border-white/10 text-white/80 hover:border-red-300/60"
                            } relative overflow-hidden p-0 disabled:cursor-not-allowed disabled:hover:border-white/10`}
                          style={{
                            backgroundImage: `url('${getBackgroundStyleImage(style)}')`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        >
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                          <div className="relative h-full flex items-end p-2 text-left">
                            <div className="text-white font-semibold text-xs">{style}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <h4 className="text-sm font-semibold text-white/80">스타일 참조 이미지 (선택)</h4>
                    <p className="text-xs text-white/50">
                      참조 이미지를 업로드하면 해당 이미지의 스타일과 톤을 유지하고 컷을 생성합니다.
                    </p>

                    {!styleReferenceImage ? (
                      <div
                        className={`rounded-lg border-2 border-dashed p-4 text-center outline-none transition-colors ${isReferenceDropActive
                          ? "border-red-300 bg-red-500/15"
                          : "border-red-400/50 bg-red-900/10"
                          }`}
                        tabIndex={0}
                        onPaste={handleStyleReferencePaste}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsReferenceDropActive(true);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsReferenceDropActive(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsReferenceDropActive(false);
                        }}
                        onDrop={handleStyleReferenceDrop}
                      >
                        <label className="flex w-full cursor-pointer flex-col items-center gap-1 py-4 text-red-200 hover:text-red-100">
                          <span className="text-xs font-semibold">참조 이미지 업로드</span>
                          <span className="text-[11px] text-red-200/70">클릭, 드래그 앤 드롭, 또는 붙여넣기(Ctrl+V)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleStyleReferenceImageChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={styleReferenceImage}
                            alt="참조 이미지"
                            className="h-16 w-16 rounded-lg border border-white/20 object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-white/80">
                              {styleReferenceImageName || "업로드된 참조 이미지"}
                            </p>
                            <p className="mt-1 text-[11px] text-green-300">스타일 참조 적용 중</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setStyleReferenceImage(null);
                              setStyleReferenceImageName("");
                            }}
                            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10"
                          >
                            제거
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
          );
        }

        if (imageSubStep === 2) {
          const generatedCount = Object.keys(chapterImages).length;
          const missingCount = Math.max(requiredImageCount - generatedCount, 0);
          return renderImageSubStepShell(
              <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">생성 결과</h3>
                    <p className="mt-1 text-xs text-white/60">생성된 컷 이미지를 점검하고 저장하세요.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveAllCutImages}
                    disabled={generatedCount === 0}
                    className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    전체 이미지 저장
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-sm">
                    <p className="text-white/60">생성 완료</p>
                    <p className="mt-1 text-xl font-bold text-green-300">{generatedCount}컷</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-sm">
                    <p className="text-white/60">미생성</p>
                    <p className="mt-1 text-xl font-bold text-amber-300">{missingCount}컷</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-sm">
                    <p className="text-white/60">목표</p>
                    <p className="mt-1 text-xl font-bold text-white">{requiredImageCount}컷</p>
                  </div>
                </div>

                {chapterCutPlans.length > 0 && (
                  <div className="mt-5 space-y-4">
                    {chapterCutPlans.map((chapter) => (
                      <div key={chapter.chapterIndex} className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-white">
                            챕터 {chapter.chapterIndex + 1}: {chapter.title}
                          </h4>
                          <span className="text-xs text-white/60">{chapter.cuts.length}컷</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                          {chapter.cuts.map((cut) => {
                            const src = chapterImages[cut.imageKey] ? normalizeGeneratedImageSrc(chapterImages[cut.imageKey]) : "";
                            return (
                              <div key={cut.imageKey} className="aspect-square overflow-hidden rounded-md border border-white/10 bg-black/30">
                                {src ? (
                                  <img src={src} alt={`챕터 ${chapter.chapterIndex + 1} 컷 ${cut.localCutIndex + 1}`} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[10px] text-white/40">
                                    컷 {cut.localCutIndex + 1}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
          );
        }

        return renderImageSubStepShell(
            <>
            {personas.length === 0 && (
              <div className="mb-6 rounded-2xl border border-amber-300/30 bg-amber-900/10 p-5">
                <p className="text-sm text-amber-100">
                  이미지 생성 전에 페르소나를 먼저 만들어주세요.
                </p>
                <button
                  type="button"
                  onClick={() => setImageSubStep(0)}
                  className="mt-3 rounded-full border border-amber-300/60 bg-amber-500/20 px-4 py-1.5 text-xs font-bold text-amber-100 hover:bg-amber-500/30"
                >
                  1단계(페르소나/스타일)로 이동
                </button>
              </div>
            )}
            <div className="mb-6 rounded-2xl border border-white/10 bg-black/30 p-6">
              <h3 className="text-lg font-bold text-white mb-4">이미지 생성 설정</h3>
              <p className="mb-4 text-xs text-white/60">
                영상 소스 생성은 페르소나 생성 이미지를 바탕으로, 앞서 만든 대본에 어울리는 움직임과 배경을 만드는 단계입니다.
              </p>

              <div className="mt-6">
                <label className="block text-xl font-bold text-white mb-3">
                  프롬프트 (선택사항)
                </label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  onFocus={() => {
                    setIsImagePromptFocused(true);
                    if (clearImagePromptOnFirstFocus) {
                      setImagePrompt("");
                      setClearImagePromptOnFirstFocus(false);
                    }
                  }}
                  onBlur={() => setIsImagePromptFocused(false)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onCopy={(e) => e.stopPropagation()}
                  onCut={(e) => e.stopPropagation()}
                  onPaste={(e) => e.stopPropagation()}
                  rows={4}
                  className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder={isImagePromptFocused ? "" : recommendedImagePrompt}
                  spellCheck={false}
                  autoComplete="off"
                  style={
                    {
                      userSelect: "text",
                      WebkitUserSelect: "text",
                      MozUserSelect: "text",
                      msUserSelect: "text",
                    } as React.CSSProperties
                  }
                />
                <p className="text-xs text-white/50 mt-2">
                  비워두면 대본을 분석해 자동 추천 분위기 프롬프트를 적용합니다.
                </p>
              </div>

              {/* 이미지 스타일 선택 */}
              <div className="mt-8">
                <p className="text-sm text-white/60 mb-4">
                  영상 길이 {resolveRenderDurationSeconds()}초 기준으로 1분당 4컷, 총 {requiredImageCount}장을 생성합니다.
                </p>
                <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleGenerateAllCutImages}
                    disabled={personas.length === 0 || isGeneratingAllCuts || Boolean(generatingImageChapter)}
                    className="w-full rounded-full border border-red-300 bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(239,68,68,0.35)] transition hover:bg-red-500 hover:shadow-[0_12px_34px_rgba(239,68,68,0.45)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-red-600"
                  >
                    {isGeneratingAllCuts && batchGenerateProgress ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                        <span>
                          전체 생성 중 {batchGenerateProgress.done}/{batchGenerateProgress.total}
                        </span>
                        <span className="text-white/80">
                          ({Math.round((batchGenerateProgress.done / Math.max(1, batchGenerateProgress.total)) * 100)}%)
                        </span>
                      </span>
                    ) : isBatchPaused ? (
                      withOptionalCreditLabel("이어서 전체 컷 이미지 생성", CREDIT_COSTS.GENERATE_IMAGE)
                    ) : (
                      withOptionalCreditLabel("전체 컷 이미지 생성", CREDIT_COSTS.GENERATE_IMAGE)
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAllCutImages}
                    disabled={Object.keys(chapterImages).length === 0}
                    className="w-full rounded-full border border-white/30 bg-white/10 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    전체 이미지 저장
                  </button>
                </div>
                {personas.length === 0 && (
                  <p className="mb-4 text-xs text-amber-200">컷 이미지를 생성하려면 먼저 위에서 페르소나를 생성해주세요.</p>
                )}
                {(isGeneratingAllCuts || isBatchPaused) && (
                  <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handlePauseAllCutGeneration}
                      disabled={!isGeneratingAllCuts}
                      className="w-full rounded-full border border-amber-300/60 bg-amber-500/20 px-6 py-2 text-sm font-bold text-amber-100 transition hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      생성 멈추기
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateAllCutImages}
                      disabled={isGeneratingAllCuts || !isBatchPaused}
                      className="w-full rounded-full border border-emerald-300/60 bg-emerald-500/20 px-6 py-2 text-sm font-bold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      이어서 생성
                    </button>
                  </div>
                )}
                {chapterCutPlans.length > 0 ? (
                  chapterCutPlans.map((chapter) => (
                    <div key={chapter.chapterIndex} className="mt-6">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xl font-bold text-white">
                          챕터 {chapter.chapterIndex + 1}: {chapter.title}
                        </h4>
                        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                          총 {chapter.cuts.length}컷
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {chapter.cuts.length === 0 ? (
                          <div className="col-span-full rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-white/50">
                            이 챕터는 현재 영상 길이 배분에서 컷이 없습니다.
                          </div>
                        ) : (
                          chapter.cuts.map((cut) => {
                            const cutImageSrc = chapterImages[cut.imageKey]
                              ? normalizeGeneratedImageSrc(chapterImages[cut.imageKey])
                              : "";
                            const isGeneratingThisCut = generatingImageChapter === cut.imageKey;
                            return (
                              <div key={cut.imageKey} className="rounded-lg border border-white/10 bg-black/30 p-2">
                                <div className="group/cut relative aspect-square overflow-hidden rounded-md border border-white/10 bg-black/40">
                                  {cutImageSrc ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewImageModal({
                                            src: cutImageSrc,
                                            title: `챕터 ${chapter.chapterIndex + 1} · 컷 ${cut.localCutIndex + 1}`,
                                          })
                                        }
                                        className="h-full w-full"
                                      >
                                        <img
                                          src={cutImageSrc}
                                          alt={`챕터 ${chapter.chapterIndex + 1} 컷 ${cut.localCutIndex + 1} 이미지`}
                                          className="h-full w-full object-cover"
                                        />
                                      </button>
                                      <div className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 -translate-x-1/2 opacity-0 scale-95 transition-all duration-200 group-hover/cut:opacity-100 group-hover/cut:scale-100">
                                        <div className="w-[280px] aspect-square overflow-hidden rounded-xl border border-white/20 bg-black/90 shadow-2xl shadow-black/70">
                                          <img src={cutImageSrc} alt="컷 미리보기" className="h-full w-full object-cover" />
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex h-full flex-col p-3">
                                      <p className="text-xs font-semibold text-white">컷 {cut.localCutIndex + 1}</p>
                                      <p className="mt-1 text-[11px] text-white/60">{cut.secondsFrom}초 ~ {cut.secondsTo}초</p>
                                      <p className="mt-2 line-clamp-5 text-xs text-white/70">
                                        {cut.content.slice(0, 120) || "장면 설명이 없습니다."}
                                      </p>
                                    </div>
                                  )}
                                  {isGeneratingThisCut && (
                                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-[1px]">
                                      <span className="h-3 w-3 rounded-full bg-red-300 animate-pulse" />
                                      <p className="text-xs font-semibold text-red-100">이미지 생성 중...</p>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateImage(cut)}
                                    disabled={personas.length === 0 || Boolean(generatingImageChapter)}
                                    className="w-full rounded-md border border-red-400/50 bg-red-500/15 px-2 py-1.5 text-[11px] font-semibold text-red-100 hover:bg-red-500/25 disabled:opacity-50"
                                  >
                                    {isGeneratingThisCut ? "생성 중..." : "이미지 생성"}
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))
                ) : null}
              </div>
            </div>
            </>
        );
      }
      case "generate": {
        return (
          <div className="mt-[clamp(1rem,2vw,2rem)] grid gap-[clamp(1.2rem,2vw,2rem)] lg:grid-cols-[minmax(0,1fr)_clamp(260px,28vw,340px)]">
            <div className="rounded-[clamp(1rem,2vw,1.4rem)] border border-white/20 bg-black/40 p-[clamp(1rem,2vw,1.4rem)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/60">영상 생성</p>
                  <h3 className="text-2xl font-bold text-white">씬을 구성해 볼까요</h3>
                </div>
                <span className="text-sm font-semibold text-red-300">{Object.keys(chapterImages).length}/{requiredImageCount}컷 생성</span>
              </div>
              <div className="mt-4 space-y-3">
                {timelineScenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">{scene.label}</p>
                      <p className="text-sm text-white/50 break-words line-clamp-2">{scene.desc}</p>
                    </div>
                    <span className="shrink-0 text-sm text-white/50">{scene.duration}</span>
                  </div>
                ))}
              </div>
              <div className="mb-8 border-b border-white/10 pb-8">
                <h3 className="text-[clamp(1rem,1.6vw,1.2rem)] font-semibold text-white">
                  AI 영상 생성 (Seedance)
                </h3>
                <p className="mt-2 text-[clamp(0.8rem,1.4vw,0.95rem)] text-white/60">
                  프롬프트나 이미지를 입력하여 Seedance AI로 영상을 생성하세요.
                </p>
                <div className="mt-4 space-y-3">
                  <textarea
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder="영상에 대한 설명을 입력하세요 (예: 춤추는 고양이)"
                    className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                  />
                  <button
                    onClick={handleGenerateVideo}
                    disabled={isGeneratingVideo}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    {isGeneratingVideo ? "생성 중..." : "영상 생성하기"}
                  </button>
                </div>
                {generatedVideoUrl && (
                  <div className="mt-4">
                    <video src={generatedVideoUrl} controls className="w-full rounded-lg" />
                    <a href={generatedVideoUrl} download className="mt-2 inline-block text-sm text-red-400 hover:text-red-300">다운로드</a>
                  </div>
                )}
              </div>

              <h3 className="text-[clamp(1rem,1.6vw,1.2rem)] font-semibold text-white">
                영상 패키지 재료 업로드
              </h3>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-white/40 px-4 py-3 text-sm text-white/60">
                <FiUpload />
                파일 선택
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*"
                  onChange={handleFilesAdded}
                  className="hidden"
                />
              </label>
              <div className="mt-3 space-y-2">
                {assetFiles.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
                    업로드한 자산이 없으면 프롬프트 기반으로 생성합니다.
                  </p>
                ) : (
                  assetFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70"
                    >
                      <div>
                        <p className="font-semibold text-white truncate">{file.name}</p>
                        <p className="text-sm text-white/50">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="text-white/50 underline-offset-2 hover:text-red-300"
                      >
                        제거
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={handlePackageDownload}
                disabled={!assetFiles.length || isPackaging}
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(220,38,38,0.4)] disabled:opacity-60"
              >
                <FiDownload /> {isPackaging ? "패키지를 준비 중입니다" : "출력 패키지 다운로드"}
              </button>
            </div>
            <div className="rounded-[clamp(1rem,2vw,1.4rem)] border border-white/20 bg-black/40 p-4">
              <p className="text-sm font-semibold text-white/60">영상 스타일</p>
              <div className="mt-4 space-y-2 text-sm text-white/70">
                <p>전체 시간: {renderDuration}초</p>
                <p>화면 비율: {renderRatio}</p>
                <p>FPS: {renderFps}</p>
                <p>이미지 컷: {Object.keys(chapterImages).length || requiredImageCount}개</p>
              </div>
              <p className="mt-4 text-sm text-white/40">
                템포나 분위기를 바꾸고 싶다면 상단 스텝으로 돌아가 수정하면 됩니다.
              </p>
              <button
                onClick={handleVideoGenerate}
                disabled={videoGenerating}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-4 py-2 text-sm font-bold text-white shadow-[0_8px_20px_rgba(220,38,38,0.4)] disabled:opacity-60"
              >
                {videoGenerating ? "영상 생성 요청 중..." : "영상 생성 요청하기"}
              </button>
              <ErrorNotice error={videoError} context="영상 생성" />
              {videoUrl && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  <video src={videoUrl} controls className="w-full" />
                </div>
              )}
            </div>
          </div>
        );
      }
      case "render": {
        const timelineCuts: EditorCut[] =
          editorCuts.length > 0
            ? editorCuts
            : allCuts.map((cut) => ({
              id: `plan-cut-${cut.globalCutIndex + 1}`,
              startSec: cut.secondsFrom,
              endSec: cut.secondsTo,
              imageUrl: normalizeGeneratedImageSrc(chapterImages[cut.imageKey]) || "",
              caption: cut.content || `컷 ${cut.globalCutIndex + 1}`,
            }));
        const totalEditorDuration = totalEditorDurationSec;
        const selectedCut =
          timelineCuts.find((cut) => cut.id === selectedCutId) ||
          timelineCuts[0] ||
          null;
        const activeCutByPlayhead =
          timelineCuts.find(
            (cut) => timelineCurrentSec >= cut.startSec && timelineCurrentSec < cut.endSec
          ) || null;
        const previewCut = activeCutByPlayhead || selectedCut;
        const timelineWidthPx = Math.max(980, Math.ceil(totalEditorDuration * 56));
        const majorTickSec = totalEditorDuration <= 90 ? 5 : 10;
        const tickCount = Math.floor(totalEditorDuration / majorTickSec) + 1;
        const playheadPercent = Math.max(
          0,
          Math.min(100, (timelineCurrentSec / Math.max(totalEditorDuration, 0.001)) * 100)
        );
        const previewAspectRatio =
          renderRatio === "9:16"
            ? "9 / 16"
            : renderRatio === "1:1"
              ? "1 / 1"
              : "16 / 9";
        const formatTimelineClock = (seconds: number) => {
          const safe = Math.max(0, Math.floor(seconds));
          const minutes = Math.floor(safe / 60);
          const remain = safe % 60;
          return `${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
        };
        const handleTimelineSeek = (event: React.MouseEvent<HTMLDivElement>) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
          seekTimeline(ratio * totalEditorDuration);
        };
        const ensureEditableCuts = () => {
          if (editorCuts.length > 0) return editorCuts;
          if (timelineCuts.length === 0) return [] as EditorCut[];
          setEditorCuts(timelineCuts);
          setSelectedCutId((prev) => prev || timelineCuts[0]?.id || null);
          return timelineCuts;
        };
        const applyToolbarAction = (action: "split" | "trim" | "speed" | "volume" | "color" | "logo") => {
          const editable = ensureEditableCuts();
          const target = editable.find((cut) => cut.id === (selectedCutId || editable[0]?.id));
          if (action === "split") {
            if (target) splitEditorCut(target.id);
            return;
          }
          if (action === "trim") {
            if (!target) return;
            const nextEnd = Math.max(target.startSec + 0.2, Math.min(timelineCurrentSec, totalEditorDuration));
            updateEditorCutTime(target.id, "endSec", nextEnd);
            return;
          }
          if (action === "speed") {
            const speedSteps = [0.75, 1.0, 1.25, 1.5, 2.0];
            const idx = speedSteps.findIndex((v) => Math.abs(v - timelinePlaybackRate) < 0.001);
            const next = speedSteps[(idx + 1) % speedSteps.length];
            setTimelinePlaybackRate(next);
            return;
          }
          if (action === "volume") {
            const volumeSteps = [1, 0.7, 0.4, 0];
            const current = isTimelineMuted ? 0 : timelineVolume;
            const idx = volumeSteps.findIndex((v) => Math.abs(v - current) < 0.001);
            const next = volumeSteps[(idx + 1) % volumeSteps.length];
            setTimelineVolume(next);
            setIsTimelineMuted(next === 0);
            return;
          }
          if (action === "color") {
            const cycle: Array<"base" | "warm" | "cold" | "mono"> = ["base", "warm", "cold", "mono"];
            const idx = cycle.findIndex((v) => v === previewColorPreset);
            setPreviewColorPreset(cycle[(idx + 1) % cycle.length]);
            return;
          }
          setLogoRemovalMode((prev) => !prev);
        };
        const previewFilterStyle =
          previewColorPreset === "warm"
            ? { filter: "saturate(1.1) contrast(1.04) sepia(0.08)" }
            : previewColorPreset === "cold"
              ? { filter: "saturate(0.92) contrast(1.02) hue-rotate(8deg)" }
              : previewColorPreset === "mono"
                ? { filter: "grayscale(1) contrast(1.05)" }
                : undefined;

        return (
          <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
            <div className="overflow-hidden rounded-[clamp(1rem,2vw,1.6rem)] border border-red-900/40 bg-[#1a0b0c] shadow-[0_20px_40px_rgba(2,6,23,0.55)]">
              <div className="grid min-h-[760px] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="border-b border-red-900/40 bg-[#16090a] p-4 lg:border-b-0 lg:border-r">
                  <h3 className="text-lg font-bold text-white">동영상</h3>
                  <div className="mt-3 rounded-xl border border-red-900/40 bg-[#221112] px-3 py-2 text-center text-xs font-semibold tracking-[0.12em] text-red-200">
                    VIDEO TIMELINE
                  </div>
                  <div className="mt-3 rounded-xl border border-red-900/40 bg-[#2a1416] p-2">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-100/65">비율</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["16:9", "9:16", "1:1"] as const).map((ratio) => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setRenderRatio(ratio)}
                          className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${renderRatio === ratio
                            ? "border-red-400 bg-red-500/20 text-red-100"
                            : "border-red-900/40 bg-[#1a0d0f] text-red-100/85 hover:border-red-400/70"
                            }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-5 gap-2">
                    <button
                      type="button"
                      onClick={() => seekTimeline(0)}
                      className="flex h-11 w-full items-center justify-center rounded-lg border border-red-900/40 bg-[#221112] text-red-100 hover:border-red-400"
                      title="처음으로"
                    >
                      <FiMonitor className="h-4 w-4 text-red-100" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyToolbarAction("split")}
                      className="flex h-11 w-full items-center justify-center rounded-lg border border-red-900/40 bg-[#221112] text-red-100 hover:border-red-400"
                      title="클립 분할"
                    >
                      <FiFilm className="h-4 w-4 text-red-100" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleApplyGeneratedAssetsToEditor();
                      }}
                      className="flex h-11 w-full items-center justify-center rounded-lg border border-red-900/40 bg-[#221112] text-red-100 hover:border-red-400"
                      title="생성 결과 자동 적용"
                    >
                      <FiUpload className="h-4 w-4 text-red-100" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyToolbarAction("volume")}
                      className="flex h-11 w-full items-center justify-center rounded-lg border border-red-900/40 bg-[#221112] text-red-100 hover:border-red-400"
                      title="볼륨 순환"
                    >
                      <FiVolume2 className="h-4 w-4 text-red-100" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        pauseTimeline();
                        seekTimeline(0);
                        rebuildEditorCuts(editorImageUrls, editorSubtitleCues, editorAudioDurationSec);
                      }}
                      className="flex h-11 w-full items-center justify-center rounded-lg border border-red-900/40 bg-[#221112] text-red-100 hover:border-red-400"
                      title="타임라인 재정렬"
                    >
                      <FiSettings className="h-4 w-4 text-red-100" />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      { icon: FiScissors, key: "split" as const, label: "자르기" },
                      { icon: FiFilm, key: "trim" as const, label: "트림" },
                      { icon: FiClock, key: "speed" as const, label: `${timelinePlaybackRate.toFixed(2)}x` },
                      { icon: FiVolume2, key: "volume" as const, label: isTimelineMuted ? "음소거" : `${Math.round(timelineVolume * 100)}%` },
                      { icon: FiImage, key: "color" as const, label: previewColorPreset.toUpperCase() },
                      { icon: FiTrash2, key: "logo" as const, label: logoRemovalMode ? "ON" : "OFF" },
                    ].map((tool) => (
                      <button
                        key={tool.key}
                        type="button"
                        onClick={() => applyToolbarAction(tool.key)}
                        className="rounded-xl border border-red-900/40 bg-[#221112] px-2 py-2 text-red-100 hover:border-red-400"
                        title={tool.label}
                      >
                        <tool.icon className="mx-auto h-4 w-4 text-red-100" />
                        <p className="mt-1 text-[10px] font-semibold text-red-100/85">{tool.label}</p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-red-900/40 bg-[#2a1416] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-red-100/70">Export</p>
                    <p className="mt-2 text-sm text-red-100">MP4 / {renderRatio} / {renderFps}fps</p>
                    <p className="mt-1 text-xs text-red-100/65">컷 {Object.keys(chapterImages).length || requiredImageCount}개</p>
                  </div>

                  <div className="mt-4 rounded-xl border border-red-900/40 bg-[#2a1416] p-3 space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-red-100/70">소스 업로드</p>
                    <label className="block cursor-pointer rounded-lg border border-red-900/40 bg-[#1a0d0f] px-3 py-2 text-xs font-semibold text-red-100 hover:border-red-400/70">
                      이미지 업로드
                      <input type="file" accept="image/*" multiple onChange={handleEditorImageUpload} className="hidden" />
                    </label>
                    <label className="block cursor-pointer rounded-lg border border-red-900/40 bg-[#1a0d0f] px-3 py-2 text-xs font-semibold text-red-100 hover:border-red-400/70">
                      MP3 업로드
                      <input type="file" accept=".mp3,audio/mpeg,audio/*" onChange={handleEditorAudioUpload} className="hidden" />
                    </label>
                    <label className="block cursor-pointer rounded-lg border border-red-900/40 bg-[#1a0d0f] px-3 py-2 text-xs font-semibold text-red-100 hover:border-red-400/70">
                      SRT 업로드
                      <input type="file" accept=".srt,text/plain" onChange={handleEditorSrtUpload} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={handleLoadGeneratedImagesToEditor}
                      className="w-full rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/20"
                    >
                      기존 생성 이미지 불러오기
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateAutoSrtForEditor}
                      className="w-full rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/20"
                    >
                      대본으로 자막 자동 생성
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyScriptToEditorSrt();
                      }}
                      className="w-full rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/20"
                    >
                      앞서 만든 대본 {"->"} SRT 적용
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleApplyTtsToEditorMp3();
                      }}
                      disabled={isApplyingEditorTts}
                      className="w-full rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-60"
                    >
                      {isApplyingEditorTts ? "TTS MP3 적용 중..." : "앞서 만든 TTS -> MP3 적용"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleApplyGeneratedAssetsToEditor();
                      }}
                      disabled={isApplyingEditorTts}
                      className="w-full rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-60"
                    >
                      이미지 + SRT + MP3 한번에 적용
                    </button>
                    <p className="text-[11px] text-red-100/60">
                      이미지 {editorImageUrls.length}장 · 자막 {editorSubtitleCues.length}개 · 오디오 {editorAudioUrl ? "1개" : "0개"}
                    </p>
                  </div>
                </aside>

                <section className="flex min-h-[760px] flex-col bg-[#17090a]">
                  <div className="px-4 py-4">
                    <div className="relative overflow-hidden rounded-2xl border border-red-900/40 bg-black">
                      <div className="absolute left-3 top-3 z-10 rounded-md bg-black/70 px-2 py-1 text-xs text-white">{timelinePlaybackRate.toFixed(2)}x</div>
                      <div className="absolute right-3 top-3 z-10 rounded-md border border-red-400/50 bg-black/50 px-2 py-1 text-[10px] font-semibold text-red-100">
                        {logoRemovalMode ? "로고 제거 ON" : "로고 제거 OFF"}
                      </div>
                      <div className="w-full bg-gradient-to-br from-[#3a1216] via-[#1f0a0d] to-black" style={{ aspectRatio: previewAspectRatio }}>
                        {previewCut?.imageUrl ? (
                          <img src={previewCut.imageUrl} alt="선택 컷" className="h-full w-full object-contain" style={previewFilterStyle} />
                        ) : videoUrl ? (
                          <video src={videoUrl} controls className="h-full w-full object-contain" style={previewFilterStyle} />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <div className="rounded-xl border border-red-400/40 bg-[#1f0a0d]/80 px-5 py-4 text-center">
                              <p className="text-sm font-semibold text-red-100">편집 프리뷰</p>
                              <p className="mt-1 text-xs text-red-200/70">출력 전 샘플 화면입니다</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-red-900/40 px-4 py-3">
                    <div className="flex items-center justify-center gap-3 text-red-100">
                      <button
                        type="button"
                        onClick={() => seekTimeline(0)}
                        className="rounded-full border border-red-500/50 p-2 hover:border-red-300"
                        title="처음으로"
                      >
                        <FiChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={toggleTimelinePlayback}
                        className="rounded-full border border-red-500/50 p-2 hover:border-red-300"
                        title={isTimelinePlaying ? "일시정지" : "재생"}
                      >
                        {isTimelinePlaying ? (
                          <FiPause className="h-4 w-4" />
                        ) : (
                          <FiPlay className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => seekTimeline(totalEditorDuration)}
                        className="rounded-full border border-red-500/50 p-2 hover:border-red-300"
                        title="끝으로"
                      >
                        <FiChevronRight className="h-4 w-4" />
                      </button>
                      <span className="text-xs text-red-100/80">
                        {formatTimelineClock(timelineCurrentSec)} / {formatTimelineClock(totalEditorDuration)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0.001, totalEditorDuration)}
                      step={0.01}
                      value={Math.min(timelineCurrentSec, totalEditorDuration)}
                      onChange={(event) => seekTimeline(Number(event.target.value))}
                      className="mt-3 w-full accent-red-500"
                    />
                  </div>

                  <div className="mt-auto border-t border-red-900/40 bg-[#13090b] p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-red-100/70">
                      <span>타임라인</span>
                      <span>{timelineCuts.length || timelineScenes.length} Scene</span>
                    </div>
                    <div className="relative overflow-x-auto rounded-xl border border-red-900/40 bg-[#1b0d10] p-2">
                      <div className="relative" style={{ width: `${timelineWidthPx}px` }}>
                        <div className="relative mb-2 h-6 rounded border border-red-900/40 bg-[#160a0d]">
                          {Array.from({ length: tickCount }).map((_, idx) => {
                            const sec = idx * majorTickSec;
                            const left = (sec / Math.max(totalEditorDuration, 0.001)) * 100;
                            return (
                              <div
                                key={`tick-${sec}`}
                                className="absolute top-0 h-full border-l border-red-700/60"
                                style={{ left: `${left}%` }}
                              >
                                <span className="absolute left-1 top-0.5 text-[10px] text-red-100/60">
                                  {formatTimelineClock(sec)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="relative space-y-2">
                          <div
                            ref={timelineVideoTrackRef}
                            className={`relative h-11 cursor-pointer rounded border border-red-900/40 bg-[#2a1114]/40 ${timelineDragState ? "select-none" : ""}`}
                            onClick={handleTimelineSeek}
                            title="비디오 트랙"
                          >
                            <span className="absolute left-2 top-1 text-[10px] uppercase tracking-[0.1em] text-red-100/60">VIDEO</span>
                            {timelineCuts.map((cut) => {
                              const left = (cut.startSec / Math.max(totalEditorDuration, 0.001)) * 100;
                              const width =
                                ((cut.endSec - cut.startSec) / Math.max(totalEditorDuration, 0.001)) * 100;
                              return (
                                <button
                                  key={cut.id}
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedCutId(cut.id);
                                    seekTimeline(cut.startSec);
                                  }}
                                  onMouseDown={(event) => beginTimelineCutDrag(event, cut.id, "move", totalEditorDuration)}
                                  className={`absolute top-[20px] h-[18px] overflow-hidden rounded border text-[10px] ${selectedCutId === cut.id
                                    ? "border-red-200 bg-red-500/35 text-red-50"
                                    : "border-red-300/50 bg-red-500/20 text-red-100"
                                    }`}
                                  style={{ left: `${left}%`, width: `${Math.max(width, 1.2)}%` }}
                                  title={`${cut.caption} (${cut.startSec.toFixed(2)}s ~ ${cut.endSec.toFixed(2)}s)`}
                                >
                                  <span
                                    className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize rounded-l border-r border-white/40 bg-black/30"
                                    onMouseDown={(event) => beginTimelineCutDrag(event, cut.id, "trimStart", totalEditorDuration)}
                                  />
                                  <span className="pointer-events-none block px-2 text-[9px] font-semibold leading-[18px]">
                                    V{timelineCuts.findIndex((item) => item.id === cut.id) + 1}
                                  </span>
                                  <span
                                    className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize rounded-r border-l border-white/40 bg-black/30"
                                    onMouseDown={(event) => beginTimelineCutDrag(event, cut.id, "trimEnd", totalEditorDuration)}
                                  />
                                </button>
                              );
                            })}
                          </div>

                          <div
                            className="relative h-11 cursor-pointer rounded border border-red-900/40 bg-[#2a1114]/40"
                            onClick={handleTimelineSeek}
                            title="오디오 트랙"
                          >
                            <span className="absolute left-2 top-1 text-[10px] uppercase tracking-[0.1em] text-red-100/60">AUDIO</span>
                            {editorAudioUrl ? (
                              <>
                                <div
                                  className="absolute top-[20px] h-[16px] rounded bg-red-400/35"
                                  style={{
                                    left: "0%",
                                    width: `${Math.min(
                                      100,
                                      (editorAudioDurationSec / Math.max(totalEditorDuration, 0.001)) * 100
                                    )}%`,
                                  }}
                                />
                                <div
                                  className="pointer-events-none absolute top-[22px] h-[12px] rounded bg-[repeating-linear-gradient(90deg,rgba(254,202,202,0.85)_0px,rgba(254,202,202,0.85)_1px,transparent_1px,transparent_5px)]"
                                  style={{
                                    left: "0%",
                                    width: `${Math.min(
                                      100,
                                      (editorAudioDurationSec / Math.max(totalEditorDuration, 0.001)) * 100
                                    )}%`,
                                  }}
                                />
                              </>
                            ) : (
                              <div className="absolute left-2 top-[20px] text-[10px] text-red-100/50">
                                TTS를 MP3로 만들면 여기에 오디오 클립이 표시됩니다.
                              </div>
                            )}
                          </div>

                          <div
                            className="relative h-11 cursor-pointer rounded border border-red-900/40 bg-[#2a1114]/40"
                            onClick={handleTimelineSeek}
                            title="자막 트랙"
                          >
                            <span className="absolute left-2 top-1 text-[10px] uppercase tracking-[0.1em] text-red-100/60">SUBTITLE</span>
                            {editorSubtitleCues.map((cue) => {
                              const left = (cue.startSec / Math.max(totalEditorDuration, 0.001)) * 100;
                              const width =
                                ((cue.endSec - cue.startSec) / Math.max(totalEditorDuration, 0.001)) * 100;
                              return (
                                <button
                                  key={cue.id}
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    seekTimeline(cue.startSec);
                                  }}
                                  className="absolute top-[20px] h-[16px] overflow-hidden rounded border border-red-300/60 bg-red-500/20 px-1 text-[9px] text-red-100"
                                  style={{ left: `${left}%`, width: `${Math.max(width, 1.1)}%` }}
                                  title={`${cue.text} (${cue.startSec.toFixed(2)}s ~ ${cue.endSec.toFixed(2)}s)`}
                                >
                                  <span className="pointer-events-none block truncate leading-[16px]">
                                    S{editorSubtitleCues.findIndex((item) => item.id === cue.id) + 1}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <div
                            className="pointer-events-none absolute top-0 h-full border-l-2 border-red-300"
                            style={{ left: `${playheadPercent}%` }}
                          />
                        </div>

                        {editorAudioUrl && (
                          <audio ref={timelineAudioRef} src={editorAudioUrl} preload="auto" className="hidden" />
                        )}
                      </div>
                    </div>

                    {timelineCuts.length > 0 && (
                      <div className="mt-3 space-y-2 rounded-xl border border-red-900/40 bg-[#211112] p-3">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-red-100/70">선택 클립 정보</div>
                        <p className="text-xs text-red-100">
                          {previewCut ? `${previewCut.caption} (${previewCut.startSec.toFixed(2)}s ~ ${previewCut.endSec.toFixed(2)}s)` : "클립을 선택하세요."}
                        </p>
                        {editorAudioUrl && <audio src={editorAudioUrl} controls className="w-full" />}
                      </div>
                    )}

                    <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
                      <div className="rounded-xl border border-red-900/40 bg-[#221112] p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-red-100/70">편집 메모</p>
                        <textarea
                          value={editNotes}
                          onChange={(event) => setEditNotes(event.target.value)}
                          rows={4}
                          className="mt-2 w-full rounded-lg border border-red-900/40 bg-[#12090b]/80 px-3 py-2 text-sm text-red-50 placeholder:text-red-100/45 focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="컷 전환, 자막 스타일, 강조 구간 등을 기록하세요."
                        />
                        <button
                          type="button"
                          onClick={handleDownloadEditNotes}
                          className="mt-2 rounded-lg border border-red-900/40 bg-[#1a0d0f] px-3 py-2 text-xs font-semibold text-red-100 hover:border-red-400/70"
                        >
                          편집 노트 다운로드
                        </button>
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={handleDownloadSrt}
                            disabled={isExportingSrt}
                            className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-60"
                          >
                            {isExportingSrt ? "SRT 생성 중..." : "자막 SRT 다운로드"}
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadTtsMp3}
                            disabled={isExportingTtsMp3}
                            className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-60"
                          >
                            {isExportingTtsMp3 ? "MP3 생성 중..." : "TTS MP3 다운로드"}
                          </button>
                        </div>

                        <div className="mt-3 rounded-lg border border-red-900/40 bg-[#12090b]/70 p-2">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-xs font-semibold text-red-100">컷 편집</p>
                              <p className="text-[11px] text-red-100/65">{editorCuts.length}개</p>
                            </div>
                            {editorCuts.length === 0 ? (
                              <p className="rounded-md border border-dashed border-red-900/40 bg-[#1a0d0f] px-2 py-3 text-[11px] text-red-100/70">
                                이미지/SRT/MP3를 업로드하거나 좌측의 '기존 생성 이미지 불러오기'를 눌러 컷을 생성하세요.
                              </p>
                            ) : (
                              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                                {editorCuts.map((cut, idx) => (
                                  <div
                                    key={cut.id}
                                    className={`rounded-md border px-2 py-1.5 ${selectedCutId === cut.id ? "border-red-300/60 bg-red-500/15" : "border-red-900/40 bg-[#1a0d0f]/70"}`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCutId(cut.id)}
                                      className="w-full text-left text-[11px] font-semibold text-red-100"
                                    >
                                      컷 {idx + 1} · {cut.caption || "무자막"}
                                    </button>
                                    <div className="mt-1 grid grid-cols-[1fr_1fr_auto_auto] items-center gap-1">
                                      <input
                                        type="number"
                                        step={0.1}
                                        value={Number(cut.startSec.toFixed(2))}
                                        onChange={(e) => updateEditorCutTime(cut.id, "startSec", Number(e.target.value))}
                                        className="rounded border border-red-900/40 bg-[#12090b] px-1.5 py-1 text-[11px] text-red-100"
                                      />
                                      <input
                                        type="number"
                                        step={0.1}
                                        value={Number(cut.endSec.toFixed(2))}
                                        onChange={(e) => updateEditorCutTime(cut.id, "endSec", Number(e.target.value))}
                                        className="rounded border border-red-900/40 bg-[#12090b] px-1.5 py-1 text-[11px] text-red-100"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => splitEditorCut(cut.id)}
                                        className="rounded border border-red-900/40 px-2 py-1 text-[10px] text-red-100 hover:border-red-400/70"
                                      >
                                        분할
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteEditorCut(cut.id)}
                                        className="rounded border border-red-500/60 px-2 py-1 text-[10px] text-red-200 hover:bg-red-500/20"
                                      >
                                        삭제
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                      </div>

                      <div className="rounded-xl border border-red-900/40 bg-[#221112] p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-red-100/70">렌더 상태</p>
                        <div className="mt-2 h-2 w-full rounded-full bg-red-900/40">
                          <div
                            style={{ width: `${renderingProgress}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                          />
                        </div>
                        <p className="mt-2 text-xs text-red-100/75">
                          {renderingStatus || "출력을 시작하면 모든 컷을 자동으로 조합합니다."}
                        </p>
                        <button
                          onClick={startRendering}
                          disabled={rendering}
                          className="mt-3 w-full rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(220,38,38,0.35)] disabled:opacity-60"
                        >
                          {rendering ? "출력 진행 중..." : "영상 출력 시작"}
                        </button>
                        <button
                          onClick={handleVideoGenerate}
                          disabled={videoGenerating}
                          className="mt-2 w-full rounded-xl border border-red-900/40 bg-[#1a0d0f] px-4 py-2 text-sm font-semibold text-red-100 hover:border-red-400/70 disabled:opacity-60"
                        >
                          {videoGenerating ? "영상 생성 요청 중..." : "영상 생성 요청하기"}
                        </button>
                        <ErrorNotice error={videoError} context="영상 생성" />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0a0505] text-white relative overflow-hidden"
      style={{
        fontFamily: '"Pretendard", "SUIT", "Apple SD Gothic Neo", sans-serif',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,76,76,0.18),_transparent_48%),radial-gradient(circle_at_80%_10%,_rgba(251,146,60,0.18),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(239,68,68,0.12),_transparent_50%)]" />
      <div className="absolute -top-40 -left-28 h-[clamp(260px,40vw,460px)] w-[clamp(260px,40vw,460px)] rounded-full bg-gradient-to-br from-red-600/40 via-orange-500/20 to-transparent blur-3xl" />
      <div className="absolute -bottom-32 -right-28 h-[clamp(240px,36vw,420px)] w-[clamp(240px,36vw,420px)] rounded-full bg-gradient-to-tr from-rose-400/30 via-red-500/10 to-transparent blur-3xl" />

      <div className="absolute top-0 right-0 p-4 sm:p-6 flex gap-3 z-50 items-center">
        <UserCreditToolbar user={user} onLogout={handleLogout} tone="red" showCredits={false} />
      </div>
      <div className="absolute top-0 left-0 p-4 sm:p-6 z-50">
        <HomeBackButton tone="red" />
      </div>

      <div className="relative mx-auto max-w-[min(1800px,98vw)] px-[clamp(0.8rem,2vw,2rem)] py-[clamp(0.8rem,1.8vw,1.6rem)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
        </div>

        <header className="mt-2 flex justify-center">
          <div className="max-w-4xl text-center">
            <p className="text-[clamp(0.7rem,1.2vw,0.85rem)] font-semibold uppercase tracking-[0.35em] text-white/40">
              All-in-one studio
            </p>
            <h1 className="mt-2 whitespace-nowrap text-[clamp(1.8rem,2.5vw,2.7rem)] font-black text-white">
              올인원 영상 제작 스튜디오
            </h1>
            <p className="mt-2 whitespace-nowrap text-[clamp(0.85rem,1.2vw,0.95rem)] text-white/70">
              필요한 단계를 빠르게 확인하고 바로 제작을 이어가세요.
            </p>
          </div>
        </header>

        {/* API 키 입력 섹션 제거됨 (마이페이지로 이동) */}

        <div className="mt-[clamp(0.8rem,1.8vw,1.4rem)]">
          <main className="rounded-[clamp(1.2rem,2.5vw,2rem)] border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            <div
              className={`grid gap-4 px-[clamp(1rem,2vw,2rem)] pb-[clamp(1.2rem,2.4vw,2rem)] ${isSidebarGuideCollapsed
                ? "lg:grid-cols-[72px_minmax(0,1fr)]"
                : "lg:grid-cols-[clamp(220px,16vw,280px)_minmax(0,1fr)]"
                } ${activeStep.id === "image"
                ? "pt-[clamp(0.6rem,1.2vw,0.9rem)]"
                : "pt-[clamp(1.5rem,3vw,2.5rem)]"
                }`}
            >
              <aside className="hidden lg:flex min-h-full flex-col gap-3">
                <div className={`flex-1 rounded-2xl border border-white/10 bg-black/25 ${isSidebarGuideCollapsed ? "p-2" : "p-3"}`}>
                    <div className={`${isSidebarGuideCollapsed ? "" : "mb-3"} flex items-center justify-end`}>
                      <button
                        type="button"
                        onClick={() => setIsSidebarGuideCollapsed((prev) => !prev)}
                        className={`rounded-md border border-red-400/50 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-100 hover:border-red-300 hover:bg-red-500/20 ${isSidebarGuideCollapsed ? "w-full" : ""}`}
                      >
                        {isSidebarGuideCollapsed ? "펼치기" : "접기"}
                      </button>
                    </div>
                    {!isSidebarGuideCollapsed && (
                      <div className="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-100/70">
                          Step {currentStep + 1}
                        </p>
                        <p className="mt-1 text-lg font-bold text-white">{activeStep.label}</p>
                        <p className="mt-1 text-base leading-7 text-red-100/90">{activeStep.description}</p>
                      </div>
                    )}
                    {!isSidebarGuideCollapsed && (
                      <div className="mb-3 rounded-xl border border-red-400/25 bg-red-500/10 p-3">
                        <p className="text-sm font-semibold text-red-100">{currentActionGuide.title}</p>
                        <div className="mt-2 space-y-1">
                          {sidebarGuideItems.map((item, idx) => (
                            <p key={`${activeStep.id}-sidebar-guide-${idx}`} className="text-sm leading-6 text-red-100/90">
                              {idx + 1}. {item.replace(/`/g, "")}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      {!isSidebarGuideCollapsed && (
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/60">단계 안내</p>
                      )}
                    </div>
                    {!isSidebarGuideCollapsed && (
                    <div className="mt-2 space-y-1.5">
                      {steps.map((step, index) => {
                        const isCompletedStep = index < currentStep;
                        const isActiveStep = index === currentStep;
                        return (
                        <button
                          key={`sidebar-step-${step.id}`}
                          type="button"
                          onClick={() => goToStep(index)}
                          className={`w-full rounded-lg border px-2 py-2 text-left transition ${isActiveStep
                            ? "border-red-400/60 bg-red-500/15 text-red-100"
                            : "border-white/10 bg-white/5 text-white/70 hover:border-white/35"
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold">{index + 1}. {step.label}</p>
                            {isCompletedStep && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-red-300/60 bg-red-500/30 px-2 py-0.5 text-[10px] font-semibold text-red-50">
                                ✓ 완료됨
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-white/80">{step.description}</p>
                        </button>
                        );
                      })}
                    </div>
                    )}
                </div>
              </aside>

              <div className="min-h-full">{renderStepContent()}</div>
            </div>

            <div className="border-t border-white/10 p-[clamp(1.2rem,2.5vw,2rem)]">
              {(activeStep.id === "image" && imageSubStep === 0 && imageStepProgress.active) && (
                <div
                  className={`mb-3 rounded-2xl border px-4 py-3 ${imageStepProgress.tone === "error"
                    ? "border-red-300/40 bg-red-900/20"
                    : imageStepProgress.tone === "success"
                      ? "border-emerald-300/40 bg-emerald-900/20"
                      : "border-amber-300/40 bg-amber-900/20"
                    }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">{imageStepProgress.title}</p>
                    <span className="text-xs font-semibold text-white/80">{Math.round(imageStepProgress.percent)}%</span>
                  </div>
                  <p className="mt-1 text-xs text-white/75">
                    현재 작업: {imageStepProgress.detail}
                  </p>
                  <div className="mt-2 h-2 w-full rounded-full bg-black/40">
                    <div
                      className={`h-full rounded-full ${imageStepProgress.tone === "error"
                        ? "bg-red-400"
                        : imageStepProgress.tone === "success"
                          ? "bg-emerald-400"
                          : "bg-amber-300"
                        }`}
                      style={{ width: `${Math.max(4, Math.min(100, imageStepProgress.percent))}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!canGoPrev}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-base font-semibold text-white/70 transition hover:border-white/40 disabled:opacity-40 hover:scale-105 active:scale-95 sm:w-auto"
                >
                  <FiChevronLeft size={20} /> 이전 단계
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-red-500 px-8 py-3 text-base font-semibold text-white shadow-[0_10px_20px_rgba(220,38,38,0.4)] transition hover:translate-x-0.5 disabled:opacity-40 hover:scale-105 active:scale-95 sm:w-auto"
                >
                  다음 단계 <FiChevronRight size={20} />
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>

      {supportErrorDialog && typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100001]">
            <button
              type="button"
              aria-label="오류 창 닫기"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSupportErrorDialog(null)}
            />
            <div className="absolute left-1/2 top-1/2 w-[min(96vw,1120px)] max-h-[92vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-red-300/50 bg-[#1d0f10] shadow-[0_18px_55px_rgba(0,0,0,0.55)] overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-red-200/20 px-6 py-4">
                <h3 className="text-lg font-bold text-red-100">{supportErrorDialog.title}</h3>
                <button
                  type="button"
                  onClick={() => setSupportErrorDialog(null)}
                  className="rounded-full border border-red-200/40 px-4 py-1.5 text-sm font-semibold text-red-100 hover:bg-red-200/10"
                >
                  닫기
                </button>
              </div>
              <div className="max-h-[calc(92vh-82px)] overflow-y-auto px-6 py-5 space-y-5">
                <div className="rounded-xl border border-red-200/20 bg-black/25 p-4">
                  <p className="text-sm font-semibold text-red-100">오류 기능</p>
                  <p className="mt-1 text-sm text-red-50">{supportErrorDialog.context}</p>
                </div>
                <div className="rounded-xl border border-red-200/20 bg-black/25 p-4">
                  <p className="text-sm font-semibold text-red-100">오류 메시지</p>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-6 text-red-50">{supportErrorDialog.message}</pre>
                </div>
                <div className="rounded-xl border border-emerald-300/30 bg-emerald-900/20 p-4">
                  <p className="text-sm font-semibold text-emerald-200">해결 방법</p>
                  <ul className="mt-2 space-y-1 text-sm text-emerald-100">
                    {supportErrorDialog.troubleshooting.map((item, idx) => (
                      <li key={`${item}-${idx}`}>{idx + 1}. {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-amber-300/30 bg-amber-900/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-amber-200">제작자에게 전달</p>
                    <button
                      type="button"
                      onClick={handleCopySupportReport}
                      className="rounded-full border border-amber-200/60 px-4 py-1.5 text-sm font-semibold text-amber-100 hover:bg-amber-200/10"
                    >
                      복사
                    </button>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-6 text-amber-100">{supportErrorDialog.reportText}</pre>
                  {supportCopyStatus && <p className="mt-2 text-xs text-amber-200">{supportCopyStatus}</p>}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      {previewImageModal && typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100000]">
            <button
              type="button"
              aria-label="이미지 확대 보기 닫기"
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setPreviewImageModal(null)}
            />
            <div className="absolute left-1/2 top-1/2 w-[min(92vw,980px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/20 bg-black/90 p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white/80">{previewImageModal.title}</p>
                <button
                  type="button"
                  onClick={() => setPreviewImageModal(null)}
                  className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/10"
                >
                  닫기
                </button>
              </div>
              <div className="max-h-[78vh] overflow-auto rounded-xl border border-white/10 bg-black/60 p-2">
                <img
                  src={previewImageModal.src}
                  alt={previewImageModal.title}
                  className="mx-auto h-auto max-h-[72vh] w-auto max-w-full rounded-lg object-contain"
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default VideoPage;






