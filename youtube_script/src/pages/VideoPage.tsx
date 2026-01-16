
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
  FiUpload,
} from "react-icons/fi";
import JSZip from "jszip";
import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";
import UserCreditToolbar from "../components/UserCreditToolbar";
import HomeBackButton from "../components/HomeBackButton";
import type { AnalysisResult, NewPlan } from "../types";
import { analyzeTranscript, generateIdeas, generateNewPlan } from "../services/geminiService";
import { generateVideo } from "../services/videoService";
import AdSense from "../components/AdSense";

const STORAGE_KEYS = {
  title: "video_project_title",
  notes: "video_project_notes",
  script: "video_project_script",
  tts: "video_project_tts",
  imagePrompt: "video_project_image_prompt",
  renderDuration: "video_project_render_duration",
  renderRatio: "video_project_render_ratio",
  renderFps: "video_project_render_fps",
  renderNotes: "video_project_render_notes",
  editNotes: "video_project_edit_notes",
  format: "video_project_format",
  step: "video_project_step",
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
  { name: "민준", label: "남성 캐주얼", tone: "신뢰감 있는 다큐 스타일" },
  { name: "서연", label: "여성 아나운서", tone: "차분한 뉴스 톤" },
  { name: "소희", label: "여성 ASMR", tone: "부드러운 집중용 음성" },
];

const imageStyles = [
  "미니멀 애니메이션",
  "실사 느낌",
  "카툰 스타일",
  "하이퍼 리얼",
];

const SCRIPT_USAGE_GUIDE =
  "대본 생성 사용법\n1. 현재 대본의 흐름을 그대로 붙여 넣기\n2. 영상 길이를 선택해 새 대본의 분량 설정\n3. 추천 주제 중 하나를 골라 새 대본 생성";
const LEGACY_SAMPLE =
  "[오프닝]\n환율 1500원 시대가 열렸습니다.\n[중간]\n실물 가격이 천정부지로...";

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
    getStoredString(
      STORAGE_KEYS.script,
      SCRIPT_USAGE_GUIDE
    )
  );
  const [ttsScript, setTtsScript] = useState(() =>
    getStoredString(
      STORAGE_KEYS.tts,
      "이런 위기 속에서도 기회를 잡는 방법을 지금부터 소개합니다."
    )
  );
  const [selectedVoice, setSelectedVoice] = useState(voiceOptions[0].name);
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [scriptFlowStep, setScriptFlowStep] = useState(0);
  const [scriptLengthMinutes, setScriptLengthMinutes] = useState("3");
  const [scriptAnalysis, setScriptAnalysis] = useState<AnalysisResult | null>(null);
  const [scriptIdeas, setScriptIdeas] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState<NewPlan | null>(null);
  const [scriptError, setScriptError] = useState("");
  const [isAnalyzingScript, setIsAnalyzingScript] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
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
  const [imageCount, setImageCount] = useState(4);
  const [imagePreviews, setImagePreviews] = useState<
    { id: number; title: string; hint: string; duration: string }[]
  >([]);
  const [renderDuration, setRenderDuration] = useState(() =>
    getStoredString(STORAGE_KEYS.renderDuration, "60")
  );
  const [renderRatio, setRenderRatio] = useState(() =>
    getStoredString(STORAGE_KEYS.renderRatio, "16:9")
  );
  const [renderFps, setRenderFps] = useState(() =>
    getStoredString(STORAGE_KEYS.renderFps, "30")
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
  const [assetFiles, setAssetFiles] = useState<File[]>([]);
  const [isPackaging, setIsPackaging] = useState(false);
  
  // Video Generation State
  const [videoPrompt, setVideoPrompt] = useState("");
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderingStatus, setRenderingStatus] = useState<string | null>(null);
  const [renderingProgress, setRenderingProgress] = useState(0);
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const progressTimerRef = useRef<number | null>(null);

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

  useEffect(() => setStoredValue(STORAGE_KEYS.title, projectTitle), [projectTitle]);
  useEffect(() => setStoredValue(STORAGE_KEYS.notes, projectNotes), [projectNotes]);
  useEffect(() => setStoredValue(STORAGE_KEYS.script, scriptDraft), [scriptDraft]);
  useEffect(() => setStoredValue(STORAGE_KEYS.tts, ttsScript), [ttsScript]);
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
  useEffect(() => setStoredValue(STORAGE_KEYS.renderNotes, renderNotes), [renderNotes]);
  useEffect(() => setStoredValue(STORAGE_KEYS.editNotes, editNotes), [editNotes]);
  useEffect(() => setStoredValue(STORAGE_KEYS.format, videoFormat), [videoFormat]);
  useEffect(() => setStoredValue(STORAGE_KEYS.step, String(currentStep)), [currentStep]);

  useEffect(() => {
    const trimmed = scriptDraft.trim();
    if (trimmed === LEGACY_SAMPLE.trim() || trimmed.includes("환율 1500원 시대")) {
      setScriptDraft(SCRIPT_USAGE_GUIDE);
    }
  }, [scriptDraft]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim() && assetFiles.length === 0) {
      alert("프롬프트나 참조 이미지가 필요합니다.");
      return;
    }

    setIsGeneratingVideo(true);
    setGeneratedVideoUrl(null);

    try {
      // Use the first image as reference if available
      let imageBase64: string | undefined;
      const imageFile = assetFiles.find(f => f.type.startsWith('image/'));
      if (imageFile) {
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve) => {
          reader.onload = (e) => {
            const result = e.target?.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(imageFile);
        });
      }

      const url = await generateVideo({
        prompt: videoPrompt,
        image: imageBase64,
      });

      setGeneratedVideoUrl(url);
    } catch (error: any) {
      console.error("Video generation failed:", error);
      alert(error.message || "영상 생성에 실패했습니다.");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleFilesAdded = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files ?? []);
    if (!incoming.length) return;
    setAssetFiles((prev) => [...prev, ...incoming]);
    event.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setAssetFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePackageDownload = async () => {
    if (!assetFiles.length) return;
    setIsPackaging(true);
    try {
      const zip = new JSZip();
      const assetsFolder = zip.folder("assets");
      assetFiles.forEach((file, index) => {
        const safeName = `${String(index + 1).padStart(2, "0")}_${file.name}`;
        assetsFolder?.file(safeName, file);
      });

      const manifest = {
        title: projectTitle || "비디오 프로젝트",
        notes: projectNotes,
        createdAt: new Date().toISOString(),
        render: {
          duration: `${renderDuration}초`,
          ratio: renderRatio,
          fps: renderFps,
        },
        assets: assetFiles.map((file, index) => ({
          index: index + 1,
          name: file.name,
          size: file.size,
        })),
      };

      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      if (renderNotes.trim()) {
        zip.file("render-notes.txt", renderNotes.trim());
      }
      if (editNotes.trim()) {
        zip.file("edit-notes.txt", editNotes.trim());
      }
      zip.file(
        "README.txt",
        "올인원 영상 제작 스튜디오 패키지입니다.\nassets 폴더에 이미지와 음성, 영상 소스를 넣어주세요.\nmanifest.json에서 출력 설정을 확인할 수 있습니다."
      );

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${projectTitle || "video"}-package.zip`);
    } catch (error) {
      console.error("패키지 준비 중 오류", error);
      alert("패키지 생성에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsPackaging(false);
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

  const handleGenerateImages = () => {
    const previews = Array.from({ length: imageCount }, (_, index) => ({
      id: index,
      title: `컷 ${index + 1}`,
      hint: `${imagePrompt} / ${imageStyle}`,
      duration: `${4 + index}s`,
    }));
    setImagePreviews(previews);
    setRenderingStatus(`이미지 ${imageCount}개를 생성했던 프롬프트를 기억했습니다.`);
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

  const handleVideoGenerate = async () => {
    const prompt = scriptDraft.trim() || projectNotes.trim() || projectTitle.trim();
    if (!prompt) {
      setVideoError("영상 설명이나 대본을 먼저 입력해 주세요.");
      return;
    }
    setVideoGenerating(true);
    setVideoError(null);
    try {
      const url = await generateVideo({
        prompt,
        ratio: renderRatio,
        duration: Number(renderDuration),
      });
      setVideoUrl(url);
    } catch (error) {
      setVideoError(
        error instanceof Error ? error.message : "영상 생성에 실패했습니다."
      );
    } finally {
      setVideoGenerating(false);
    }
  };

  const progressLabel = useMemo(() => `${currentStep + 1} / ${steps.length}`, [
    currentStep,
  ]);

  const stepPaths = useMemo(
    () => [
      `${normalizedBasePath}/video`,
      `${normalizedBasePath}/video/script`,
      `${normalizedBasePath}/video/tts`,
      `${normalizedBasePath}/video/image`,
      `${normalizedBasePath}/video/generate`,
      `${normalizedBasePath}/video/edit`,
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
  };

  useEffect(() => {
    const normalizedPath = normalizePath(location.pathname);
    const pathIndex = getStepIndexFromPath(normalizedPath);
    const storedIndex = getStoredStepIndex();
    const shouldUseStored =
      normalizedPath === `${normalizedBasePath}/video` && storedIndex !== 0;
    const nextIndex = shouldUseStored ? storedIndex : pathIndex ?? storedIndex;
    if (nextIndex !== currentStep) {
      setCurrentStep(nextIndex);
    }
    const targetPath = stepPaths[nextIndex] ?? `${normalizedBasePath}/video`;
    if (normalizedPath !== targetPath) {
      navigate(targetPath, { replace: true });
    }
  }, [location.pathname, navigate, stepPaths, currentStep]);

  const canGoPrev = currentStep > 0;
  const canGoNext = currentStep < steps.length - 1;

  const handlePrev = () => {
    if (!canGoPrev) return;
    goToStep(currentStep - 1);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    goToStep(currentStep + 1);
  };

  const activeStep = steps[currentStep];
  const formatOptions = [
    {
      value: "long" as VideoFormat,
      title: "롱폼",
      icon: <FiMonitor className="text-lg" />,
    },
    {
      value: "short" as VideoFormat,
      title: "숏폼",
      icon: <FiSmartphone className="text-lg" />,
    },
  ];
  const ratioOptions = [
    {
      value: "16:9",
      title: "가로형",
      size: "1920 x 1080",
    },
    {
      value: "9:16",
      title: "세로형",
      size: "1080 x 1920",
    },
  ];

  const handleFormatChange = (format: VideoFormat) => {
    setVideoFormat(format);
    setRenderRatio(format === "short" ? "9:16" : "16:9");
  };

  const handleRatioChange = (ratio: string) => {
    setRenderRatio(ratio);
    if (ratio === "9:16") {
      setVideoFormat("short");
    } else if (ratio === "16:9") {
      setVideoFormat("long");
    }
  };
  const scriptSlides = [
    {
      title: "대본 입력",
      description: "",
    },
    {
      title: "영상 길이 선택",
      description: "대본 작성 전에 원하는 영상 길이를 먼저 정합니다.",
    },
    {
      title: "구조 분석",
      description: "대본 구조를 분석하고 핵심 흐름을 정리합니다.",
    },
    {
      title: "새 주제 추천",
      description: "분석된 구조를 바탕으로 새 주제를 추천합니다.",
    },
    {
      title: "새 대본 작성",
      description: "선택한 주제로 입력한 대본 구조를 반영해 작성합니다.",
    },
  ];
  const scriptLengthOptions = ["1", "2", "3", "5", "8", "10"];
  const handleSelectScriptLength = (minutes: string) => {
    setScriptLengthMinutes(minutes);
    const seconds = Number(minutes) * 60;
    if (Number.isFinite(seconds) && seconds > 0) {
      setRenderDuration(String(seconds));
    }
  };
  const isScriptStepReady = (index: number) => {
    switch (index) {
      case 0:
        return Boolean(scriptDraft.trim());
      case 1:
        return Boolean(scriptLengthMinutes);
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
  const canScriptPrev = scriptFlowStep > 0;
  const canScriptNext =
    scriptFlowStep < scriptSlides.length - 1 &&
    isScriptStepReady(scriptFlowStep);
  const handleScriptPrev = () => {
    if (!canScriptPrev) return;
    setScriptFlowStep((prev) => prev - 1);
  };
  const handleScriptNext = () => {
    if (!canScriptNext) return;
    setScriptFlowStep((prev) => prev + 1);
  };
  const handleAnalyzeScript = async () => {
    if (!scriptDraft.trim()) {
      setScriptError("분석할 대본을 먼저 입력해 주세요.");
      return;
    }
    setScriptError("");
    setIsAnalyzingScript(true);
    try {
      const analysis = await analyzeTranscript(scriptDraft.trim(), "일반", "", projectTitle);
      setScriptAnalysis(analysis);
      const ideas = await generateIdeas(analysis, "일반", "");
      setScriptIdeas(ideas);
      if (ideas.length > 0) {
        setSelectedTopic(ideas[0]);
      }
    } catch (error) {
      setScriptError(
        error instanceof Error ? error.message : "대본 분석에 실패했습니다."
      );
    } finally {
      setIsAnalyzingScript(false);
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
    try {
      const plan = await generateNewPlan(
        scriptAnalysis,
        selectedTopic,
        `${scriptLengthMinutes}분`,
        "일반"
      );
      setGeneratedPlan(plan);
    } catch (error) {
      setScriptError(
        error instanceof Error ? error.message : "대본 생성에 실패했습니다."
      );
    } finally {
      setIsGeneratingScript(false);
    }
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
                롱폼/숏폼과 화면 비율을 먼저 선택해 주세요.
              </p>
              <div className="mt-4">
                <p className="text-sm font-semibold text-white/80">영상 형식</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {formatOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleFormatChange(option.value)}
                      className={`rounded-2xl border px-4 py-3 text-center transition ${
                        videoFormat === option.value
                          ? "border-red-400 bg-red-500/10 shadow-[0_10px_20px_rgba(239,68,68,0.2)]"
                          : "border-white/15 bg-black/30 hover:border-white/30"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2 text-white">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                          {option.icon}
                        </span>
                        <div className="text-center">
                          <p className="text-sm font-semibold">{option.title}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <p className="text-sm font-semibold text-white/80">화면 비율 & 크기</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {ratioOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleRatioChange(option.value)}
                      className={`rounded-2xl border px-3 py-3 text-center transition ${
                        renderRatio === option.value
                          ? "border-red-400 bg-red-500/10 shadow-[0_10px_20px_rgba(239,68,68,0.2)]"
                          : "border-white/15 bg-black/30 hover:border-white/30"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-center">
                          <p className="text-sm font-semibold text-white">{option.title}</p>
                          <p className="text-sm text-white/50">{option.size}</p>
                        </div>
                        <span className="text-sm font-semibold text-white/50">{option.value}</span>
                      </div>
                      <p className="mt-2 text-sm text-white/50">{option.hint}</p>
                      <div className="mt-3 flex justify-center">
                        <div
                          className={`relative ${
                            option.value === "16:9" ? "h-14 w-24" : "h-24 w-14"
                          }`}
                        >
                          <div
                            className={`absolute inset-0 rounded-lg border ${
                              renderRatio === option.value ? "border-red-400/70" : "border-white/20"
                            } bg-black/40`}
                          >
                            <div className="absolute inset-1 rounded-md bg-gradient-to-br from-white/10 to-white/5" />
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
        return (
          <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
            <div className="rounded-[clamp(1rem,2vw,1.6rem)] border border-white/10 bg-black/40 p-[clamp(1.25rem,2vw,1.8rem)] shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-bold text-white">
                      {scriptSlides[scriptFlowStep].title}
                    </h3>
                    <span className="text-sm font-semibold text-white/60">
                      (대본 생성 단계 {scriptFlowStep + 1} / {scriptSlides.length})
                    </span>
                  </div>
                  {scriptSlides[scriptFlowStep].description && (
                    <p className="mt-2 text-sm text-white/60">
                      {scriptSlides[scriptFlowStep].description}
                    </p>
                  )}
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

              <div className="mt-6 grid gap-4">
                {scriptFlowStep === 0 && (
                  <>
                    <textarea
                      value={scriptDraft}
                      onChange={(event) => setScriptDraft(event.target.value)}
                      onFocus={() => {
                        const trimmed = scriptDraft.trim();
                        if (
                          trimmed === SCRIPT_USAGE_GUIDE.trim() ||
                          trimmed === LEGACY_SAMPLE.trim() ||
                          trimmed.includes("환율 1500원 시대")
                        ) {
                          setScriptDraft("");
                        }
                      }}
                      onBlur={() => {
                        if (!scriptDraft.trim()) {
                          setScriptDraft(SCRIPT_USAGE_GUIDE);
                        }
                      }}
                      rows={7}
                      className="transcript-input w-full rounded-2xl border border-white/20 bg-white px-4 py-4 text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 select-text"
                      placeholder=""
                    />
                    <div className="flex flex-wrap items-center justify-between text-sm text-white/50">
                      <span>
                        {scriptLineCount}줄 · {scriptDraft.length.toLocaleString()}자
                      </span>
                      <span>대본 구조 분석용 입력</span>
                    </div>
                  </>
                )}

                {scriptFlowStep === 1 && (
                  <div className="grid gap-4">
                    <div className="flex flex-wrap gap-2">
                      {scriptLengthOptions.map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => handleSelectScriptLength(minutes)}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            scriptLengthMinutes === minutes
                              ? "border-red-400 bg-red-500/15 text-red-200"
                              : "border-white/15 bg-black/30 text-white/70 hover:border-white/30"
                          }`}
                        >
                          {minutes}분
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-white/50">
                      선택한 길이에 맞춰 대본을 구성합니다. ({scriptLengthMinutes}분 기준)
                    </p>
                  </div>
                )}

                {scriptFlowStep === 2 && (
                  <div className="grid gap-4">
                    <button
                      type="button"
                      onClick={handleAnalyzeScript}
                      disabled={isAnalyzingScript}
                      className="w-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(239,68,68,0.3)] disabled:opacity-60"
                    >
                      {isAnalyzingScript ? "구조 분석 중..." : "대본 구조 분석하기"}
                    </button>
                    {scriptAnalysis?.scriptStructure && (
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                        <p className="text-sm font-semibold text-white mb-3">분석된 구조</p>
                        <div className="space-y-3">
                          {scriptAnalysis.scriptStructure.map((stage) => (
                            <div key={stage.stage} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                              <p className="font-semibold text-white">{stage.stage}</p>
                              <p className="text-sm text-white/50">{stage.purpose}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {scriptFlowStep === 3 && (
                  <div className="grid gap-4">
                    {scriptIdeas.length === 0 ? (
                      <p className="text-sm text-white/60">
                        구조 분석 후 추천 주제가 표시됩니다.
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {scriptIdeas.map((idea) => (
                          <button
                            key={idea}
                            type="button"
                            onClick={() => setSelectedTopic(idea)}
                            className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                              selectedTopic === idea
                                ? "border-red-400 bg-red-500/10 text-white"
                                : "border-white/15 bg-black/30 text-white/70 hover:border-white/30"
                            }`}
                          >
                            {idea}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {scriptFlowStep === 4 && (
                  <div className="grid gap-4">
                    <button
                      type="button"
                      onClick={handleGenerateScript}
                      disabled={isGeneratingScript}
                      className="w-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(239,68,68,0.3)] disabled:opacity-60"
                    >
                      {isGeneratingScript ? "대본 작성 중..." : "선택 주제로 대본 작성하기"}
                    </button>
                    {generatedPlan && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white mb-2">생성된 대본</p>
                        {generatedPlan.chapters && generatedPlan.chapters.length > 0 ? (
                          <div className="space-y-3 text-sm text-white/70">
                            {generatedPlan.chapters.map((chapter, index) => (
                              <div key={chapter.id} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                                <p className="font-semibold text-white">
                                  챕터 {index + 1}. {chapter.title}
                                </p>
                                <p className="text-sm text-white/50 mt-1">{chapter.purpose}</p>
                                {chapter.script && chapter.script.length > 0 && (
                                  <div className="mt-3 space-y-1 text-sm text-white/70">
                                    {chapter.script.map((line, lineIndex) => (
                                      <p key={`${chapter.id}-${lineIndex}`}>
                                        {line.character}: {line.line}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <pre className="whitespace-pre-wrap text-sm text-white/70">
                            {formatGeneratedScript(generatedPlan)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {scriptError && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {scriptError}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleScriptPrev}
                  disabled={!canScriptPrev}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/60 disabled:opacity-40"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={handleScriptNext}
                    disabled={!canScriptNext}
                    className="rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(239,68,68,0.3)] disabled:opacity-40"
                  >
                    다음
                  </button>
              </div>
            </div>
          </div>
        );
      }
      case "tts":
        return (
          <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
            <div className="rounded-[clamp(1rem,2vw,1.6rem)] border border-white/10 bg-black/40 p-[clamp(1.25rem,2vw,1.8rem)] shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white/60">스크립트 & AI 보이스</p>
                  <h3 className="text-2xl font-bold text-white mt-1">대본에 음성을 입혀주세요.</h3>
                  <p className="mt-2 text-sm text-white/60">
                    핵심 구간만 선택해도 바로 음성으로 변환됩니다.
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
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                  <div className="flex items-center justify-between text-sm text-white/50">
                    <span>스크립트 편집</span>
                    <span>{ttsScript.length.toLocaleString()}자</span>
                  </div>
                  <textarea
                    value={ttsScript}
                    onChange={(event) => setTtsScript(event.target.value)}
                    rows={7}
                    className="mt-2 w-full rounded-2xl border border-white/20 bg-white px-4 py-4 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="음성으로 변환할 스크립트를 입력하세요."
                  />
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[160px]">
                      <label className="text-sm font-semibold text-white/60">보이스 선택</label>
                      <select
                        value={selectedVoice}
                        onChange={(event) => setSelectedVoice(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white"
                      >
                        {voiceOptions.map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name} · {voice.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <label className="text-sm font-semibold text-white/60">속도</label>
                      <input
                        type="range"
                        min={0.7}
                        max={1.3}
                        step={0.1}
                        value={ttsSpeed}
                        onChange={(event) => setTtsSpeed(Number(event.target.value))}
                        className="mt-2 w-full"
                      />
                      <p className="text-sm text-white/50 text-right">{ttsSpeed.toFixed(1)}배속</p>
                    </div>
                    <button
                      onClick={handleGenerateTts}
                      className="rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(239,68,68,0.25)]"
                    >
                      음성 생성
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                    <p className="text-sm font-semibold text-white/60">AI 보이스오버</p>
                    <div className="mt-3 space-y-2">
                      {voiceOptions.map((voice) => (
                        <button
                          key={voice.name}
                          type="button"
                          onClick={() => setSelectedVoice(voice.name)}
                          className={`w-full rounded-xl border px-3 py-2 text-left ${
                            selectedVoice === voice.name
                              ? "border-red-400 bg-red-500/10"
                              : "border-white/10 bg-black/30"
                          }`}
                        >
                          <p className="font-semibold text-white">{voice.name}</p>
                          <p className="text-sm text-white/50">{voice.label} · {voice.tone}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                    <p className="text-sm font-semibold text-white/60">최근 생성</p>
                    {ttsSamples.length === 0 ? (
                      <p className="mt-2 text-sm text-white/40">아직 생성한 음성이 없습니다.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {ttsSamples.map((sample) => (
                          <div key={sample.id} className="rounded-xl bg-black/30 px-3 py-2">
                            <p className="text-sm text-white/40">{sample.voice}</p>
                            <p className="text-sm text-white">{sample.text}</p>
                            <p className="text-sm text-white/40">{sample.status}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "image":
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
      case "generate":
        return (
          <div className="mt-[clamp(1rem,2vw,2rem)] grid gap-[clamp(1.2rem,2vw,2rem)] lg:grid-cols-[minmax(0,1fr)_clamp(260px,28vw,340px)]">
            <div className="rounded-[clamp(1rem,2vw,1.4rem)] border border-white/20 bg-black/40 p-[clamp(1rem,2vw,1.4rem)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/60">영상 생성</p>
                  <h3 className="text-2xl font-bold text-white">씬을 구성해 볼까요</h3>
                </div>
                <span className="text-sm font-semibold text-red-300">{imagePreviews.length}컷 선택</span>
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
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(255,86,96,0.4)] disabled:opacity-60"
              >
                <FiDownload /> {isPackaging ? "패키지를 준비 중입니다" : "출력 패키지 다운로드"}
              </button>
            </div>
            <div className="rounded-[clamp(1rem,2vw,1.4rem)] border border-white/20 bg-black/40 p-4">
              <p className="text-sm font-semibold text-white/60">영상 스타일</p>
              <div className="mt-4 space-y-2 text-sm text-white/70">
                <p>?? 전체 시간: {renderDuration}초</p>
                <p>?? 화면 비율: {renderRatio}</p>
                <p>?? FPS: {renderFps}</p>
                <p>?? 이미지 컷: {imagePreviews.length || imageCount}개</p>
              </div>
              <p className="mt-4 text-sm text-white/40">
                템포나 분위기를 바꾸고 싶다면 상단 스텝으로 돌아가 수정하면 됩니다.
              </p>
              <button
                onClick={handleVideoGenerate}
                disabled={videoGenerating}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-sm font-bold text-white shadow-[0_8px_20px_rgba(255,86,96,0.35)] disabled:opacity-60"
              >
                {videoGenerating ? "영상 생성 요청 중..." : "영상 생성 요청하기"}
              </button>
              {videoError && (
                <p className="mt-2 text-sm text-red-300">{videoError}</p>
              )}
              {videoUrl && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  <video src={videoUrl} controls className="w-full" />
                </div>
              )}
            </div>
          </div>
        );
      case "render":
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
                      <span>예상 크레딧</span>
                      <span>{timelineScenes.length} 크레딧</span>
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
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(255,86,96,0.35)] disabled:opacity-60"
              >
                {rendering ? "출력 중..." : "영상 출력 시작"}
              </button>
            </div>
          </div>
        );
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
        <UserCreditToolbar user={user} onLogout={handleLogout} tone="red" />
      </div>

      <div className="relative mx-auto max-w-[min(1280px,94vw)] px-[clamp(1rem,3vw,2.5rem)] py-[clamp(2rem,4vw,3.8rem)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <HomeBackButton tone="red" />
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
              <span
                key={step.id}
                className={`rounded-full border px-3 py-1 text-center ${
                  index === currentStep
                    ? "border-red-400/50 bg-red-500/10 text-red-200"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {index + 1}. {step.label}
              </span>
            ))}
          </div>
        </header>

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

            <div className="border-t border-white/10 p-[clamp(1.2rem,2.5vw,2rem)]">
              <AdSense adSlot="3672059148" className="mb-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3" />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!canGoPrev}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/70 transition hover:border-white/40 disabled:opacity-40"
                >
                  <FiChevronLeft /> 이전 단계
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-6 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(255,69,91,0.35)] transition hover:translate-x-0.5 disabled:opacity-40"
                >
                  다음 단계 <FiChevronRight />
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default VideoPage;


