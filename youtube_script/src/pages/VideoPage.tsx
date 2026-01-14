
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiEdit3,
  FiFileText,
  FiFilm,
  FiImage,
  FiMic,
  FiUpload,
} from "react-icons/fi";
import JSZip from "jszip";
import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";
import UserCreditToolbar from "../components/UserCreditToolbar";

const STORAGE_KEYS = {
  title: "video_project_title",
  notes: "video_project_notes",
  renderNotes: "video_project_render_notes",
  renderDuration: "video_project_render_duration",
  renderRatio: "video_project_render_ratio",
  renderFps: "video_project_render_fps",
  editNotes: "video_project_edit_notes",
};

type StepId = "setup" | "script" | "tts" | "image" | "generate" | "render";

type Step = {
  id: StepId;
  label: string;
  description: string;
  icon: React.ReactNode;
};

const steps: Step[] = [
  {
    id: "setup",
    label: "설정",
    description: "프로젝트와 렌더 기본 설정을 빠르게 지정합니다.",
    icon: <FiCheckCircle />,
  },
  {
    id: "script",
    label: "대본 생성",
    description: "주제와 키워드를 넣으면 AI가 대본을 만들어 드립니다.",
    icon: <FiFileText />,
  },
  {
    id: "tts",
    label: "음성 생성",
    description: "대본을 AI 음성으로 변환해 나레이션을 제작합니다.",
    icon: <FiMic />,
  },
  {
    id: "image",
    label: "이미지 생성",
    description: "컷 구조에 맞는 이미지와 스토리보드를 구성합니다.",
    icon: <FiImage />,
  },
  {
    id: "generate",
    label: "영상 생성",
    description: "이미지, 음성, 효과음을 묶어 영상 패키지를 준비합니다.",
    icon: <FiFilm />,
  },
  {
    id: "render",
    label: "영상 렌더링",
    description: "최종 편집 체크리스트와 렌더 요청서를 정리합니다.",
    icon: <FiEdit3 />,
  },
];

const getStoredString = (key: string, fallback = ""): string => {
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
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const VideoPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [projectTitle, setProjectTitle] = useState(() =>
    getStoredString(STORAGE_KEYS.title, "환율 1500원 시대에 벌어질 일들")
  );
  const [projectNotes, setProjectNotes] = useState(() =>
    getStoredString(STORAGE_KEYS.notes)
  );
  const [renderNotes, setRenderNotes] = useState(() =>
    getStoredString(STORAGE_KEYS.renderNotes)
  );
  const [renderDuration, setRenderDuration] = useState(() =>
    getStoredString(STORAGE_KEYS.renderDuration, "60s")
  );
  const [renderRatio, setRenderRatio] = useState(() =>
    getStoredString(STORAGE_KEYS.renderRatio, "16:9")
  );
  const [renderFps, setRenderFps] = useState(() =>
    getStoredString(STORAGE_KEYS.renderFps, "30")
  );
  const [editNotes, setEditNotes] = useState(() =>
    getStoredString(STORAGE_KEYS.editNotes)
  );
  const [assetFiles, setAssetFiles] = useState<File[]>([]);
  const [isPackaging, setIsPackaging] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => setStoredValue(STORAGE_KEYS.title, projectTitle), [projectTitle]);
  useEffect(() => setStoredValue(STORAGE_KEYS.notes, projectNotes), [projectNotes]);
  useEffect(() => setStoredValue(STORAGE_KEYS.renderNotes, renderNotes), [renderNotes]);
  useEffect(() => setStoredValue(STORAGE_KEYS.renderDuration, renderDuration), [renderDuration]);
  useEffect(() => setStoredValue(STORAGE_KEYS.renderRatio, renderRatio), [renderRatio]);
  useEffect(() => setStoredValue(STORAGE_KEYS.renderFps, renderFps), [renderFps]);
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
        title: projectTitle || "Untitled",
        notes: projectNotes,
        createdAt: new Date().toISOString(),
        renderSettings: {
          duration: renderDuration,
          ratio: renderRatio,
          fps: renderFps,
        },
        assets: assetFiles.map((file, index) => ({
          index: index + 1,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
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
        "올인원 영상 제작 스튜디오 패키지입니다.\nassets 폴더에 이미지/음성/영상 파일을 넣어주세요.\nmanifest.json에서 렌더 옵션을 확인할 수 있습니다."
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const fileName = `${projectTitle || "video-project"}-package.zip`;
      downloadBlob(blob, fileName);
    } catch (error) {
      console.error("패키지 생성 실패:", error);
      alert("패키지를 만들지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsPackaging(false);
    }
  };

  const handleDownloadEditNotes = () => {
    const content = editNotes.trim() || "편집 요청 사항이 아직 없습니다.";
    const fileName = `${projectTitle || "video-project"}-edit-notes.txt`;
    downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), fileName);
  };

  const progressLabel = useMemo(() => `${currentStep + 1} / ${steps.length}`, [currentStep]);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050505] via-[#1b0505] to-[#260808] text-white relative overflow-hidden">
      <div className="absolute -top-32 -right-24 h-[clamp(200px,30vw,360px)] w-[clamp(200px,30vw,360px)] rounded-full bg-gradient-to-br from-red-600/60 via-red-500/40 to-orange-300/30 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-[clamp(220px,34vw,380px)] w-[clamp(220px,34vw,380px)] rounded-full bg-gradient-to-tr from-blue-200/60 via-sky-200/30 to-violet-200/30 blur-3xl" />

      <div className="absolute top-0 right-0 p-4 sm:p-6 flex gap-3 z-50 items-center">
        <UserCreditToolbar user={user} onLogout={handleLogout} tone="red" />
      </div>

      <div className="mx-auto max-w-[min(1200px,94vw)] px-[clamp(1rem,3vw,2rem)] py-[clamp(2rem,5vw,4rem)]">
        <Link to="/" className="text-sm text-slate-400 hover:text-slate-600">
          대시보드로 이동
        </Link>

        <div className="mt-5">
          <h1 className="text-[clamp(1.8rem,2.8vw,2.8rem)] font-black text-white">
            올인원 영상 제작 스튜디오
          </h1>
          <p className="mt-2 text-[clamp(0.9rem,1.6vw,1rem)] text-white/60">
            설정부터 대본, 음성, 이미지, 영상, 렌더링까지 한 화면에서 순서대로 진행하세요.
          </p>
        </div>

        <div className="mt-[clamp(1.5rem,3vw,2.5rem)]">
          <div className="relative">
            <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-slate-200" />
            <div className="grid grid-cols-3 gap-[clamp(0.75rem,2vw,1.5rem)] md:grid-cols-6">
              {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isDone = index < currentStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentStep(index)}
                    className="relative flex flex-col items-center gap-2 text-[clamp(0.65rem,1vw,0.75rem)] font-semibold text-white/60"
                  >
                    <span
                      className={`flex h-[clamp(2rem,3vw,2.6rem)] w-[clamp(2rem,3vw,2.6rem)] items-center justify-center rounded-full border-2 transition-all ${
                        isDone
                          ? "border-red-500 bg-red-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.45)]"
                          : isActive
                            ? "border-red-500 text-white bg-white"
                            : "border-white/30 bg-black/20 text-white/40"
                      }`}
                    >
                      {isDone ? <FiCheckCircle className="text-white" /> : index + 1}
                    </span>
                    <span className={`${isActive ? "text-red-400" : "text-white/60"}`}>
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-[clamp(1.8rem,3vw,3rem)] rounded-[clamp(1.25rem,2.5vw,2rem)] bg-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.6)] border border-white/10 backdrop-blur-2xl">
          <div className="h-1 w-full rounded-t-[clamp(1.25rem,2.5vw,2rem)] bg-gradient-to-r from-red-500 via-orange-500 to-rose-500" />
          <div className="p-[clamp(1.25rem,3vw,2.5rem)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[clamp(0.6rem,1vw,0.7rem)] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  STEP {currentStep + 1}
                </p>
                <h2 className="text-[clamp(1.3rem,2.4vw,2rem)] font-bold text-white mt-2">
                  {activeStep.label}
                </h2>
                <p className="text-[clamp(0.85rem,1.5vw,1rem)] text-white/60 mt-1">
                  {activeStep.description}
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-400">{progressLabel}</span>
            </div>

            {activeStep.id === "setup" && (
              <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)] grid gap-[clamp(1rem,2vw,1.5rem)] lg:grid-cols-2">
                <div className="rounded-[clamp(1rem,2vw,1.5rem)] border border-white/20 p-[clamp(1rem,2.3vw,1.5rem)] bg-black/40 border-white/10">
                  <h3 className="text-[clamp(1rem,1.6vw,1.2rem)] font-semibold text-white">
                    어떤 영상을 만들고 싶으세요?
                  </h3>
                  <p className="mt-2 text-[clamp(0.8rem,1.4vw,0.95rem)] text-white/60">
                    주제와 기획 메모를 입력하면 영상 흐름을 구조화해 드립니다.
                  </p>
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-white/60">프로젝트 제목</label>
                      <input
                        value={projectTitle}
                        onChange={(event) => setProjectTitle(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="예: 환율 1500원 시대에 벌어질 일들"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-white/60">기획 메모</label>
                      <textarea
                        value={projectNotes}
                        onChange={(event) => setProjectNotes(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        rows={5}
                        placeholder="타겟, 톤, CTA 등 핵심 포인트를 정리해 주세요."
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-[clamp(1rem,2vw,1.5rem)] border border-white/20 p-[clamp(1rem,2.3vw,1.5rem)] bg-black/40 border-white/10">
                  <h3 className="text-[clamp(1rem,1.6vw,1.2rem)] font-semibold text-white">
                    렌더 기본 설정
                  </h3>
                  <p className="mt-2 text-[clamp(0.8rem,1.4vw,0.95rem)] text-white/60">
                    전체 길이와 비율, 프레임 등 기본 옵션을 선택하세요.
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-semibold text-white/60">길이</label>
                      <select
                        value={renderDuration}
                        onChange={(event) => setRenderDuration(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/20 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="30s">30초</option>
                        <option value="60s">1분</option>
                        <option value="180s">3분</option>
                        <option value="300s">5분</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-white/60">화면 비율</label>
                      <select
                        value={renderRatio}
                        onChange={(event) => setRenderRatio(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/20 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="16:9">16:9</option>
                        <option value="9:16">9:16</option>
                        <option value="1:1">1:1</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-white/60">FPS</label>
                      <select
                        value={renderFps}
                        onChange={(event) => setRenderFps(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/20 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="24">24fps</option>
                        <option value="30">30fps</option>
                        <option value="60">60fps</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-6">
                    <label className="text-xs font-semibold text-white/60">렌더 메모</label>
                    <textarea
                      value={renderNotes}
                      onChange={(event) => setRenderNotes(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      rows={4}
                      placeholder="자막, 효과, 화면 전환 등 원하는 느낌을 적어주세요."
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStep.id === "script" && (
              <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
                  <span>대본 작성 화면을 한 화면에서 바로 확인하세요.</span>
                  <a
                    href="/script"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-red-500/30 px-4 py-1 text-xs font-semibold text-red-300 hover:border-red-400"
                  >
                    새 창에서 열기
                  </a>
                </div>
                <div className="mt-4 overflow-hidden rounded-[clamp(1rem,2vw,1.5rem)] border border-white/20">
                  <iframe
                    title="대본 생성"
                    src="/script"
                    className="h-[clamp(420px,72vh,760px)] w-full"
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            {activeStep.id === "tts" && (
              <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
                  <span>대본을 AI 음성으로 변환해 나레이션을 만들어보세요.</span>
                  <a
                    href="/tts"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-red-500/30 px-4 py-1 text-xs font-semibold text-red-300 hover:border-red-400"
                  >
                    새 창에서 열기
                  </a>
                </div>
                <div className="mt-4 overflow-hidden rounded-[clamp(1rem,2vw,1.5rem)] border border-white/20">
                  <iframe
                    title="음성 생성"
                    src="/tts"
                    className="h-[clamp(420px,72vh,760px)] w-full"
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            {activeStep.id === "image" && (
              <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
                  <span>이미지 생성 화면에서 스토리보드를 바로 만들 수 있습니다.</span>
                  <a
                    href="/image"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-red-500/30 px-4 py-1 text-xs font-semibold text-red-300 hover:border-red-400"
                  >
                    새 창에서 열기
                  </a>
                </div>
                <div className="mt-4 overflow-hidden rounded-[clamp(1rem,2vw,1.5rem)] border border-white/20">
                  <iframe
                    title="이미지 생성"
                    src="/image"
                    className="h-[clamp(420px,72vh,760px)] w-full"
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            {activeStep.id === "generate" && (
              <div className="mt-[clamp(1rem,2vw,1.5rem)] grid gap-[clamp(1rem,2vw,1.5rem)] lg:grid-cols-[minmax(0,1fr)_clamp(240px,28vw,340px)]">
                <div className="rounded-[clamp(1rem,2vw,1.5rem)] border border-white/20 p-[clamp(1rem,2.3vw,1.5rem)] bg-black/40 border-white/10">
                  <h3 className="text-[clamp(1rem,1.6vw,1.2rem)] font-semibold text-white">
                    영상 패키지 재료 업로드
                  </h3>
                  <p className="mt-2 text-[clamp(0.8rem,1.4vw,0.95rem)] text-white/60">
                    이미지, 음성, BGM 등을 모아 렌더 패키지를 만들어보세요.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-300 hover:border-red-400">
                      <FiUpload />
                      파일 추가
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,audio/*"
                        onChange={handleFilesAdded}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-slate-400">
                      {assetFiles.length ? `${assetFiles.length}개 파일 준비됨` : "아직 업로드 없음"}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {assetFiles.length === 0 && (
                      <div className="rounded-lg border border-dashed border-white/20 px-4 py-6 text-center text-sm text-slate-400">
                        파일을 업로드하면 여기에 목록이 표시됩니다.
                      </div>
                    )}
                    {assetFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-white/20 bg-white px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="text-slate-700">{file.name}</p>
                          <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className="text-xs text-slate-400 hover:text-red-500"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[clamp(1rem,2vw,1.5rem)] border border-white/20 p-[clamp(1rem,2.3vw,1.5rem)] bg-black/40 border-white/10">
                  <h3 className="text-[clamp(1rem,1.6vw,1.2rem)] font-semibold text-white">
                    렌더 준비 요약
                  </h3>
                  <ul className="mt-4 space-y-2 text-[clamp(0.85rem,1.4vw,0.95rem)] text-white/60">
                    <li>길이: {renderDuration}</li>
                    <li>비율: {renderRatio}</li>
                    <li>FPS: {renderFps}</li>
                    <li>업로드 수: {assetFiles.length}개</li>
                  </ul>
                  <button
                    type="button"
                    onClick={handlePackageDownload}
                    disabled={!assetFiles.length || isPackaging}
                    className="mt-6 w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(255,69,91,0.25)] transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    <FiDownload />
                    {isPackaging ? "패키지 생성 중..." : "렌더 패키지 다운로드"}
                  </button>
                </div>
              </div>
            )}

            {activeStep.id === "render" && (
              <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)] grid gap-[clamp(1rem,2vw,1.5rem)] lg:grid-cols-[minmax(0,1fr)_clamp(240px,28vw,340px)]">
                <div className="rounded-[clamp(1rem,2vw,1.5rem)] border border-white/20 p-[clamp(1rem,2.3vw,1.5rem)] bg-black/40 border-white/10">
                  <h3 className="text-[clamp(1rem,1.6vw,1.2rem)] font-semibold text-white">
                    편집 요청 & 체크리스트
                  </h3>
                  <p className="mt-2 text-[clamp(0.8rem,1.4vw,0.95rem)] text-white/60">
                    자막, 장면 전환, 강조 포인트 등 수정 포인트를 상세히 기술하세요.
                  </p>
                  <textarea
                    value={editNotes}
                    onChange={(event) => setEditNotes(event.target.value)}
                    rows={6}
                    className="mt-4 w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="예: 컷 3 하이라이트 확대 / CTA 0.6초 추가 / 전환 효과 줄이기"
                  />
                </div>
                <div className="rounded-[clamp(1rem,2vw,1.5rem)] border border-white/20 p-[clamp(1rem,2.3vw,1.5rem)] bg-black/40 border-white/10">
                  <h3 className="text-[clamp(1rem,1.6vw,1.2rem)] font-semibold text-white">
                    최종 렌더 요약
                  </h3>
                  <ul className="mt-4 space-y-2 text-[clamp(0.85rem,1.4vw,0.95rem)] text-white/60">
                    <li>렌더 길이: {renderDuration}</li>
                    <li>화면 비율: {renderRatio}</li>
                    <li>프레임: {renderFps}fps</li>
                    <li>자막 포함: 기본 세팅</li>
                  </ul>
                  <button
                    type="button"
                    onClick={handleDownloadEditNotes}
                    className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(15,23,42,0.25)] transition hover:bg-slate-800 flex items-center justify-center gap-2"
                  >
                    <FiDownload />
                    편집 요청서 다운로드
                  </button>
                </div>
              </div>
            )}

            <div className="mt-[clamp(1.8rem,3vw,3rem)] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handlePrev}
                disabled={!canGoPrev}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/60 transition hover:border-slate-300 disabled:opacity-40"
              >
                <FiChevronLeft />
                이전 단계
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(255,69,91,0.3)] transition hover:bg-red-500 disabled:opacity-40"
              >
                다음 단계
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default VideoPage;
