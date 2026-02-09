
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiFileText,
  FiFilm,
  FiImage,
  FiMonitor,
  FiMic,
  FiSettings,
  FiSmartphone,
  FiTrash2,

} from "react-icons/fi";

import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";
import HomeBackButton from "../components/HomeBackButton";
import ErrorNotice from "../components/ErrorNotice";
import ApiKeyInput from "../components/ApiKeyInput";
import type { AnalysisResult, NewPlan } from "../types";
import { analyzeTranscript, generateIdeas, generateNewPlan } from "../services/geminiService";

import AdSense from "../components/AdSense";
import { ProgressTracker } from "../components/ProgressIndicator";
import UserCreditToolbar from "../components/UserCreditToolbar";

const STORAGE_KEYS = {
  title: "video_project_title",
  notes: "video_project_notes",
  scriptTitle: "video_project_script_title",
  script: "video_project_script",
  tts: "video_project_tts",
  ttsChapters: "video_project_tts_chapters",
  ttsChapterVoices: "video_project_tts_chapter_voices",
  youtubeUrl: "video_project_youtube_url",
  scriptCategory: "video_project_script_category",
  imagePrompt: "video_project_image_prompt",
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

const VIDEO_IMAGE_SEED_KEY = "video_project_image_seed_script";

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
  { name: "서연", label: "여성 대표", tone: "차분한 뉴스 톤" },
];

// 확장된 목소리 옵션 (모달용)
const allVoiceOptions = [
  { name: "민준", label: "남성 캐주얼", tone: "신뢰감 있는 다큐 스타일", category: "추천", sampleText: "오늘은 여러분께 정말 흥미로운 이야기를 들려드리려고 합니다." },
  { name: "서연", label: "여성 아나운서", tone: "차분한 뉴스 톤", category: "추천", sampleText: "지금부터 중요한 정보를 정확하게 전달해 드리겠습니다." },
  { name: "지훈", label: "남성 비즈니스", tone: "프로페셔널 프레젠테이션", category: "추천", sampleText: "오늘 발표할 내용은 우리 사업의 핵심 전략입니다." },
  { name: "유나", label: "여성 상냥", tone: "밝고 친근한 진행", category: "추천", sampleText: "안녕하세요! 오늘도 즐거운 하루 보내고 계신가요?" },
  { name: "혜진", label: "여성 중년", tone: "안정적인 라디오 톤", category: "추천", sampleText: "차분하게 핵심만 정리해서 전달드리겠습니다." },
  { name: "도현", label: "남성 내레이션", tone: "정중한 해설 톤", category: "추천", sampleText: "지금부터 핵심 내용을 차근차근 짚어보겠습니다." },

  { name: "태양", label: "남성 에너지", tone: "활기찬 운동 코치", category: "남성", sampleText: "자, 이제 시작합니다! 힘차게 따라오세요!" },
  { name: "준서", label: "남성 다큐", tone: "깊이 있는 내레이션", category: "남성", sampleText: "이 장면에서 우리는 자연의 경이로운 순간을 목격하게 됩니다." },
  { name: "동현", label: "남성 카리스마", tone: "리더십 강연 톤", category: "남성", sampleText: "성공하고 싶다면, 지금 바로 행동으로 옮겨야 합니다." },
  { name: "상호", label: "남성 중년", tone: "따뜻한 해설 톤", category: "남성", sampleText: "천천히 정리하면 결국 답이 보입니다." },
  { name: "재훈", label: "남성 젊은", tone: "경쾌한 진행", category: "남성", sampleText: "오늘 주제, 정말 재밌게 풀어보겠습니다!" },
  { name: "성민", label: "남성 시니어", tone: "묵직한 조언 톤", category: "남성", sampleText: "경험에서 나온 조언은 단순하지만 강력합니다." },

  { name: "소희", label: "여성 ASMR", tone: "부드러운 집중용 음성", category: "여성", sampleText: "편안하게 들으시면서, 천천히 따라오세요." },
  { name: "하늘", label: "여성 차분", tone: "명상 가이드 톤", category: "여성", sampleText: "깊게 숨을 들이마시고, 천천히 내쉬어 보세요." },
  { name: "수아", label: "여성 활발", tone: "쇼핑호스트 스타일", category: "여성", sampleText: "와! 이 제품 정말 대박이에요! 지금 바로 확인해보세요!" },
  { name: "예린", label: "여성 젊은", tone: "가벼운 브이로그 톤", category: "여성", sampleText: "오늘 하루 같이 가볍게 시작해볼까요?" },
  { name: "미정", label: "여성 중년", tone: "안정적 설명 톤", category: "여성", sampleText: "핵심만 간단하게 정리해 드릴게요." },
  { name: "순자", label: "여성 시니어", tone: "따뜻한 이야기 톤", category: "여성", sampleText: "옛날 이야기도 요즘엔 다 이유가 있답니다." },
];

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

const imageStyles = [
  "미니멀 애니메이션",
  "실사 느낌",
  "카툰 스타일",
  "하이퍼 리얼",
];

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
    description: "AI 보이스 선택·내레이션 저장",
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
  const [selectedCategory, setSelectedCategory] = useState(() =>
    getStoredString(STORAGE_KEYS.scriptCategory, scriptCategories[0])
  );
  const [ttsScript, setTtsScript] = useState(() =>
    getStoredString(
      STORAGE_KEYS.tts,
      "이런 위기 속에서도 기회를 잡는 방법을 지금부터 소개합니다."
    )
  );
  const [selectedVoice, setSelectedVoice] = useState(voiceOptions[0].name);
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [currentChapterForVoice, setCurrentChapterForVoice] = useState<number | null>(null);
  const [chapterVoices, setChapterVoices] = useState<Record<number, string>>(() =>
    getStoredJson(STORAGE_KEYS.ttsChapterVoices, {})
  );
  const [chapterScripts, setChapterScripts] = useState<Array<{ title: string; content: string }>>(() =>
    getStoredJson(STORAGE_KEYS.ttsChapters, [])
  );
  const [scriptLengthMinutes, setScriptLengthMinutes] = useState("8");
  const [customScriptLength, setCustomScriptLength] = useState("5");
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
    getStoredString(
      STORAGE_KEYS.imagePrompt,
      "미래 도시 배경 속 경제 그래프 앞에 서 있는 캐릭터"
    )
  );
  const [imageStyle, setImageStyle] = useState(imageStyles[0]);

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
  const [characterColorMap, setCharacterColorMap] = useState<Map<string, string>>(new Map());

  // Audio playback state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingChapter, setPlayingChapter] = useState<number | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
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
    if (!generatedPlan || chapterScripts.length > 0) return;

    const chapters: Array<{ title: string; content: string }> = [];

    if (generatedPlan.chapters && generatedPlan.chapters.length > 0) {
      generatedPlan.chapters.forEach((chapter) => {
        const lines = (chapter.script || [])
          .map((line) => `${line.character}: ${line.line}`)
          .join("\n");
        if (lines.trim()) {
          chapters.push({
            title: chapter.title || `챕터 ${chapters.length + 1}`,
            content: lines.trim(),
          });
        }
      });
    } else if (generatedPlan.scriptWithCharacters && generatedPlan.scriptWithCharacters.length > 0) {
      const scriptText = generatedPlan.scriptWithCharacters
        .map((line) => `${line.character}: ${line.line}`)
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
  useEffect(() => setStoredValue(STORAGE_KEYS.script, scriptDraft), [scriptDraft]);
  useEffect(() => setStoredValue(STORAGE_KEYS.tts, ttsScript), [ttsScript]);
  useEffect(() => setStoredJson(STORAGE_KEYS.ttsChapters, chapterScripts), [chapterScripts]);
  useEffect(() => setStoredJson(STORAGE_KEYS.ttsChapterVoices, chapterVoices), [chapterVoices]);
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
      alert('제목 형식으로 변환하려면 먼저 대본 제목을 입력해주세요.');
      return;
    }

    setIsReformattingTopic(true);
    try {
      const response = await fetch('/api/youtube_script/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      alert('주제 변환 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsReformattingTopic(false);
    }
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
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

  // 오디오 재생 함수 (간단한 미리듣기용)
  const playPreviewAudio = async (chapterIndex: number, voiceName: string, text: string) => {
    if (audioRef.current && (playingChapter === chapterIndex && playingVoice === voiceName)) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingChapter(null);
      setPlayingVoice(null);
      setIsPlayingPreview(false);
      return;
    }

    try {
      previewAbortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const requestId = ++previewRequestIdRef.current;
      setIsPlayingPreview(true);
      setPlayingChapter(chapterIndex);
      setPlayingVoice(voiceName);

      const voiceMap: Record<string, string> = {
        '민준': 'ko-KR-Standard-C',
        '지훈': 'ko-KR-Standard-B',
        '준서': 'ko-KR-Standard-D',
        '도현': 'ko-KR-Neural2-C',
        '태양': 'ko-KR-Wavenet-D',
        '동현': 'ko-KR-Standard-C',
        '상호': 'ko-KR-Standard-B',
        '재훈': 'ko-KR-Wavenet-B',
        '성민': 'ko-KR-Standard-D',

        '서연': 'ko-KR-Standard-A',
        '유나': 'ko-KR-Wavenet-C',
        '혜진': 'ko-KR-Standard-A',
        '소희': 'ko-KR-Neural2-A',
        '하늘': 'ko-KR-Wavenet-A',
        '수아': 'ko-KR-Standard-A',
        '예린': 'ko-KR-Wavenet-C',
        '미정': 'ko-KR-Standard-A',
        '순자': 'ko-KR-Standard-A',

        '수현': 'ko-KR-Standard-B',
        '지수': 'ko-KR-Standard-D',
        '하나': 'ko-KR-Wavenet-A',
        '세영': 'ko-KR-Wavenet-C',
        '해준': 'ko-KR-Wavenet-B',
        '준호': 'ko-KR-Wavenet-D',
        '하림': 'ko-KR-Neural2-A',
      };

      const googleVoice = voiceMap[voiceName] || 'ko-KR-Standard-A';
      const cacheKey = `${googleVoice}::${text}`;
      const cachedUrl = previewCacheRef.current.get(cacheKey);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('로그인이 필요합니다.');
        setIsPlayingPreview(false);
        setPlayingChapter(null);
        setPlayingVoice(null);
        return;
      }

      let audioUrl = cachedUrl || "";

      if (!audioUrl) {
        const controller = new AbortController();
        previewAbortRef.current = controller;

        const response = await fetch('/api/youtube_TTS/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            text: text,
            voice: googleVoice,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[TTS] API 오류:', errorText);
          throw new Error(`음성 생성 실패: ${response.status}`);
        }

        const data = await response.json();
        if (!data.audioContent) {
          throw new Error('오디오 데이터가 없습니다');
        }

        const binaryString = atob(data.audioContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        audioUrl = URL.createObjectURL(audioBlob);

        previewCacheRef.current.set(cacheKey, audioUrl);
        if (previewCacheRef.current.size > 8) {
          const firstKey = previewCacheRef.current.keys().next().value;
          const oldUrl = previewCacheRef.current.get(firstKey);
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          previewCacheRef.current.delete(firstKey);
        }
      }

      if (requestId !== previewRequestIdRef.current) {
        return;
      }

      audioRef.current = new Audio(audioUrl);
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
      alert(`음성 재생에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      setIsPlayingPreview(false);
      setPlayingChapter(null);
      setPlayingVoice(null);
    }
  };

  const stopAudio = () => {
    previewAbortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
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

  const canGoPrev = currentStep > 0;

  // 각 단계별로 다음 단계 진행 가능 여부 체크
  const canGoNext = (() => {
    if (currentStep >= steps.length - 1) return false;

    const currentStepId = steps[currentStep].id;

    // script 단계: 대본이 입력되어 있으면 다음으로 진행 가능
    if (currentStepId === 'script') {
      return scriptDraft.trim().length > 0;
    }

    // 나머지 단계는 항상 진행 가능
    return true;
  })();

  const handlePrev = () => {
    if (!canGoPrev) return;
    goToStep(currentStep - 1);
  };

  const handleNext = () => {
    if (!canGoNext) return;

    // Step 2 (대본 작성)에서 Step 3 (음성 생성)으로 이동할 때 대본 자동 입력
    if (currentStep === 1 && generatedPlan) {
      const chapters: Array<{ title: string; content: string }> = [];

      if (generatedPlan.chapters && generatedPlan.chapters.length > 0) {
        // chapters 형식 - 챕터별로 분리
        generatedPlan.chapters.forEach((chapter) => {
          const lines = (chapter.script || [])
            .map((line) => `${line.character}: ${line.line}`)
            .join("\n");
          if (lines.trim()) {
            chapters.push({
              title: chapter.title || `챕터 ${chapters.length + 1}`,
              content: lines.trim()
            });
          }
        });
      } else if (generatedPlan.scriptWithCharacters && generatedPlan.scriptWithCharacters.length > 0) {
        // scriptWithCharacters 형식 - 하나의 챕터로
        const scriptText = generatedPlan.scriptWithCharacters
          .map((line) => `${line.character}: ${line.line}`)
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
          "⏱️ 분석 작업이 시간 초과되었습니다.\n\n" +
          `대본 길이: ${scriptLength.toLocaleString()}자\n\n` +
          "긴 대본은 처리 시간이 오래 걸립니다.\n" +
          "💡 해결 방법:\n" +
          "• 5분 후 다시 시도해 주세요 (서버가 일시적으로 바쁠 수 있습니다)\n" +
          "• 대본을 2-3개로 나눠서 분석한 후 결합하는 것을 권장합니다\n" +
          "• 다시 시도 버튼을 눌러주세요\n\n" +
          "문제가 계속되면 관리자에게 문의해 주세요."
        );
      } else if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
        setScriptError(
          "🌐 네트워크 오류가 발생했습니다.\n\n" +
          "• 인터넷 연결을 확인해 주세요.\n" +
          "• 잠시 후 다시 시도해 주세요.\n\n" +
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
        selectedCategory
      );

      // Step 3: AI 응답 정제 (마크다운 기호 제거)
      setGenerateProgress(prev => ({ ...prev, currentStep: 2 }));
      await new Promise(resolve => setTimeout(resolve, 300));

      // 대본 내용에서 마크다운 기호 제거
      const cleanPlan = cleanAIResponse(plan);

      setGeneratedPlan(cleanPlan);

      // 대본 생성 완료 후 결과 단계로 자동 이동
      setScriptSubStep(3);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "대본 생성에 실패했습니다.";

      // Check if it's a timeout error
      if (errorMessage.includes("FUNCTION_INVOCATION_TIMEOUT") || errorMessage.includes("timeout")) {
        setScriptError(
          "⏱️ 대본 생성이 시간 초과되었습니다.\n\n" +
          "요청한 대본이 너무 길거나 서버가 응답하지 않았습니다.\n" +
          "• 대본 길이를 줄여서 다시 시도해 주세요.\n" +
          "• 잠시 후 다시 시도해 주세요.\n\n" +
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
        title: cleanText(chapter.title || ''),
        purpose: cleanText(chapter.purpose || ''),
        script: chapter.script?.map(line => ({
          ...line,
          character: cleanText(line.character),
          line: cleanText(line.line),
        })),
      })),
      scriptWithCharacters: plan.scriptWithCharacters?.map(line => ({
        ...line,
        character: cleanText(line.character),
        line: cleanText(line.line),
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

    let text = `${chapter.title}\n${"=".repeat(50)}\n\n`;
    chapter.script.forEach((item) => {
      if (item.timestamp) {
        text += `[${item.timestamp}] ${item.character}: ${item.line}\n\n`;
      } else {
        text += `${item.character}: ${item.line}\n\n`;
      }
    });
    return text;
  };

  // 전체 챕터 대본 다운로드 포맷
  const formatAllChaptersToText = (chapters: any[]): string => {
    return chapters
      .filter((chapter) => chapter.script)
      .map((chapter, index) => {
        let text = `챕터 ${index + 1}: ${chapter.title}\n${"=".repeat(50)}\n\n`;
        chapter.script.forEach((item: any) => {
          if (item.timestamp) {
            text += `[${item.timestamp}] ${item.character}: ${item.line}\n\n`;
          } else {
            text += `${item.character}: ${item.line}\n\n`;
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
            .map((line) => `${line.character}: ${line.line}`)
            .join("\n");
          return `# 챕터 ${index + 1}. ${chapter.title}\n${lines || chapter.purpose}`;
        })
        .join("\n\n");
    }
    if (plan.scriptWithCharacters && plan.scriptWithCharacters.length > 0) {
      return plan.scriptWithCharacters
        .map((line) => `${line.character}: ${line.line}`)
        .join("\n");
    }
    if (plan.scriptOutline && plan.scriptOutline.length > 0) {
      return plan.scriptOutline
        .map((stage) => `[${stage.stage}]\n${stage.details}`)
        .join("\n\n");
    }
    return "";
  };

  const timelineScenes = useMemo(() => {
    const lines = scriptDraft
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) {
      return [
        { id: 0, label: "도입", duration: "4초", desc: "주제 소개" },
        { id: 1, label: "전개", duration: "6초", desc: "문제점 언급" },
        { id: 2, label: "해결", duration: "5초", desc: "해결책/사례" },
      ];
    }
    return lines.slice(0, 4).map((line, index) => ({
      id: index,
      label: `컷 ${index + 1}`,
      duration: `${3 + index}s`,
      desc: line,
    }));
  }, [scriptDraft]);

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
          <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
            <div className="rounded-[clamp(1rem,2vw,1.6rem)] border border-white/10 bg-black/40 p-[clamp(1.25rem,2vw,1.8rem)] shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-white">{currentSubStep.title}</h3>
                  <p className="mt-2 text-sm text-white/60">
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
                        🏷️ 대본 제목 (선택사항)
                      </label>
                      <input
                        type="text"
                        value={scriptTitle}
                        onChange={(event) => setScriptTitle(event.target.value)}
                        className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="예: 경제 위기 속 재테크 주식 투자 전략"
                      />
                      <p className="text-xs text-white/50">
                        제목을 입력하면 AI 추천 주제가 비슷한 형식으로 생성됩니다
                      </p>
                    </div>

                    {/* 유튜브 URL 입력 */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/80">
                        🔗 유튜브 URL 입력 (선택사항)
                      </label>
                      <input
                        type="text"
                        value={youtubeUrl}
                        onChange={(event) => setYoutubeUrl(event.target.value)}
                        className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                      <p className="text-xs text-white/50">
                        대본을 직접 입력해 주세요. (대본 추출 기능은 제거되었습니다)
                      </p>
                    </div>

                    {/* 카테고리 선택 */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/80">
                        🗂️ 카테고리 선택
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {scriptCategories.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setSelectedCategory(category)}
                            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${selectedCategory === category
                              ? "border-red-400 bg-red-500/15 text-red-200"
                              : "border-white/15 bg-black/30 text-white/70 hover:border-white/30"
                              }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 대본 내용 입력 */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/80">
                        📝 대본 내용
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
                          <span className="text-lg">ℹ️</span>
                          <div>
                            <p className="font-semibold">긴 대본 분석 안내</p>
                            <p className="text-xs mt-1 opacity-80">
                              현재: {scriptDraft.length.toLocaleString()}자
                            </p>
                            <p className="text-xs mt-1 opacity-80">
                              • 긴 대본은 분석에 20-30초 정도 소요될 수 있습니다
                            </p>
                            <p className="text-xs opacity-80">
                              • 타임아웃 발생 시 다시 시도하거나 대본을 나눠서 분석하세요
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 하위 단계 이동 버튼 */}
                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                      <div className="w-[120px]"></div>
                      <button
                        type="button"
                        onClick={() => setScriptSubStep(1)}
                        disabled={!scriptDraft.trim()}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold shadow-lg hover:from-orange-500 hover:to-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        다음 단계 (대본 분석) <FiChevronRight />
                      </button>
                    </div>
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
                          className="w-full rounded-full bg-gradient-to-r from-orange-600 to-red-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(251,146,60,0.4)] hover:from-orange-500 hover:to-red-500 transition-all disabled:opacity-60"
                        >
                          {isAnalyzingScript ? "주제 추천 준비 중..." : "빠르게 주제 추천"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAnalyzeScript({ autoAdvance: false, showDetails: true })}
                          disabled={isAnalyzingScript || !isScriptStepReady(0)}
                          className="w-full rounded-full border border-white/20 bg-black/40 px-5 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 transition-all disabled:opacity-60"
                        >
                          {isAnalyzingScript ? "구조 분석 중..." : "대본 구조 분석 보기"}
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
                              <span className="text-red-400">📋</span>
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

                      {/* 하위 단계 이동 버튼 */}
                      {scriptAnalysis && (
                        <div className="flex justify-between items-center pt-4 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => setScriptSubStep(0)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white/70 hover:bg-white/10 transition-all"
                          >
                            <FiChevronLeft /> 이전 (대본 입력)
                          </button>
                          <button
                            type="button"
                            onClick={() => setScriptSubStep(2)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold shadow-lg hover:from-orange-500 hover:to-red-500 transition-all"
                          >
                            다음 단계 (주제 선택) <FiChevronRight />
                          </button>
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
                            <span className="text-purple-400">⏱️</span>
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
                                ? "border-purple-400 bg-purple-500/15 text-purple-200"
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
                              className="w-32 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="분"
                            />
                            <span className="text-sm text-white/60">분</span>
                          </div>
                        )}
                        <p className="text-sm text-white/50 mt-2">
                          선택한 길이: <span className="font-semibold text-purple-300">{formatScriptLengthLabel()}</span>
                        </p>
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
                              <span className="text-blue-400">💡</span>
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
                              <span>✏️</span>
                              또는 직접 주제 입력
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={selectedTopic}
                                onChange={(e) => setSelectedTopic(e.target.value)}
                                placeholder="원하는 주제를 직접 입력하세요 (예: 경제 위기 속에서 살아남는 방법)"
                                className="flex-1 rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                onClick={handleReformatTopic}
                                disabled={isReformattingTopic || !selectedTopic.trim() || !scriptTitle.trim()}
                                className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
                                title="대본 제목 형식으로 변환"
                              >
                                {isReformattingTopic ? '변환 중...' : '형식 변환'}
                              </button>
                            </div>
                            {scriptTitle.trim() && (
                              <p className="text-xs text-white/50">
                                '{scriptTitle}' 형식으로 변환됩니다
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                          <div className="mb-4 pb-3 border-b border-white/10">
                            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                              <span className="text-blue-400">💡</span>
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
                                  ? "border-red-400 bg-gradient-to-r from-red-500/20 to-orange-500/20 text-white shadow-lg"
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
                              <span>✏️</span>
                              또는 직접 주제 입력
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={selectedTopic && !scriptIdeas.includes(selectedTopic) ? selectedTopic : ''}
                                onChange={(e) => setSelectedTopic(e.target.value)}
                                placeholder="원하는 주제를 직접 입력하세요 (예: 경제 위기 속에서 살아남는 방법)"
                                className="flex-1 rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                onClick={handleReformatTopic}
                                disabled={isReformattingTopic || !selectedTopic.trim() || !scriptTitle.trim()}
                                className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
                                title="대본 제목 형식으로 변환"
                              >
                                {isReformattingTopic ? '변환 중...' : '형식 변환'}
                              </button>
                            </div>
                            {scriptTitle.trim() && (
                              <p className="text-xs text-white/50">
                                '{scriptTitle}' 형식으로 변환됩니다
                              </p>
                            )}
                            {selectedTopic && !scriptIdeas.includes(selectedTopic) && (
                              <p className="text-xs text-blue-300 flex items-center gap-1">
                                <span>✓</span>
                                직접 입력한 주제로 대본을 작성합니다
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 하위 단계 이동 버튼 */}
                    <div className="space-y-3">
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

                      <div className="flex justify-between items-center pt-4 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setScriptSubStep(1)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white/70 hover:bg-white/10 transition-all"
                        >
                          <FiChevronLeft /> 이전 (대본 분석)
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateScript}
                          disabled={isGeneratingScript || !isScriptStepReady(2)}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold shadow-lg hover:from-red-500 hover:to-red-400 transition-all disabled:opacity-50"
                        >
                          {isGeneratingScript ? "대본 작성 중..." : "대본 생성하기"} <FiChevronRight />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Step 3: 대본 생성 결과 */}
                {scriptSubStep === 3 && generatedPlan && (
                  <>
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="mb-4 pb-3 border-b border-white/10">
                          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                            <span className="text-green-400">✨</span>
                            생성된 대본
                          </h3>
                          <p className="text-xs text-white/50">
                            AI가 선택한 주제로 작성한 완성된 대본입니다 ({generatedPlan.chapters?.length || 0}개 챕터)
                          </p>
                        </div>
                        {generatedPlan.chapters && generatedPlan.chapters.length > 0 ? (
                          <>
                            <div className="space-y-4">
                              {generatedPlan.chapters.map((chapter, index) => (
                                <div
                                  key={chapter.id}
                                  className="rounded-xl border border-white/10 bg-black/30 p-4"
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                                      <span className="text-red-400">📖</span>
                                      챕터 {index + 1}. {chapter.title}
                                    </h4>
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
                                            {line.imagePrompt && (
                                              <div className="mt-3 ml-[108px] p-3 rounded-md border bg-zinc-950 border-zinc-700/50">
                                                <p className="text-xs font-semibold text-neutral-400 mb-1">
                                                  🎨 이미지 생성 프롬프트
                                                </p>
                                                <p className="text-sm text-neutral-300 font-mono">
                                                  {line.imagePrompt}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>

                                      {/* 챕터별 다운로드 버튼 */}
                                      <div className="mt-4 pt-4 border-t border-white/10 flex gap-3">
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
                                          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
                                        >
                                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                          </svg>
                                          📜 대본 다운로드
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* 전체 대본 다운로드 버튼 */}
                            <div className="mt-4 pt-4 border-t border-white/10">
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
                                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold rounded-lg transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                📚 전체 대본 다운로드
                              </button>
                            </div>
                          </>
                        ) : generatedPlan.scriptWithCharacters && generatedPlan.scriptWithCharacters.length > 0 ? (
                          <>
                            <div className="mb-3">
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
                                    {line.imagePrompt && (
                                      <div className="mt-3 ml-[108px] p-3 rounded-md border bg-zinc-950 border-zinc-700/50">
                                        <p className="text-xs font-semibold text-neutral-400 mb-1">
                                          🎨 이미지 생성 프롬프트
                                        </p>
                                        <p className="text-sm text-neutral-300 font-mono">
                                          {line.imagePrompt}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 전체 대본 다운로드 버튼 */}
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <button
                                onClick={() => {
                                  if (!generatedPlan.scriptWithCharacters || generatedPlan.scriptWithCharacters.length === 0) {
                                    alert("다운로드할 대본이 없습니다.");
                                    return;
                                  }

                                  const text = generatedPlan.scriptWithCharacters
                                    .map((line) => {
                                      let result = `${line.character}: ${line.line}`;
                                      if (line.imagePrompt) {
                                        result += `\n[이미지 프롬프트] ${line.imagePrompt}`;
                                      }
                                      return result;
                                    })
                                    .join("\n\n");

                                  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = "script.txt";
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold rounded-lg transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                📚 대본 다운로드
                              </button>
                            </div>
                          </>
                        ) : generatedPlan.scriptOutline && generatedPlan.scriptOutline.length > 0 ? (
                          <div className="space-y-3">
                            {generatedPlan.scriptOutline.map((stage, index) => (
                              <div
                                key={`outline-${index}`}
                                className="rounded-xl border border-white/10 bg-black/30 p-4"
                              >
                                <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                                  <span className="text-red-400">📋</span>
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

                    {/* 하위 단계 이동 버튼 */}
                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setScriptSubStep(2)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white/70 hover:bg-white/10 transition-all"
                      >
                        <FiChevronLeft /> 이전 (주제 선택)
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        disabled={!canGoNext}
                        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-red-500 px-6 py-2 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(220,38,38,0.4)] disabled:opacity-60"
                      >
                        다음 단계 (음성 생성) <FiChevronRight />
                      </button>
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
                  <p className="text-sm font-semibold text-white/60">스크립트 & AI 보이스</p>
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
                  {currentStep === steps.findIndex((step) => step.id === "tts") && chapterScripts.length > 0 && (
                    <div className="fixed right-6 top-1/2 z-[80] hidden -translate-y-1/2 lg:flex flex-col items-end gap-3">
                      <div className="rounded-2xl border border-white/15 bg-gradient-to-b from-black/80 to-black/50 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
                        <p className="text-xs text-white/50">현재 선택</p>
                        <p className="text-sm font-semibold text-white">
                          {currentChapterForVoice !== null
                            ? chapterScripts[currentChapterForVoice]?.title || `챕터 ${currentChapterForVoice + 1}`
                            : "챕터 선택 필요"}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const index = currentChapterForVoice ?? 0;
                            setCurrentChapterForVoice(index);
                            setShowVoiceModal(true);
                          }}
                          className="mt-3 inline-flex items-center gap-2 rounded-full border border-orange-400/60 bg-orange-500/20 px-4 py-2 text-sm font-semibold text-orange-100 hover:bg-orange-500/30 transition"
                        >
                          ✨ 더 많은 TTS
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                    <span className="text-sm font-semibold text-white/70">전체 목소리 적용</span>
                    <select
                      className="rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-red-500"
                      value=""
                      onChange={(e) => applyVoiceToAllChapters(e.target.value)}
                    >
                      <option value="" disabled>목소리 선택</option>
                      <optgroup label="👨 남성">
                        {allVoiceOptions.filter(v => v.category === "남성" || (v.category === "추천" && ["민준", "지훈", "도현", "태양", "준서", "동현", "상호", "재훈", "성민"].includes(v.name))).map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name} · {voice.label}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="👩 여성">
                        {allVoiceOptions.filter(v => v.category === "여성" || (v.category === "추천" && ["서연", "유나", "혜진"].includes(v.name))).map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name} · {voice.label}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  {chapterScripts.map((chapter, index) => (
                    <div key={index} className="relative rounded-2xl border border-white/10 bg-black/30 p-5 overflow-visible">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                          <span className="text-red-400">🎙️</span>
                          {chapter.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-orange-400 font-semibold mr-3">
                            {chapterVoices[index] || voiceOptions[0].name}
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
                        <div className="text-sm font-semibold text-white/60">AI 보이스 선택</div>
                        <div className="flex flex-wrap gap-2">
                          {voiceOptions.map((voice) => (
                            <div key={voice.name} className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentChapterForVoice(index);
                                  setChapterVoices({ ...chapterVoices, [index]: voice.name });
                                }}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${(chapterVoices[index] || voiceOptions[0].name) === voice.name
                                  ? "border-red-400 bg-gradient-to-r from-red-500/30 to-orange-500/30 text-red-200 shadow-lg"
                                  : "border-white/20 bg-black/40 text-white/70 hover:border-red-400/50 hover:bg-red-500/10"
                                  }`}
                              >
                                {voice.name}
                                <span className="text-xs ml-1 opacity-70">· {voice.label}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentChapterForVoice(index);
                                  const sampleText = allVoiceOptions.find(v => v.name === voice.name)?.sampleText || "안녕하세요. 샘플 음성입니다.";
                                  playPreviewAudio(index, voice.name, sampleText);
                                }}
                                disabled={isPlayingPreview && playingChapter === index && playingVoice === voice.name}
                                className={`p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${playingChapter === index && playingVoice === voice.name
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
                              setShowVoiceModal(true);
                            }}
                            className="px-4 py-2 rounded-lg border border-orange-400/50 bg-orange-500/10 text-orange-300 text-sm font-medium hover:bg-orange-500/20 transition-all"
                          >
                            ✨ 더 많은 TTS
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
                            disabled={isPlayingPreview && playingChapter === index}
                            className={`px-4 py-2 rounded-full text-white text-sm font-semibold shadow-lg transition-all flex items-center gap-2 ${playingChapter === index
                              ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500'
                              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                            ✨ 음성 생성
                          </button>
                        </div>
                      </div>

                      {/* 더 많은 TTS 목소리 선택 모달 - 오른쪽 사이드바 */}
                      {showVoiceModal && currentChapterForVoice === index && (
                        <div className="fixed inset-0 z-[9999] pointer-events-none">
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={() => setShowVoiceModal(false)} />
                          <div className="absolute top-0 right-0 h-full w-[90%] max-w-[450px] bg-gradient-to-br from-zinc-900 to-zinc-800 border-l border-white/20 shadow-2xl overflow-y-auto pointer-events-auto animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
                            <div className="sticky top-0 bg-gradient-to-br from-zinc-900 to-zinc-800 border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
                              <div>
                                <h3 className="text-xl font-bold text-white">🎙️ AI 보이스 선택</h3>
                                <p className="text-xs text-white/60 mt-1">{chapter.title}</p>
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

                            <div className="p-6">
                              {/* 추천 목소리 */}
                              <div className="mb-6">
                                <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                                  <span className="text-yellow-400">⭐</span>
                                  추천 목소리
                                </h4>
                                <div className="space-y-2">
                                  {allVoiceOptions.filter(v => v.category === "추천").map((voice) => (
                                    <button
                                      key={voice.name}
                                      onClick={() => {
                                        if (currentChapterForVoice !== null) {
                                          setChapterVoices({ ...chapterVoices, [currentChapterForVoice]: voice.name });
                                          playPreviewAudio(currentChapterForVoice, voice.name, voice.sampleText);
                                        }
                                        setShowVoiceModal(false);
                                      }}
                                      className="w-full rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 hover:from-red-500/20 hover:to-orange-500/10 hover:border-red-400/50 transition-all group p-3 flex items-center gap-3"
                                    >
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (currentChapterForVoice !== null) {
                                            playPreviewAudio(currentChapterForVoice, voice.name, voice.sampleText);
                                          }
                                        }}
                                        disabled={isPlayingPreview && playingChapter === currentChapterForVoice && playingVoice === voice.name}
                                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${playingChapter === currentChapterForVoice && playingVoice === voice.name
                                          ? 'bg-red-500 shadow-lg'
                                          : 'bg-white/10 hover:bg-red-500/50'
                                          }`}
                                        title={playingChapter === currentChapterForVoice && playingVoice === voice.name ? '정지' : '미리듣기'}
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
                                      <div className="flex-1 text-left">
                                        <p className="text-base font-bold text-white group-hover:text-red-300 transition-colors">{voice.name}</p>
                                        <p className="text-xs text-white/60 mt-0.5">{voice.label} · {voice.tone}</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* 남성 목소리 */}
                              <div className="mb-6">
                                <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                                  <span className="text-blue-400">👨</span>
                                  남성 목소리
                                </h4>
                                <div className="space-y-2">
                                  {allVoiceOptions.filter(v => v.category === "남성").map((voice) => (
                                    <button
                                      key={voice.name}
                                      onClick={() => {
                                        if (currentChapterForVoice !== null) {
                                          setChapterVoices({ ...chapterVoices, [currentChapterForVoice]: voice.name });
                                          playPreviewAudio(currentChapterForVoice, voice.name, voice.sampleText);
                                        }
                                        setShowVoiceModal(false);
                                      }}
                                      className="w-full rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 hover:from-blue-500/20 hover:to-cyan-500/10 hover:border-blue-400/50 transition-all group p-3 flex items-center gap-3"
                                    >
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (currentChapterForVoice !== null) {
                                            playPreviewAudio(currentChapterForVoice, voice.name, voice.sampleText);
                                          }
                                        }}
                                        disabled={isPlayingPreview && playingChapter === currentChapterForVoice && playingVoice === voice.name}
                                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${playingChapter === currentChapterForVoice && playingVoice === voice.name
                                          ? 'bg-blue-500 shadow-lg'
                                          : 'bg-white/10 hover:bg-blue-500/50'
                                          }`}
                                        title={playingChapter === currentChapterForVoice && playingVoice === voice.name ? '정지' : '미리듣기'}
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
                                      <div className="flex-1 text-left">
                                        <p className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">{voice.name}</p>
                                        <p className="text-xs text-white/60 mt-0.5">{voice.label} · {voice.tone}</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* 여성 목소리 */}
                              <div>
                                <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                                  <span className="text-pink-400">👩</span>
                                  여성 목소리
                                </h4>
                                <div className="space-y-2">
                                  {allVoiceOptions.filter(v => v.category === "여성").map((voice) => (
                                    <button
                                      key={voice.name}
                                      onClick={() => {
                                        if (currentChapterForVoice !== null) {
                                          setChapterVoices({ ...chapterVoices, [currentChapterForVoice]: voice.name });
                                          playPreviewAudio(currentChapterForVoice, voice.name, voice.sampleText);
                                        }
                                        setShowVoiceModal(false);
                                      }}
                                      className="w-full rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 hover:from-pink-500/20 hover:to-rose-500/10 hover:border-pink-400/50 transition-all group p-3 flex items-center gap-3"
                                    >
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (currentChapterForVoice !== null) {
                                            playPreviewAudio(currentChapterForVoice, voice.name, voice.sampleText);
                                          }
                                        }}
                                        disabled={isPlayingPreview && playingChapter === currentChapterForVoice && playingVoice === voice.name}
                                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${playingChapter === currentChapterForVoice && playingVoice === voice.name
                                          ? 'bg-pink-500 shadow-lg'
                                          : 'bg-white/10 hover:bg-pink-500/50'
                                          }`}
                                        title={playingChapter === currentChapterForVoice && playingVoice === voice.name ? '정지' : '미리듣기'}
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
                                      <div className="flex-1 text-left">
                                        <p className="text-base font-bold text-white group-hover:text-pink-300 transition-colors">{voice.name}</p>
                                        <p className="text-xs text-white/60 mt-0.5">{voice.label} · {voice.tone}</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
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
        return (
          <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/60 mb-4">
              <span>이미지 생성 화면에서 스토리보드를 바로 만들 수 있습니다.</span>
              <a
                href="/image?no_ads=true"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-red-500/30 px-4 py-1 text-sm font-semibold text-red-300 hover:border-red-400"
              >
                새 창에서 열기
              </a>
            </div>
            <div className="overflow-hidden rounded-[clamp(1rem,2vw,1.5rem)] border border-white/20 bg-black/40">
              <iframe
                title="이미지 생성"
                src="/image?no_ads=true"
                className="h-[clamp(600px,72vh,800px)] w-full"
                loading="lazy"
              />
            </div>
          </div>
        );
      }
      case "generate": {
        return (
          <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
            <div className="rounded-[clamp(1rem,2vw,1.6rem)] border border-white/10 bg-black/40 p-[clamp(2rem,4vw,3rem)] text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/5 text-4xl">
                🚧
              </div>
              <h3 className="text-2xl font-bold text-white">영상 생성 기능 준비 중</h3>
              <p className="mt-4 text-white/60 text-lg leading-relaxed">
                현재 AI 영상 생성 단계는 <span className="text-red-400 font-semibold">크레딧 시스템</span>과 함께<br />
                추후 업데이트될 예정입니다.
              </p>
              <p className="mt-2 text-white/40 text-sm">
                지금은 바로 다음 단계인 '영상 편집'으로 이동하여 작업을 계속하실 수 있습니다.
              </p>

              <div className="mt-10">
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-red-500 px-8 py-3 text-base font-semibold text-white shadow-lg hover:from-red-500 hover:to-red-400 transition-all hover:scale-105 active:scale-95"
                >
                  영상 편집 단계로 이동 <FiChevronRight />
                </button>
              </div>
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
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400"
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
                {rendering ? "출력 중..." : "영상 출력 시작"}
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,76,76,0.18),_transparent_48%),radial-gradient(circle_at_80%_10%,_rgba(251,146,60,0.18),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(120,55,255,0.12),_transparent_50%)]" />
      <div className="absolute -top-40 -left-28 h-[clamp(260px,40vw,460px)] w-[clamp(260px,40vw,460px)] rounded-full bg-gradient-to-br from-red-600/40 via-orange-500/20 to-transparent blur-3xl" />
      <div className="absolute -bottom-32 -right-28 h-[clamp(240px,36vw,420px)] w-[clamp(240px,36vw,420px)] rounded-full bg-gradient-to-tr from-rose-400/30 via-purple-500/10 to-transparent blur-3xl" />

      <div className="absolute top-0 right-0 p-4 sm:p-6 flex gap-3 z-50 items-center">
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-all flex items-center gap-2"
          title="모든 작업 내용 초기화"
        >
          <FiTrash2 size={16} />
          초기화
        </button>
        <UserCreditToolbar user={user} onLogout={handleLogout} tone="red" />
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
              <div
                key={step.id}
                className={`rounded-full border px-3 py-1 text-center transition-all ${index === currentStep
                  ? "border-red-400/50 bg-red-500/10 text-red-200"
                  : index < currentStep
                    ? "border-green-400/30 bg-green-500/5 text-green-200/70"
                    : "border-white/10 bg-white/5 text-white/40"
                  }`}
              >
                {index + 1}. {step.label}
              </div>
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
                  <p className="mt-2 text-[clamp(0.9rem,1.5vw,1.05rem)] text-white/70">
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

            {/* script 단계는 하위 단계별 네비게이션을 사용하므로 전체 네비게이션 숨김 */}
            {steps[currentStep].id !== "script" && (
              <div className="border-t border-white/10 p-[clamp(1.2rem,2.5vw,2rem)]">
                <AdSense adSlot="3672059148" className="mb-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3" />
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
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default VideoPage;

