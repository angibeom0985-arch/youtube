
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiFileText,
  FiFilm,
  FiImage,
  FiMic,
  FiSettings,
  FiUpload,
} from "react-icons/fi";
import JSZip from "jszip";
import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";
import UserCreditToolbar from "../components/UserCreditToolbar";

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
};

type StepId = "setup" | "script" | "tts" | "image" | "generate" | "render";

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
  "카툰 렌더",
  "하이퍼 리얼",
];

const steps: Step[] = [
  {
    id: "setup",
    label: "설정",
    description: "프로젝트 제목과 렌더 기본 값을 먼저 정해보세요.",
    icon: <FiSettings />,
  },
  {
    id: "script",
    label: "대본 생성",
    description: "주제와 톤을 적으면 흐름을 파악해 대본을 만들어 드립니다.",
    icon: <FiFileText />,
  },
  {
    id: "tts",
    label: "음성 생성",
    description: "AI 보이스를 선택해 내레이션을 만들고 저장하세요.",
    icon: <FiMic />,
  },
  {
    id: "image",
    label: "이미지 생성",
    description: "스토리보드 컷을 기준으로 이미지 프롬프트를 세팅합니다.",
    icon: <FiImage />,
  },
  {
    id: "generate",
    label: "영상 생성",
    description: "이미지, 음성, 텍스트를 하나로 묶어 영상 클립을 구성합니다.",
    icon: <FiFilm />,
  },
  {
    id: "render",
    label: "영상 렌더링",
    description: "모든 요소를 최종 렌더링하고 패키지를 다운로드하세요.",
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

const VideoPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
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
      "[오프닝]\n환율 1500원 시대가 열렸습니다.\n[중간]\n실물 가격이 천정부지로..."
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
  const [rendering, setRendering] = useState(false);
  const [renderingStatus, setRenderingStatus] = useState<string | null>(null);
  const [renderingProgress, setRenderingProgress] = useState(0);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
        "올인원 영상 제작 스튜디오 패키지입니다.\nassets 폴더에 이미지와 음성, 영상 소스를 넣어주세요.\nmanifest.json에서 렌더 설정을 확인할 수 있습니다."
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
    setRenderingStatus("AI 음성 렌더링을 준비했습니다.");
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
    setRenderingStatus("렌더링을 예약하고 있습니다.");
    const interval = window.setInterval(() => {
      setRenderingProgress((prev) => {
        const next = prev + 20;
        if (next >= 100) {
          window.clearInterval(interval);
          setRendering(false);
          setRenderingStatus(
            "렌더링이 완료되었습니다. 결과를 다운로드하거나 패키지를 확인하세요."
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

  const canGoPrev = currentStep > 0;
  const canGoNext = currentStep < steps.length - 1;

  const handlePrev = () => {
    if (!canGoPrev) return;
    setCurrentStep((prev) => prev - 1);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    setCurrentStep((prev) => prev + 1);
  };

  const activeStep = steps[currentStep];

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
          <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)] grid gap-[clamp(1.25rem,2vw,2rem)] lg:grid-cols-2">
            <div className="rounded-[clamp(1rem,2vw,1.4rem)] border border-white/20 bg-black/40 p-[clamp(1rem,2vw,1.4rem)]">
              <p className="text-sm font-semibold text-white/60">어떤 영상을 만들고 싶으세요?</p>
              <h3 className="text-2xl font-bold text-white mt-1">프로젝트 정의</h3>
              <p className="text-sm text-white/50 mt-2">
                핵심 메시지와 CTA를 간단히 적어두면 나머지 스텝에서 참조합니다.
              </p>
              <label className="mt-5 block text-xs font-semibold text-white/60">프로젝트 제목</label>
              <input
                value={projectTitle}
                onChange={(event) => setProjectTitle(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="예: 2026년 환율 1500원 시대의 기회"
              />
              <label className="mt-4 block text-xs font-semibold text-white/60">기획 메모</label>
              <textarea
                value={projectNotes}
                onChange={(event) => setProjectNotes(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="타겟, 톤, CTA 등을 적어주세요."
              />
            </div>
            <div className="rounded-[clamp(1rem,2vw,1.4rem)] border border-white/20 bg-black/40 p-[clamp(1rem,2vw,1.4rem)]">
              <p className="text-sm font-semibold text-white/60">렌더 기본 설정</p>
              <h3 className="text-2xl font-bold text-white mt-1">길이 · 비율 · 프레임</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <label className="text-xs font-semibold text-white/60">길이 (초)</label>
                <select
                  value={renderDuration}
                  onChange={(event) => setRenderDuration(event.target.value)}
                  className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="30">30초</option>
                  <option value="45">45초</option>
                  <option value="60">60초</option>
                  <option value="90">90초</option>
                </select>
                <label className="text-xs font-semibold text-white/60">화면 비율</label>
                <select
                  value={renderRatio}
                  onChange={(event) => setRenderRatio(event.target.value)}
                  className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                </select>
                <label className="text-xs font-semibold text-white/60">FPS</label>
                <select
                  value={renderFps}
                  onChange={(event) => setRenderFps(event.target.value)}
                  className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="24">24fps</option>
                  <option value="30">30fps</option>
                  <option value="60">60fps</option>
                </select>
              </div>
              <label className="mt-4 block text-xs font-semibold text-white/60">렌더 메모</label>
              <textarea
                value={renderNotes}
                onChange={(event) => setRenderNotes(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="전환 효과, 자막 위치, 그래픽 지시 등을 적어주세요."
              />
            </div>
          </div>
        );
      case "script":
        return (
          <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)] space-y-4">
            <div className="rounded-[clamp(1rem,2vw,1.4rem)] border border-white/20 bg-black/40 p-[clamp(1rem,2vw,1.4rem)]">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold text-white/60">대본 생성</p>
                  <h3 className="text-2xl font-bold text-white">흐름을 자율적으로 완성</h3>
                </div>
                <Link
                  to="/script"
                  className="text-xs font-semibold text-red-300 underline-offset-4 hover:text-red-200"
                >
                  대본 편집기에서 계속하기
                </Link>
              </div>
              <textarea
                value={scriptDraft}
                onChange={(event) => setScriptDraft(event.target.value)}
                rows={8}
                className="mt-4 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="오프닝, 본문, 클로징 순으로 간단히라도 메모해두면 자동으로 구분해서 채웁니다."
              />
            </div>
          </div>
        );
      case "tts":
        return (
          <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)] grid gap-[clamp(1.25rem,2vw,2rem)] lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rounded-[clamp(1rem,2vw,1.4rem)] border border-white/20 bg-black/40 p-[clamp(1rem,2vw,1.4rem)]">
              <h3 className="text-xl font-bold text-white">스크립트를 AI 보이스로</h3>
              <p className="text-sm text-white/50 mt-1">
                원본 스크립트를 그대로 붙여넣거나 일부 문장만 선택해 음성으로 만드세요.
              </p>
              <textarea
                value={ttsScript}
                onChange={(event) => setTtsScript(event.target.value)}
                rows={5}
                className="mt-4 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="내레이션으로 사용할 문장을 입력하세요."
              />
              <div className="mt-4 flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[160px]">
                  <p className="text-xs font-semibold text-white/60">보이스</p>
                  <select
                    value={selectedVoice}
                    onChange={(event) => setSelectedVoice(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {voiceOptions.map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} · {voice.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <p className="text-xs font-semibold text-white/60">속도</p>
                  <input
                    type="range"
                    min={0.7}
                    max={1.3}
                    step={0.1}
                    value={ttsSpeed}
                    onChange={(event) => setTtsSpeed(Number(event.target.value))}
                    className="mt-1 w-full"
                  />
                  <p className="text-xs text-white/60 text-right">{ttsSpeed.toFixed(1)}배속</p>
                </div>
                <button
                  onClick={handleGenerateTts}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2 text-sm font-bold text-white shadow-[0_8px_20px_rgba(255,86,96,0.4)]"
                >
                  <FiMic /> 음성 생성
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {voiceOptions.map((voice) => (
                <div
                  key={voice.name}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    selectedVoice === voice.name
                      ? "border-red-500 bg-red-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <p className="font-semibold text-white">{voice.name} · {voice.label}</p>
                  <p className="text-xs text-white/50">{voice.tone}</p>
                </div>
              ))}
              <div className="rounded-2xl border border-white/20 bg-black/40 p-3 space-y-2 text-sm">
                <p className="font-semibold text-white">최근 생성</p>
                {ttsSamples.length === 0 ? (
                  <p className="text-xs text-white/40">아직 생성한 음성이 없습니다.</p>
                ) : (
                  ttsSamples.map((sample) => (
                    <div key={sample.id} className="rounded-xl bg-white/5 px-3 py-2 text-white/70">
                      <p className="text-xs text-white/40">{sample.voice}</p>
                      <p className="text-sm text-white">{sample.text}</p>
                      <p className="text-xs text-white/40">{sample.status}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      case "image":
        return (
          <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)] grid gap-[clamp(1.25rem,2vw,2rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[clamp(1rem,2vw,1.4rem)] border border-white/20 bg-black/40 p-[clamp(1rem,2vw,1.4rem)]">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-white/60">이미지 프롬프트</p>
                <h3 className="text-2xl font-bold text-white">스토리보드 컷을 채우세요</h3>
              </div>
              <textarea
                value={imagePrompt}
                onChange={(event) => setImagePrompt(event.target.value)}
                rows={4}
                className="mt-4 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="특정 장면, 조명, 감정을 적어보세요."
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="flex-1 min-w-[140px]">
                  <p className="text-xs font-semibold text-white/60">스타일</p>
                  <select
                    value={imageStyle}
                    onChange={(event) => setImageStyle(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {imageStyles.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <p className="text-xs font-semibold text-white/60">컷 수</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={imageCount}
                      onChange={(event) => setImageCount(Math.max(1, Number(event.target.value)))}
                      className="w-20 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <span className="text-xs text-white/50">컷</span>
                  </div>
                </div>
                <button
                  onClick={handleGenerateImages}
                  className="rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2 text-sm font-bold text-white shadow-[0_8px_20px_rgba(255,86,96,0.4)]"
                >
                  이미지 생성
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-[clamp(1rem,2vw,1.4rem)] border border-white/10 bg-black/50 p-4">
                <p className="text-xs font-semibold text-white/60">미리보기</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {imagePreviews.length === 0 ? (
                    <p className="text-xs text-white/40">이미지를 생성하면 미리보기 카드가 채워집니다.</p>
                  ) : (
                    imagePreviews.map((preview) => (
                      <div
                        key={preview.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/80"
                      >
                        <p className="text-sm font-semibold text-white">{preview.title}</p>
                        <p className="text-[12px] text-white/50">{preview.hint}</p>
                        <p className="text-[11px] text-white/40">{preview.duration}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-[clamp(1rem,2vw,1.4rem)] border border-white/20 bg-black/40 p-3 text-sm text-white/60">
                <p className="font-semibold text-white">이미지 정책</p>
                <p className="mt-2 text-[12px]">
                  AI 이미지 생성은 가이드를 기반으로 합니다. 프롬프트를 구체적으로 적으면 원하는 컷 결과를 얻기 쉽습니다.
                </p>
              </div>
            </div>
          </div>
        );
      case "generate":
        return (
          <div className="mt-[clamp(1rem,2vw,2rem)] grid gap-[clamp(1.2rem,2vw,2rem)] lg:grid-cols-[minmax(0,1fr)_clamp(260px,28vw,340px)]">
            <div className="rounded-[clamp(1rem,2vw,1.4rem)] border border-white/20 bg-black/40 p-[clamp(1rem,2vw,1.4rem)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white/60">영상 생성</p>
                  <h3 className="text-2xl font-bold text-white">씬을 구성해 볼까요</h3>
                </div>
                <span className="text-xs font-semibold text-red-300">{imagePreviews.length}컷 선택</span>
              </div>
              <div className="mt-4 space-y-3">
                {timelineScenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
                  >
                    <div>
                      <p className="font-semibold text-white">{scene.label}</p>
                      <p className="text-[12px] text-white/50 truncate">{scene.desc}</p>
                    </div>
                    <span className="text-xs text-white/50">{scene.duration}</span>
                  </div>
                ))}
              </div>
              <label className="mt-4 block text-xs font-semibold text-white/60">보조 자산 업로드</label>
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
                  <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/50">
                    업로드한 자산이 없으면 프롬프트 기반으로 생성합니다.
                  </p>
                ) : (
                  assetFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
                    >
                      <div>
                        <p className="font-semibold text-white truncate">{file.name}</p>
                        <p className="text-[11px] text-white/50">{formatFileSize(file.size)}</p>
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
                <FiDownload /> {isPackaging ? "패키지를 준비 중입니다" : "렌더 패키지 다운로드"}
              </button>
            </div>
            <div className="rounded-[clamp(1rem,2vw,1.4rem)] border border-white/20 bg-black/40 p-4">
              <p className="text-xs font-semibold text-white/60">영상 스타일</p>
              <div className="mt-4 space-y-2 text-sm text-white/70">
                <p>?? 전체 시간: {renderDuration}초</p>
                <p>?? 화면 비율: {renderRatio}</p>
                <p>?? FPS: {renderFps}</p>
                <p>?? 이미지 컷: {imagePreviews.length || imageCount}개</p>
              </div>
              <p className="mt-4 text-xs text-white/40">
                템포나 분위기를 바꾸고 싶다면 상단 스텝으로 돌아가 수정하면 됩니다.
              </p>
            </div>
          </div>
        );
      case "render":
        return (
          <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)] space-y-4">
            <div className="rounded-[clamp(1rem,2vw,1.4rem)] border border-white/20 bg-black/40 p-[clamp(1rem,2vw,1.4rem)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white/60">렌더링 체크</p>
                  <h3 className="text-2xl font-bold text-white">최종 확인</h3>
                </div>
                <span className="text-xs text-white/50">진행도 {renderingProgress}%</span>
              </div>
              <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                <div
                  style={{ width: `${renderingProgress}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400"
                />
              </div>
              <p className="mt-3 text-xs text-white/60">
                {renderingStatus || "렌더링을 시작하면 자동으로 모든 컷을 조합해 영상을 완성합니다."}
              </p>
              <label className="mt-5 block text-xs font-semibold text-white/60">편집 체크</label>
              <textarea
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="편집 키워드, 컬러 톤, 자막 위치 등을 기록하세요."
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadEditNotes}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-4 py-2 text-xs font-semibold text-white/80"
                >
                  <FiDownload /> 편집 노트 다운로드
                </button>
                <label className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-4 py-2 text-xs font-semibold text-white/80">
                  <input type="checkbox" className="h-4 w-4 rounded border-white/40 bg-black/40" defaultChecked />
                  자막 포함
                </label>
              </div>
            </div>
            <button
              onClick={startRendering}
              disabled={rendering}
              className="w-full rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(255,86,96,0.4)] disabled:opacity-60"
            >
              {rendering ? "렌더링 중..." : "영상 렌더링 시작"}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050505] via-[#230b0b] to-[#2b0909] text-white relative overflow-hidden">
      <div className="absolute -top-32 -right-20 h-[clamp(200px,34vw,400px)] w-[clamp(200px,34vw,400px)] rounded-full bg-gradient-to-br from-red-600/80 via-orange-500/40 to-purple-500/30 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-[clamp(220px,34vw,380px)] w-[clamp(220px,34vw,380px)] rounded-full bg-gradient-to-tr from-blue-200/40 via-sky-200/20 to-violet-200/20 blur-3xl" />

      <div className="absolute top-0 right-0 p-4 sm:p-6 flex gap-3 z-50 items-center">
        <UserCreditToolbar user={user} onLogout={handleLogout} tone="red" />
      </div>

      <div className="mx-auto max-w-[min(1200px,94vw)] px-[clamp(1rem,3vw,2rem)] py-[clamp(2rem,5vw,4rem)]">
        <Link to="/" className="text-sm text-slate-300 hover:text-slate-100">
          홈으로 돌아가기
        </Link>
        <div className="mt-5">
          <h1 className="text-[clamp(1.8rem,2.8vw,2.8rem)] font-black text-white">올인원 영상 제작 스튜디오</h1>
          <p className="mt-2 text-[clamp(0.95rem,1.6vw,1rem)] text-white/70">
            설정부터 대본, 음성, 이미지, 영상 렌더링까지 한 페이지에서 순차적으로 챙겨드립니다.
          </p>
        </div>

        <div className="mt-[clamp(1.5rem,3vw,2.5rem)]">
          <div className="relative">
            <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/5" />
            <div className="grid grid-cols-3 gap-[clamp(0.75rem,2vw,1.4rem)] md:grid-cols-6">
              {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isDone = index < currentStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentStep(index)}
                    className="relative flex flex-col items-center gap-1 text-[clamp(0.65rem,1vw,0.75rem)] font-semibold"
                  >
                    <span
                      className={`flex h-[clamp(2rem,3vw,2.4rem)] w-[clamp(2rem,3vw,2.4rem)] items-center justify-center rounded-full border-2 transition-all ${
                        isDone
                          ? "border-red-500 bg-red-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.45)]"
                          : isActive
                            ? "border-red-500 bg-white text-red-600"
                            : "border-white/30 bg-black/40 text-white/60"
                      }`}
                    >
                      {isDone ? <FiDownload className="text-lg" /> : index + 1}
                    </span>
                    <span className={`text-[10px] tracking-wide ${isActive ? "text-red-300" : "text-white/60"}`}>
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-[clamp(1.8rem,3vw,3rem)] rounded-[clamp(1.25rem,2.5vw,2rem)] bg-white/5 border border-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
          <div className="h-1 w-full rounded-t-[clamp(1.25rem,2.5vw,2rem)] bg-gradient-to-r from-red-500 via-orange-500 to-rose-500" />
          <div className="p-[clamp(1.5rem,3vw,2.5rem)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[clamp(0.6rem,1vw,0.7rem)] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  STEP {currentStep + 1}
                </p>
                <h2 className="text-[clamp(1.5rem,2.4vw,2rem)] font-bold text-white mt-1">
                  {activeStep.label}
                </h2>
                <p className="text-[clamp(0.85rem,1.5vw,1rem)] text-white/60 mt-1">
                  {activeStep.description}
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-400">{progressLabel}</span>
            </div>
            {renderStepContent()}
            <div className="mt-[clamp(1.8rem,3vw,3rem)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handlePrev}
                disabled={!canGoPrev}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/60 transition hover:border-slate-300 disabled:opacity-40"
              >
                <FiChevronLeft /> 이전 단계
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-6 py-2 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(255,69,91,0.3)] transition hover:translate-x-0.5 disabled:opacity-40"
              >
                다음 단계 <FiChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPage;

