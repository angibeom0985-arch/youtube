
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
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiFilm,
  FiImage,
  FiMonitor,
  FiMic,
  FiSettings,
  FiSmartphone,
  FiTrash2,

} from "react-icons/fi";

import { supabase } from "@/services/supabase";
import type { User } from "@supabase/supabase-js";
import HomeBackButton from "@/components/HomeBackButton";
import ErrorNotice from "@/components/ErrorNotice";
import type { AnalysisResult, NewPlan } from "@/types";
import { analyzeTranscript, generateIdeas, generateNewPlan } from "@/services/geminiService";
import { getVideoDetails } from "@/services/youtubeService";
import { regenerateStoryboardImage } from "@/features/image/services/geminiService";
import type { CharacterStyle, BackgroundStyle, AspectRatio } from "@/features/image/types";


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
  ttsFavorites: "video_project_tts_favorites",
  youtubeUrl: "video_project_youtube_url",
  scriptCategory: "video_project_script_category",
  scriptCategoryOrder: "video_project_script_category_order",
  imagePrompt: "video_project_image_prompt",
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
type VoiceGender = "남성" | "여성";
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
  availability?: "available" | "fallback";
  fallbackVoice?: string;
};

type SupportErrorDialog = {
  title: string;
  context: string;
  message: string;
  troubleshooting: string[];
  reportText: string;
};

// 확장된 목소리 옵션 (모달용)
const allVoiceOptions: ExtendedVoiceOption[] = [
  { name: "민준", label: "신뢰 나레이션", tone: "신뢰감 있는 다큐 스타일", category: "남성", model: "Neural2", googleVoice: "ko-KR-Neural2-C", ssmlGender: "MALE", rate: 0.98, pitch: -1.8, tags: ["신뢰감 있는", "나레이션용"], sampleText: "핵심 데이터부터 차분하게 정리해 드리겠습니다." },
  { name: "지훈", label: "권위 비즈니스", tone: "프로페셔널 프레젠테이션", category: "남성", model: "Wavenet", googleVoice: "ko-KR-Wavenet-C", ssmlGender: "MALE", rate: 1.02, pitch: -1.2, tags: ["권위 있는", "광고/홍보"], sampleText: "실무에 바로 적용할 전략 세 가지를 말씀드리겠습니다." },
  { name: "도현", label: "권위 해설", tone: "정중한 해설 톤", category: "남성", model: "Standard", googleVoice: "ko-KR-Standard-C", ssmlGender: "MALE", rate: 0.96, pitch: -2.4, tags: ["권위 있는", "나레이션용"], sampleText: "지금부터 핵심 포인트를 순서대로 짚어보겠습니다." },
  { name: "태양", label: "발랄 에너지", tone: "활기찬 진행 톤", category: "남성", model: "Wavenet", googleVoice: "ko-KR-Wavenet-D", ssmlGender: "MALE", rate: 1.08, pitch: -0.4, tags: ["발랄한", "광고/홍보"], sampleText: "오늘 영상 진짜 알찬 정보 많으니 끝까지 함께해 주세요!" },
  { name: "준서", label: "차분 다큐", tone: "깊이 있는 내레이션", category: "남성", model: "Standard", googleVoice: "ko-KR-Standard-D", ssmlGender: "MALE", rate: 0.94, pitch: -2.8, tags: ["차분한", "나레이션용"], sampleText: "데이터를 바탕으로 변화의 흐름을 천천히 살펴보겠습니다." },
  { name: "동현", label: "신뢰 강연", tone: "리더십 강연 톤", category: "남성", model: "Neural2", googleVoice: "ko-KR-Neural2-C", ssmlGender: "MALE", rate: 1.0, pitch: -1.0, tags: ["신뢰감 있는", "권위 있는"], sampleText: "지금 실행하면 결과가 달라집니다. 방법을 알려드리죠." },
  { name: "상호", label: "차분 설명", tone: "따뜻한 해설 톤", category: "남성", model: "Wavenet", googleVoice: "ko-KR-Wavenet-D", ssmlGender: "MALE", rate: 0.92, pitch: -3.2, tags: ["차분한", "나레이션용"], sampleText: "복잡한 내용을 쉽고 안정적으로 정리해드리겠습니다." },
  { name: "재훈", label: "발랄 진행", tone: "경쾌한 진행", category: "남성", model: "Standard", googleVoice: "ko-KR-Standard-C", ssmlGender: "MALE", rate: 1.1, pitch: -0.6, tags: ["발랄한", "광고/홍보"], sampleText: "이 꿀팁들, 바로 써먹을 수 있게 빠르게 알려드릴게요!" },
  { name: "성민", label: "권위 조언", tone: "묵직한 조언 톤", category: "남성", model: "Standard", googleVoice: "ko-KR-Standard-D", ssmlGender: "MALE", rate: 0.9, pitch: -3.6, tags: ["권위 있는", "신뢰감 있는"], sampleText: "경험에서 나온 현실적인 조언을 전해드리겠습니다." },

  { name: "서연", label: "차분 아나운서", tone: "차분한 뉴스 톤", category: "여성", model: "Wavenet", googleVoice: "ko-KR-Wavenet-A", ssmlGender: "FEMALE", rate: 0.98, pitch: 1.2, tags: ["차분한", "나레이션용"], sampleText: "오늘 영상의 주요 내용을 정확하고 또렷하게 전달해 드립니다." },
  { name: "유나", label: "발랄 친근", tone: "밝고 친근한 진행", category: "여성", model: "Neural2", googleVoice: "ko-KR-Neural2-A", ssmlGender: "FEMALE", rate: 1.06, pitch: 2.6, tags: ["발랄한", "광고/홍보"], sampleText: "반가워요. 오늘도 재미있고 유익한 내용으로 준비했어요." },
  { name: "혜진", label: "신뢰 라디오", tone: "안정적인 라디오 톤", category: "여성", model: "Neural2", googleVoice: "ko-KR-Neural2-B", ssmlGender: "FEMALE", rate: 0.96, pitch: 0.8, tags: ["신뢰감 있는", "차분한"], sampleText: "처음 보는 분도 이해하기 쉽게 차근차근 설명해 드릴게요." },
  { name: "소희", label: "발랄 라이브", tone: "생동감 있는 리액션", category: "여성", model: "Wavenet", googleVoice: "ko-KR-Wavenet-B", ssmlGender: "FEMALE", rate: 1.08, pitch: 3.0, tags: ["발랄한", "광고/홍보"], sampleText: "지금부터 분위기 올려서 핵심만 시원하게 전달하겠습니다!" },
  { name: "하늘", label: "차분 가이드", tone: "명상 가이드 톤", category: "여성", model: "Standard", googleVoice: "ko-KR-Standard-A", ssmlGender: "FEMALE", rate: 0.94, pitch: 1.6, tags: ["차분한", "나레이션용"], sampleText: "호흡을 고르고 중요한 포인트에 집중해 보겠습니다." },
  { name: "수아", label: "발랄 쇼호스트", tone: "쇼핑호스트 스타일", category: "여성", model: "Standard", googleVoice: "ko-KR-Standard-B", ssmlGender: "FEMALE", rate: 1.1, pitch: 3.4, tags: ["발랄한", "광고/홍보"], sampleText: "오늘 영상, 바로 써먹을 수 있는 팁만 골라서 보여드릴게요." },
  { name: "예린", label: "신뢰 브이로그", tone: "가벼운 브이로그 톤", category: "여성", model: "Wavenet", googleVoice: "ko-KR-Wavenet-B", ssmlGender: "FEMALE", rate: 1.04, pitch: 2.4, tags: ["신뢰감 있는", "발랄한"], sampleText: "편하게 보시고 필요한 부분만 쏙 가져가세요." },
  { name: "미정", label: "권위 설명", tone: "안정적 설명 톤", category: "여성", model: "Standard", googleVoice: "ko-KR-Standard-A", ssmlGender: "FEMALE", rate: 0.92, pitch: 1.0, tags: ["권위 있는", "차분한"], sampleText: "복잡한 내용을 간단한 예시로 명확하게 정리해 드립니다." },
  { name: "순자", label: "차분 스토리", tone: "따뜻한 이야기 톤", category: "여성", model: "Neural2", googleVoice: "ko-KR-Neural2-B", ssmlGender: "FEMALE", rate: 0.9, pitch: 0.4, tags: ["차분한", "나레이션용"], sampleText: "오래 사랑받는 콘텐츠의 공통점을 따뜻하게 들려드릴게요." },

  // ko-KR Studio 단일 보이스는 현재 공식 표에서 확인되지 않아 Standard로 안전 폴백됩니다.
  { name: "서윤", label: "Studio 뉴스", tone: "방송형 차분 톤", category: "여성", model: "Studio", googleVoice: "ko-KR-Studio-A", ssmlGender: "FEMALE", rate: 1.0, pitch: 1.0, tags: ["차분한", "권위 있는"], sampleText: "스튜디오 톤으로 또렷한 뉴스 전달감을 제공합니다.", availability: "fallback", fallbackVoice: "ko-KR-Standard-A" },
  { name: "지안", label: "Studio 내레이션", tone: "깊이 있는 도큐 톤", category: "여성", model: "Studio", googleVoice: "ko-KR-Studio-B", ssmlGender: "FEMALE", rate: 0.96, pitch: 0.8, tags: ["신뢰감 있는", "나레이션용"], sampleText: "차분한 흐름으로 내용 몰입도를 높여드리겠습니다.", availability: "fallback", fallbackVoice: "ko-KR-Standard-B" },
  { name: "건우", label: "Studio 브리핑", tone: "권위 있는 브리핑 톤", category: "남성", model: "Studio", googleVoice: "ko-KR-Studio-C", ssmlGender: "MALE", rate: 0.98, pitch: -1.2, tags: ["권위 있는", "신뢰감 있는"], sampleText: "핵심 사실을 중심으로 명확하게 브리핑하겠습니다.", availability: "fallback", fallbackVoice: "ko-KR-Standard-C" },
  { name: "시우", label: "Studio 광고", tone: "고급 광고 내레이션", category: "남성", model: "Studio", googleVoice: "ko-KR-Studio-D", ssmlGender: "MALE", rate: 1.04, pitch: -0.4, tags: ["광고/홍보", "발랄한"], sampleText: "고급스러운 톤으로 브랜드 메시지를 전달해드립니다.", availability: "fallback", fallbackVoice: "ko-KR-Standard-D" },
];

const resolveVoiceMeta = (voiceName: string) =>
  allVoiceOptions.find((voice) => voice.name === voiceName) ||
  voiceOptions.find((voice) => voice.name === voiceName) ||
  null;

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
    description: "스토리보드 기반 이미지 프롬프트 설정",
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
        typeof name === "string" && allVoiceOptions.some((voice) => voice.name === name)
    );
    const unique = Array.from(new Set(validNames));
    return unique.length > 0 ? unique : defaults;
  });
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceGenderFilter, setVoiceGenderFilter] = useState<"전체" | VoiceGender>("전체");
  const [voiceTagFilter, setVoiceTagFilter] = useState<"전체" | VoiceTag>("전체");
  const [currentChapterForVoice, setCurrentChapterForVoice] = useState<number | null>(null);
  const [chapterVoices, setChapterVoices] = useState<Record<number, string>>(() =>
    getStoredJson(STORAGE_KEYS.ttsChapterVoices, {})
  );
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

  // Script sub-step management (대본 생성 단계의 하위 단계)
  const [scriptSubStep, setScriptSubStep] = useState(0); // 0: 입력, 1: 분석, 2: 주제선택, 3: 결과

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

  const [chapterImages, setChapterImages] = useState<Record<string, string>>({});
  const [cutEditPrompts, setCutEditPrompts] = useState<Record<string, string>>({});
  const [previewImageModal, setPreviewImageModal] = useState<{ src: string; title: string } | null>(null);
  const [generatingImageChapter, setGeneratingImageChapter] = useState<string | null>(null);
  const [isGeneratingAllCuts, setIsGeneratingAllCuts] = useState(false);
  const [isBatchPaused, setIsBatchPaused] = useState(false);
  const [batchGenerateProgress, setBatchGenerateProgress] = useState<{ done: number; total: number } | null>(null);

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

  const progressTimerRef = useRef<number | null>(null);
  const stopBatchGenerationRef = useRef(false);
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
  useEffect(() => setStoredValue(STORAGE_KEYS.scriptStyle, scriptStyle), [scriptStyle]);
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

      // Use regenerateStoryboardImage from geminiService
      // Note: We pass empty array for characters as VideoPage doesn't have full Character objects yet.
      // We rely on the prompt to describe the scene.
      const imageUrl = await regenerateStoryboardImage(
        fullPrompt,
        [],
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

  const handleStyleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("레퍼런스 이미지는 10MB 이하만 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      e.target.value = "";
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
    e.target.value = "";
  };

  const handleGenerateAllCutImages = async () => {
    if (isGeneratingAllCuts) return;

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

  const handleSaveCutImage = async (cut: {
    imageKey: string;
    chapterIndex: number;
    localCutIndex: number;
  }) => {
    const imageSrc = chapterImages[cut.imageKey];
    if (!imageSrc) {
      alert("저장할 이미지가 없습니다. 먼저 이미지를 생성해주세요.");
      return;
    }

    try {
      const baseName = (projectTitle || "video").trim().replace(/[^\w\-가-힣]+/g, "_");
      await saveImageBySrc(
        imageSrc,
        `${baseName}-chapter-${cut.chapterIndex + 1}-cut-${cut.localCutIndex + 1}.png`
      );
    } catch (error) {
      console.error("이미지 저장 오류:", error);
      alert("이미지 저장에 실패했습니다.");
    }
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

  const handleGenerateTts = () => {
    if (!ttsScript.trim()) {
      alert("음성으로 변환할 텍스트를 입력해 주세요.");
      return;
    }
    const newSample = {
      id: Date.now(),
      voice: selectedVoice,
      text: ttsScript.trim().slice(0, 60) + (ttsScript.trim().length > 60 ? "..." : ""),
      status: "생성 완료",
    };
    setTtsSamples((prev) => [newSample, ...prev].slice(0, 3));
    setRenderingStatus("AI 음성 출력을 준비했습니다.");
  };

  const voiceStyleMap: Record<string, { rate: number; pitch: number }> = Object.fromEntries(
    allVoiceOptions.map((voice) => [voice.name, { rate: voice.rate, pitch: voice.pitch }])
  );

  const ENABLE_BROWSER_TTS_FALLBACK = false;
  const PREVIEW_FALLBACK_DELAY_MS = 900;
  const strictVoiceProfileMap: Record<string, { voice: string; ssmlGender: SsmlGender; rate: number; pitch: number; fallbackVoice?: string }> =
    Object.fromEntries(
      allVoiceOptions.map((voice) => [
        voice.name,
        {
          voice: voice.googleVoice,
          ssmlGender: voice.ssmlGender,
          rate: voice.rate,
          pitch: voice.pitch,
          fallbackVoice: voice.fallbackVoice,
        },
      ])
    );
  const stripGenderPrefix = (label: string): string =>
    String(label || "").replace(/^(?:\uB0A8\uC131|\uC5EC\uC131)\s*/, "").trim();
  const favoriteVoiceOptions = useMemo(
    () =>
      favoriteVoiceNames
        .map((voiceName) => resolveVoiceMeta(voiceName))
        .filter((voice): voice is ExtendedVoiceOption => Boolean(voice && "googleVoice" in voice)),
    [favoriteVoiceNames]
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
  const filteredVoiceModalOptions = allVoiceOptions.filter((voice) => {
    if (voiceGenderFilter !== "전체" && voice.category !== voiceGenderFilter) return false;
    if (voiceTagFilter !== "전체" && !voice.tags.includes(voiceTagFilter)) return false;
    return true;
  });
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
    utterance.rate = Math.min(1.4, Math.max(0.8, ttsSpeed * style.rate));
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
      const voiceMeta = allVoiceOptions.find((voice) => voice.name === voiceName) || null;
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
            speakingRate: Math.min(1.4, Math.max(0.8, presetAdjustedRate)),
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



  const progressLabel = useMemo(() => `${currentStep + 1} / ${steps.length}`, [
    currentStep,
  ]);

  const stepPaths = useMemo(
    () => [
      `${normalizedBasePath}/video/setup`,
      `${normalizedBasePath}/video/script`,
      `${normalizedBasePath}/video/tts`,
      `${normalizedBasePath}/video/image`,
      `${normalizedBasePath}/video/generate`,
      `${normalizedBasePath}/video/render`,
    ],
    [normalizedBasePath]
  );
  const normalizePath = (path: string) =>
    path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
  const getStepIndexFromPath = (path: string) => {
    const normalized = normalizePath(path);
    const index = stepPaths.indexOf(normalized);
    return index >= 0 ? index : null;
  };
  const getStoredStepIndex = () => {
    const stored = getStoredString(STORAGE_KEYS.step, "0");
    const value = Number.parseInt(stored, 10);
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), steps.length - 1);
  };
  const goToStep = (index: number, replace = false) => {
    const safeIndex = Math.min(Math.max(index, 0), steps.length - 1);
    setCurrentStep(safeIndex);
    const targetPath = stepPaths[safeIndex];
    if (normalizePath(location.pathname) !== targetPath) {
      navigate(targetPath, { replace });
    }
    // 페이지 최상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const normalizedPath = normalizePath(location.pathname);
    const pathIndex = getStepIndexFromPath(normalizedPath);
    const storedIndex = getStoredStepIndex();

    console.log('[VideoPage] URL 라우팅:', {
      pathname: location.pathname,
      normalizedPath,
      pathIndex,
      storedIndex,
      currentStep,
      stepPaths
    });

    // /video 경로는 저장된 step이 있으면 그걸 사용하고, 없으면 /video/setup으로
    const isBaseVideoPath = normalizedPath === `${normalizedBasePath}/video` || normalizedPath === normalizedBasePath + '/video';
    const shouldUseStored = isBaseVideoPath && storedIndex !== 0;
    const nextIndex = shouldUseStored ? storedIndex : (pathIndex ?? (isBaseVideoPath ? 0 : storedIndex));

    console.log('[VideoPage] Step 결정:', {
      isBaseVideoPath,
      shouldUseStored,
      nextIndex,
      willNavigate: normalizedPath !== stepPaths[nextIndex]
    });

    if (nextIndex !== currentStep) {
      setCurrentStep(nextIndex);
    }
    const targetPath = stepPaths[nextIndex];
    if (normalizedPath !== targetPath) {
      navigate(targetPath, { replace: true });
    }
  }, [location.pathname, navigate, stepPaths, normalizedBasePath, currentStep]);

  const canGoPrev =
    currentStep > 0 || (steps[currentStep].id === "script" && scriptSubStep > 0);

  // 각 단계별로 다음 단계 진행 가능 여부 체크
  const canGoNext = (() => {
    if (currentStep >= steps.length - 1) return false;

    const currentStepId = steps[currentStep].id;

    // script 단계: 하위 단계별 진행 조건
    if (currentStepId === 'script') {
      if (scriptSubStep === 0) return scriptDraft.trim().length > 0;
      if (scriptSubStep === 1) return Boolean(scriptAnalysis);
      if (scriptSubStep === 2) return Boolean(generatedPlan);
      if (scriptSubStep === 3) return true;
      return false;
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
    goToStep(currentStep - 1);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    if (steps[currentStep].id === "script" && scriptSubStep < 3) {
      setScriptSubStep((prev) => Math.min(prev + 1, 3));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
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

    goToStep(currentStep + 1);
  };

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (error) {
      console.error("Footer AdSense error:", error);
    }
  }, [currentStep, scriptSubStep]);

  const activeStep = steps[currentStep];
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

      // Step 3: 추천 주제 생성 (제목 형식 반영)
      setAnalyzeProgress(prev => ({ ...prev, currentStep: 2 }));
      const ideas = await generateIdeas(analysis, selectedCategory, undefined, scriptTitle);
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
    setIsGeneratingScript(true);
    setGenerateProgress({ ...generateProgress, currentStep: 0 });

    try {
      // Step 1: 대본 구조 설계
      setGenerateProgress(prev => ({ ...prev, currentStep: 0 }));
      await new Promise(resolve => setTimeout(resolve, 300)); // UI 업데이트를 위한 짧은 지연

      // Step 2: 콘텐츠 생성
      setGenerateProgress(prev => ({ ...prev, currentStep: 1 }));
      const plan = await generateNewPlan(
        scriptAnalysis,
        selectedTopic,
        formatScriptLengthLabel(),
        selectedCategory,
        undefined,
        scriptStyle
      );

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
          line: stripNarrationPrefix(cleanText(line.line)),
        })),
      })),
      scriptWithCharacters: plan.scriptWithCharacters?.map(line => ({
        ...line,
        character: cleanText(line.character),
        line: stripNarrationPrefix(cleanText(line.line)),
      })),
      scriptOutline: plan.scriptOutline?.map(stage => ({
        ...stage,
        stage: cleanText(stage.stage),
        purpose: cleanText(stage.purpose),
        details: cleanText(stage.details),
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
                    {/* 제목 입력 */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/80">
                        영상 제목 (선택사항)
                      </label>
                      <input
                        type="text"
                        value={scriptTitle}
                        onChange={(event) => setScriptTitle(event.target.value)}
                        className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="예: 경제 위기 속 재테크 주식 투자 전략"
                      />
                      <p className="text-xs text-white/50">
                        제목을 입력하면 AI 추천 주제가 비슷한 형식으로, 새로운 소재로 생성됩니다
                      </p>
                    </div>

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
                        <div className="rounded-xl border border-sky-400/35 bg-sky-500/10 px-4 py-3">
                          <p className="text-xs font-semibold text-sky-300 mb-2">외부 링크</p>
                          <a
                            href={normalizedYoutubeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="group block rounded-lg border border-sky-300/30 bg-slate-950/40 p-3 hover:border-sky-300/50 hover:bg-slate-900/55 transition-colors"
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
                                <p className="text-sm font-semibold text-sky-100 line-clamp-2">
                                  {youtubeLinkPreviewLoading
                                    ? "영상 정보를 불러오는 중..."
                                    : (youtubeLinkPreview?.title || "유튜브 영상 열기")}
                                </p>
                                <p className="mt-1 text-xs text-sky-100/75 break-all line-clamp-2">
                                  {normalizedYoutubeUrl}
                                </p>
                                {youtubeLinkPreviewError && (
                                  <p className="mt-1 text-[11px] text-amber-200/90">{youtubeLinkPreviewError}</p>
                                )}
                              </div>

                              <FiExternalLink className="mt-0.5 shrink-0 text-sky-100/80 group-hover:text-sky-50" />
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
                      <div className="rounded-xl border border-blue-400/50 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
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
                    {/* 대본 분석 버튼 및 결과 */}
                    <div className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => handleAnalyzeScript({ autoAdvance: true, showDetails: false })}
                          disabled={isAnalyzingScript || !isScriptStepReady(0)}
                          className="w-full rounded-full bg-gradient-to-r from-red-700 to-red-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(239,68,68,0.45)] hover:from-red-600 hover:to-red-500 transition-all disabled:opacity-60"
                        >
                          {isAnalyzingScript ? "주제 추천 준비 중..." : withOptionalCreditLabel("빠르게 주제 추천", CREDIT_COSTS.ANALYZE_TRANSCRIPT + CREDIT_COSTS.GENERATE_IDEAS)}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAnalyzeScript({ autoAdvance: false, showDetails: true })}
                          disabled={isAnalyzingScript || !isScriptStepReady(0)}
                          className="w-full rounded-full border border-white/20 bg-black/40 px-5 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 transition-all disabled:opacity-60"
                        >
                          {isAnalyzingScript ? "구조 분석 중..." : withOptionalCreditLabel("대본 구조 분석 보기", CREDIT_COSTS.ANALYZE_TRANSCRIPT + CREDIT_COSTS.GENERATE_IDEAS)}
                        </button>
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

                      {showAnalysisDetails && scriptAnalysis?.scriptStructure && (
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

                      {/* 주제 선택 섹션 */}
                      {scriptAnalysis && (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-white">대본 구조 분석 (선택)</p>
                              <p className="text-xs text-white/50">궁금한 경우에만 열어보세요</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowAnalysisDetails((prev) => !prev)}
                              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition-all"
                            >
                              {showAnalysisDetails ? "닫기" : "분석 결과 보기"}
                            </button>
                          </div>
                          {showAnalysisDetails && scriptAnalysis?.scriptStructure && (
                            <div className="mt-3 grid gap-2">
                              {scriptAnalysis.scriptStructure.map((stage) => (
                                <div
                                  key={stage.stage}
                                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                                >
                                  <p className="text-sm font-semibold text-white">{stage.stage}</p>
                                  <p className="text-xs text-white/50">{stage.purpose}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {scriptIdeas.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                          <div className="mb-3 pb-3 border-b border-white/10">
                            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                              <span className="text-blue-400">추천</span>
                              AI 추천 주제
                            </h3>
                            <p className="text-xs text-white/50">
                              분석 결과를 바탕으로 생성할 수 있는 주제들입니다
                            </p>
                          </div>
                          <p className="text-sm text-white/60 mb-4">
                            {isAnalyzingScript
                              ? "추천 주제를 생성 중입니다. 잠시만 기다려 주세요."
                              : "추천 주제를 보려면 빠르게 주제 추천을 실행해주세요."}
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
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={selectedTopic}
                                onChange={(e) => setSelectedTopic(e.target.value)}
                                placeholder="원하는 주제를 직접 입력하세요 (예: 경제 위기 속에서 살아남는 방법)"
                                className="flex-1 rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                              <button
                                onClick={handleReformatTopic}
                                disabled={isReformattingTopic || !selectedTopic.trim() || !scriptTitle.trim()}
                                className="px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
                                title="영상 제목 형식으로 변환"
                              >
                                {isReformattingTopic ? "변환 중..." : withOptionalCreditLabel("형식 변환", CREDIT_COSTS.REFORMAT_TOPIC)}
                              </button>
                            </div>
                            {scriptTitle.trim() && (
                              <p className="text-xs text-white/50">
                                '{scriptTitle}' 영상 제목 형식으로 변환됩니다
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                          <div className="mb-4 pb-3 border-b border-white/10">
                            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                              <span className="text-blue-400">추천</span>
                              AI 추천 주제
                            </h3>
                            <p className="text-xs text-white/50">
                              원하는 주제를 선택하면 해당 주제로 새로운 대본을 작성합니다 ({scriptIdeas.length}개)
                            </p>
                          </div>
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
                              </button>
                            ))}
                          </div>

                          {/* 직접 입력 칸 */}
                          <div className="space-y-2 pt-4 border-t border-white/10">
                            <label className="text-sm font-semibold text-white/80 flex items-center gap-2">
                              <span>입력</span>
                              또는 직접 주제 입력
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={selectedTopic && !scriptIdeas.includes(selectedTopic) ? selectedTopic : ''}
                                onChange={(e) => setSelectedTopic(e.target.value)}
                                placeholder="원하는 주제를 직접 입력하세요 (예: 경제 위기 속에서 살아남는 방법)"
                                className="flex-1 rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                              <button
                                onClick={handleReformatTopic}
                                disabled={isReformattingTopic || !selectedTopic.trim() || !scriptTitle.trim()}
                                className="px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
                                title="영상 제목 형식으로 변환"
                              >
                                {isReformattingTopic ? "변환 중..." : withOptionalCreditLabel("형식 변환", CREDIT_COSTS.REFORMAT_TOPIC)}
                              </button>
                            </div>
                            {scriptTitle.trim() && (
                              <p className="text-xs text-white/50">
                                '{scriptTitle}' 영상 제목 형식으로 변환됩니다
                              </p>
                            )}
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

                    <div className="pt-4 border-t border-white/10 flex justify-end">
                      <button
                        type="button"
                        onClick={handleGenerateScript}
                        disabled={isGeneratingScript || !isScriptStepReady(2)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold shadow-lg hover:from-red-500 hover:to-red-400 transition-all disabled:opacity-50"
                      >
                        {isGeneratingScript ? "대본 작성 중..." : withOptionalCreditLabel("대본 생성하기", CREDIT_COSTS.GENERATE_SCRIPT)} <FiChevronRight />
                      </button>
                    </div>

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
                  </>
                )}

                {/* Step 3: 대본 생성 결과 */}
                {scriptSubStep === 3 && generatedPlan && (
                  <>
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
                                            <div className="flex items-start gap-3">
                                              <div className="w-24 flex-shrink-0 pt-0.5">
                                                <span className={`font-bold text-sm ${characterColorMap.get(line.character) || "text-orange-400"}`}>
                                                  {line.character}
                                                </span>
                                                {line.timestamp && (
                                                  <div className="text-xs text-white/40 font-mono mt-0.5">
                                                    [{line.timestamp}]
                                                  </div>
                                                )}
                                              </div>
                                              <div className="flex-1 text-sm text-white/90 leading-relaxed">
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
                                    <div className="flex items-start gap-3">
                                      <div className="w-24 flex-shrink-0 pt-0.5">
                                        <span className={`font-bold text-sm ${characterColorMap.get(line.character) || "text-orange-400"}`}>
                                          {line.character}
                                        </span>
                                        {line.timestamp && (
                                          <div className="text-xs text-white/40 font-mono mt-0.5">
                                            [{line.timestamp}]
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 text-sm text-white/90 leading-relaxed">
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
          <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
            <div className="rounded-[clamp(1rem,2vw,1.6rem)] border border-white/10 bg-black/40 p-[clamp(1.25rem,2vw,1.8rem)] shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <p className="text-sm font-semibold text-white/60">스크립트 & TTS</p>
                  <h3 className="text-2xl font-bold text-white mt-1">대본에 음성을 입혀주세요.</h3>
                  <p className="mt-2 text-sm text-white/60">
                    각 챕터별로 목소리를 선택하고 편집할 수 있습니다.
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
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                    <span className="text-sm font-semibold text-white/70">전체 목소리 적용</span>
                    <select
                      className="rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-red-500"
                      value=""
                      onChange={(e) => applyVoiceToAllChapters(e.target.value)}
                    >
                      <option value="" disabled>목소리 선택</option>
                      <optgroup label="남성">
                        {allVoiceOptions.filter(v => v.category === "남성").map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name} · {stripGenderPrefix(voice.label)}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="여성">
                        {allVoiceOptions.filter(v => v.category === "여성").map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name} · {stripGenderPrefix(voice.label)}
                          </option>
                        ))}
                      </optgroup>
                    </select>
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
                            {chapterVoices[index] || favoriteVoiceOptions[0]?.name || "민준"}
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
                                  const sampleText = allVoiceOptions.find(v => v.name === voice.name)?.sampleText || "안녕하세요, 유튜브 채널 미리듣기 샘플입니다.";
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

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <label className="text-xs text-white/50">속도</label>
                            <input
                              type="range"
                              min={0.7}
                              max={1.3}
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
                              const voiceName = chapterVoices[index] || '민준';
                              const text = chapter.content;
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
                                    {(["전체", "남성", "여성"] as const).map((gender) => (
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
                                  {filteredVoiceModalOptions.map((voice) => (
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
                                        className={`flex-shrink-0 w-8 h-8 rounded-full border transition ${
                                          isFavoriteVoice(voice.name)
                                            ? "border-amber-300 bg-amber-500/25 text-amber-200"
                                            : "border-white/20 bg-white/5 text-white/70 hover:border-amber-300/50"
                                        }`}
                                        title={isFavoriteVoice(voice.name) ? "즐겨찾기 해제" : "즐겨찾기 등록"}
                                      >
                                        {isFavoriteVoice(voice.name) ? "★" : "☆"}
                                      </button>
                                      <div className="flex-1 text-left min-w-0">
                                        <p className="text-base font-bold text-white group-hover:text-red-300 transition-colors">{voice.name}</p>
                                        <p className="text-xs text-white/60 mt-0.5 truncate">{stripGenderPrefix(voice.label)} · {voice.tone}</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">{voice.category}</span>
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">{voice.model}</span>
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">{resolveVoicePreset(voice)}</span>
                                          {voice.availability === "fallback" && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">
                                              자동 폴백
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </button>
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

        return (
          <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
            {/* 이미지 설정 */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-black/30 p-6">
              <h3 className="text-lg font-bold text-white mb-4">이미지 생성 설정</h3>

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
              <div className="mt-8 bg-black/30 border border-white/10 rounded-xl p-[clamp(1rem,2vw,1.4rem)]">
                <h3 className="text-red-300 font-medium mb-6 flex items-center text-xl">
                  이미지 스타일 선택
                </h3>

                {/* 인물 스타일 */}
                <div className="mb-6">
                  <div className="mb-3">
                    <h4 className="text-red-200 font-medium text-base">인물</h4>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {characterStylesOptions.map((style) => {
                      const imgUrl = getCharacterStyleImage(style);
                      return (
                        <div key={style} className="relative group/preview">
                          <button
                            onClick={() => setCharacterStyle(style)}
                            className={`relative w-full aspect-square rounded-lg font-medium text-xs transition-all duration-200 overflow-hidden ${characterStyle === style
                              ? "ring-2 ring-red-500 shadow-lg scale-[1.02]"
                              : "hover:ring-1 hover:ring-red-400"
                              }`}
                            style={{
                              backgroundImage: `url('${imgUrl}')`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                            <div className="relative h-full flex items-end p-2 text-left">
                              <div className="text-white font-semibold text-xs">{style}</div>
                            </div>
                          </button>
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 opacity-0 scale-95 group-hover/preview:opacity-100 group-hover/preview:scale-100 transition-all duration-200">
                            <div className="w-[260px] aspect-square rounded-xl overflow-hidden shadow-2xl shadow-black/70 border border-white/20 bg-black/90">
                              <img src={imgUrl} alt={style} className="w-full h-full object-cover" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {characterStyle === "custom" && (
                    <input
                      type="text"
                      value={customCharacterStyle}
                      onChange={(e) => setCustomCharacterStyle(e.target.value)}
                      placeholder="원하는 인물 스타일을 입력하세요 (예: 르네상스, 빅토리아 시대 등)"
                      className="w-full p-3 bg-black/40 border border-white/20 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors mt-3 text-white text-sm"
                    />
                  )}
                </div>

                {/* 배경/분위기 스타일 */}
                <div className="mb-6">
                  <div className="mb-3">
                    <h4 className="text-red-200 font-medium text-base">배경 스타일</h4>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {backgroundStylesOptions.map((style) => {
                      const imgUrl = getBackgroundStyleImage(style);
                      return (
                        <div key={style} className="relative group/preview">
                          <button
                            onClick={() => setBackgroundStyle(style)}
                            className={`w-full aspect-square rounded-lg text-xs font-semibold transition-all border ${backgroundStyle === style
                              ? "border-red-400 ring-2 ring-red-400/70 text-white shadow-lg"
                              : "border-white/10 text-white/80 hover:border-red-300/60"
                              } relative overflow-hidden p-0`}
                            style={{
                              backgroundImage: `url('${imgUrl}')`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }}
                          >
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                            <div className="relative h-full flex items-end p-2 text-left">
                              <div className="text-white font-semibold text-xs">{style}</div>
                            </div>
                          </button>
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 opacity-0 scale-95 group-hover/preview:opacity-100 group-hover/preview:scale-100 transition-all duration-200">
                            <div className="w-[260px] aspect-square rounded-xl overflow-hidden shadow-2xl shadow-black/70 border border-white/20 bg-black/90">
                              <img src={imgUrl} alt={style} className="w-full h-full object-cover" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {backgroundStyle === "custom" && (
                    <input
                      type="text"
                      value={customBackgroundStyle}
                      onChange={(e) => setCustomBackgroundStyle(e.target.value)}
                      placeholder="원하는 배경/분위기를 입력하세요 (예: 우주 정거장, 열대 해변 등)"
                      className="w-full p-3 bg-black/40 border border-white/20 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors mt-3 text-white text-sm"
                    />
                  )}
                </div>
              </div>

              {/* 일관성 유지 */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <h4 className="text-sm font-semibold text-white/80">일관성 유지 (선택)</h4>
                <p className="text-xs text-white/50">
                  참조 이미지를 업로드하면 해당 이미지의 스타일과 톤을 유지하며 컷을 생성합니다.
                </p>

                {!styleReferenceImage ? (
                  <div className="rounded-lg border-2 border-dashed border-red-400/50 bg-red-900/10 p-4 text-center">
                    <label className="cursor-pointer inline-flex flex-col items-center gap-1 text-red-200 hover:text-red-100">
                      <span className="text-xs font-semibold">참조 이미지 업로드</span>
                      <span className="text-[11px] text-red-200/70">클릭하여 이미지 선택</span>
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
                        <p className="mt-1 text-[11px] text-green-300">일관성 유지 적용 중</p>
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

              {/* 컷 이미지 생성 */}
              <div className="mt-8">
                <p className="text-sm text-white/60 mb-4">
                  영상 길이 {resolveRenderDurationSeconds()}초 기준으로 1분당 4컷, 총 {requiredImageCount}장을 생성합니다.
                </p>
                <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleGenerateAllCutImages}
                    disabled={isGeneratingAllCuts || Boolean(generatingImageChapter)}
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
                                <p className="mt-2 text-[11px] text-white/60">
                                  컷 {cut.localCutIndex + 1} · {cut.secondsFrom}초 ~ {cut.secondsTo}초
                                </p>
                                <input
                                  type="text"
                                  value={cutEditPrompts[cut.imageKey] || ""}
                                  onChange={(e) =>
                                    setCutEditPrompts((prev) => ({ ...prev, [cut.imageKey]: e.target.value }))
                                  }
                                  placeholder="수정 프롬프트 입력 (예: 인물 표정 더 밝게)"
                                  className="mt-2 w-full rounded-md border border-white/20 bg-black/40 px-2.5 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-red-400"
                                />
                                <div className="mt-2 grid grid-cols-3 gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateImage(cut, cutEditPrompts[cut.imageKey])}
                                    disabled={Boolean(generatingImageChapter)}
                                    className="rounded-md border border-red-400/50 bg-red-500/15 px-2 py-1.5 text-[11px] font-semibold text-red-100 hover:bg-red-500/25 disabled:opacity-50"
                                  >
                                    {isGeneratingThisCut ? "생성 중..." : cutImageSrc ? "수정 재생성" : "이미지 생성"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      cutImageSrc &&
                                      setPreviewImageModal({
                                        src: cutImageSrc,
                                        title: `챕터 ${chapter.chapterIndex + 1} · 컷 ${cut.localCutIndex + 1}`,
                                      })
                                    }
                                    disabled={!cutImageSrc}
                                    className="rounded-md border border-white/20 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
                                  >
                                    크게 보기
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveCutImage(cut)}
                                    disabled={!cutImageSrc}
                                    className="rounded-md border border-white/20 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
                                  >
                                    저장
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
          </div>
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
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
                  >
                    <div>
                      <p className="font-semibold text-white">{scene.label}</p>
                      <p className="text-sm text-white/50 truncate">{scene.desc}</p>
                    </div>
                    <span className="text-sm text-white/50">{scene.duration}</span>
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
        return (
          <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
            <div className="rounded-[clamp(1rem,2vw,1.6rem)] border border-white/10 bg-white/95 p-[clamp(1.25rem,2vw,1.8rem)] text-slate-900 shadow-[0_20px_40px_rgba(15,23,42,0.15)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-400">영상 출력</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">모든 요소를 조합해 최종 영상을 생성합니다.</h3>
                </div>
                <span className="text-sm text-slate-500">진행도 {renderingProgress}%</span>
              </div>
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {timelineScenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="min-w-[120px] rounded-xl border border-slate-200 bg-slate-50 p-2"
                  >
                    <div className="h-14 rounded-lg bg-gradient-to-br from-slate-200 to-slate-100" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">{scene.label}</p>
                    <p className="text-sm text-slate-400">{scene.duration}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  <p className="text-sm font-semibold text-slate-400">출력 요약</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>예상 길이</span>
                      <span>{renderDuration}초</span>
                    </div>
                    <div className="flex justify-between">
                      <span>구간 수</span>
                      <span>{timelineScenes.length}개</span>
                    </div>
                    <div className="flex justify-between">
                      <span>출력 형식</span>
                      <span>MP4 (1080p)</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  <p className="text-sm font-semibold text-slate-400">출력 메모</p>
                  <textarea
                    value={editNotes}
                    onChange={(event) => setEditNotes(event.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="편집 키워드, 자막 스타일 등을 기록하세요."
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" defaultChecked />
                  자막 포함
                </label>
                <button
                  type="button"
                  onClick={handleDownloadEditNotes}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  편집 노트 다운로드
                </button>
              </div>
              <div className="mt-6 h-2 w-full rounded-full bg-slate-200">
                <div
                  style={{ width: `${renderingProgress}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {renderingStatus || "출력을 시작하면 자동으로 모든 컷을 조합해 영상을 완성합니다."}
              </p>
              <button
                onClick={startRendering}
                disabled={rendering}
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(220,38,38,0.4)] disabled:opacity-60"
              >
                {rendering ? "영상 출력 시작" : "영상 출력 시작"}
              </button>
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

      <div className="relative mx-auto max-w-[min(1280px,94vw)] px-[clamp(1rem,3vw,2.5rem)] py-[clamp(2rem,4vw,3.8rem)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
        </div>

        <header className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[clamp(0.7rem,1.2vw,0.85rem)] font-semibold uppercase tracking-[0.35em] text-white/40">
              All-in-one studio
            </p>
            <h1 className="mt-3 text-[clamp(2.1rem,3.2vw,3.4rem)] font-black text-white">
              올인원 영상 제작 스튜디오
            </h1>
            <p className="mt-3 text-[clamp(0.95rem,1.6vw,1.1rem)] text-white/70 text-balance">
              필요한 단계를 쉽게 확인하고, 빠르게 영상 제작 기능을 이어서 사용할 수 있어요.
            </p>
          </div>
          <div className="grid w-full gap-2 text-xs text-white/70 sm:max-w-[520px] sm:grid-cols-3">
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(index)}
                className={`rounded-full border px-3 py-1 text-center transition-all ${index === currentStep
                  ? "border-red-400/50 bg-red-500/10 text-red-200"
                  : index < currentStep
                    ? "border-green-400/30 bg-green-500/5 text-green-200/70"
                    : "border-white/10 bg-white/5 text-white/40"
                  } hover:scale-105 active:scale-95`}
              >
                {index + 1}. {step.label}
              </button>
            ))}
          </div>
        </header>

        {/* API 키 입력 섹션 제거됨 (마이페이지로 이동) */}

        <div className="mt-[clamp(2rem,4vw,3rem)]">
          <main className="rounded-[clamp(1.2rem,2.5vw,2rem)] border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            <div className="border-b border-white/10 px-[clamp(1.5rem,3vw,2.5rem)] py-[clamp(1.1rem,2.4vw,1.8rem)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[clamp(0.6rem,1vw,0.75rem)] font-semibold uppercase tracking-[0.3em] text-white/40">
                    STEP {currentStep + 1}
                  </p>
                  <h2 className="mt-2 text-[clamp(1.6rem,2.6vw,2.2rem)] font-bold text-white">
                    {activeStep.label}
                  </h2>
                  <p className="mt-2 text-[clamp(0.9rem,1.5vw,1.05rem)] text-white/70 text-right">
                    {activeStep.description}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/70">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">Progress</p>
                  <p className="mt-2 text-lg font-semibold text-white">{progressLabel}</p>
                </div>
              </div>
            </div>

            <div className="p-[clamp(1.5rem,3vw,2.5rem)]">{renderStepContent()}</div>

            <div className="border-t border-white/10 p-[clamp(1.2rem,2.5vw,2rem)]">
              <div className="mb-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <center>
                  <ins
                    className="adsbygoogle"
                    style={{ display: "block" }}
                    data-ad-client="ca-pub-2686975437928535"
                    data-ad-slot="3672059148"
                    data-ad-format="auto"
                    data-full-width-responsive="true"
                  />
                </center>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!canGoPrev}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-base font-semibold text-white/70 transition hover:border-white/40 disabled:opacity-40 hover:scale-105 active:scale-95"
                >
                  <FiChevronLeft size={20} /> 이전 단계
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-red-500 px-8 py-3 text-base font-semibold text-white shadow-[0_10px_20px_rgba(220,38,38,0.4)] transition hover:translate-x-0.5 disabled:opacity-40 hover:scale-105 active:scale-95"
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
            <div className="absolute left-1/2 top-1/2 w-[min(96vw,1120px)] max-h-[92vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-cyan-300/50 bg-[#0f1b1d] shadow-[0_18px_55px_rgba(0,0,0,0.55)] overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-cyan-200/20 px-6 py-4">
                <h3 className="text-lg font-bold text-cyan-100">{supportErrorDialog.title}</h3>
                <button
                  type="button"
                  onClick={() => setSupportErrorDialog(null)}
                  className="rounded-full border border-cyan-200/40 px-4 py-1.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-200/10"
                >
                  닫기
                </button>
              </div>
              <div className="max-h-[calc(92vh-82px)] overflow-y-auto px-6 py-5 space-y-5">
                <div className="rounded-xl border border-cyan-200/20 bg-black/25 p-4">
                  <p className="text-sm font-semibold text-cyan-100">오류 기능</p>
                  <p className="mt-1 text-sm text-cyan-50">{supportErrorDialog.context}</p>
                </div>
                <div className="rounded-xl border border-cyan-200/20 bg-black/25 p-4">
                  <p className="text-sm font-semibold text-cyan-100">오류 메시지</p>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-6 text-cyan-50">{supportErrorDialog.message}</pre>
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


