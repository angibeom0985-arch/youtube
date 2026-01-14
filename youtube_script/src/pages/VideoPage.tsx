
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
  FiLogOut,
  FiMic,
  FiUpload,
  FiUser,
} from "react-icons/fi";
import JSZip from "jszip";
import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";
import UserCreditSidebar from "../components/UserCreditSidebar";

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
    label: "??",
    description: "????? ?? ?? ??? ??? ?????.",
    icon: <FiCheckCircle />,
  },
  {
    id: "script",
    label: "?? ??",
    description: "?? ???? ?? ???? ? ?? ?????.",
    icon: <FiFileText />,
  },
  {
    id: "tts",
    label: "?? ??",
    description: "??? ???? ??? ????? ????.",
    icon: <FiMic />,
  },
  {
    id: "image",
    label: "??? ??",
    description: "??? ?? ???? ?????? ?????.",
    icon: <FiImage />,
  },
  {
    id: "generate",
    label: "?? ??",
    description: "???/??/???? ?? ?? ???? ?????.",
    icon: <FiFilm />,
  },
  {
    id: "render",
    label: "?? ???",
    description: "?? ?? ?????? ?? ???? ?????.",
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
    getStoredString(STORAGE_KEYS.title, "?? 1500? ??? ??? ??")
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
      console.error("??? ?? ??:", error);
      alert("???? ??? ?????. ?? ??????.");
    } finally {
      setIsPackaging(false);
    }
  };

  const handleDownloadEditNotes = () => {
    const content = editNotes.trim() || "?? ?? ??? ?? ????.";
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
    <div className="min-h-screen bg-[#f5f6fb] text-slate-900 relative overflow-hidden">
      <div className="absolute -top-32 -right-24 h-[clamp(200px,30vw,360px)] w-[clamp(200px,30vw,360px)] rounded-full bg-gradient-to-br from-indigo-200/70 via-purple-200/40 to-pink-200/40 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-[clamp(220px,34vw,380px)] w-[clamp(220px,34vw,380px)] rounded-full bg-gradient-to-tr from-blue-200/60 via-sky-200/30 to-violet-200/30 blur-3xl" />

      <div className="absolute top-0 right-0 p-4 sm:p-6 flex gap-3 z-50 items-center">
        {user ? (
          <div className="flex items-center gap-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              {user.user_metadata.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border border-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <FiUser className="text-slate-500" />
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                  {user.user_metadata.full_name || user.email?.split("@")[0]}
                </span>
                <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                  {user.email}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-bold px-3 py-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-full transition-all border border-slate-200 inline-flex items-center gap-1"
            >
              <FiLogOut className="text-sm" />
              ????
            </button>
          </div>
        ) : null}
      </div>

      <div className="mx-auto max-w-[min(1200px,94vw)] px-[clamp(1rem,3vw,2rem)] py-[clamp(2rem,5vw,4rem)]">
        <Link to="/" className="text-sm text-slate-400 hover:text-slate-600">
          ????? ??
        </Link>

        <div className="mt-5">
          <h1 className="text-[clamp(1.8rem,2.8vw,2.8rem)] font-black text-slate-900">
            ??? ?? ?? ????
          </h1>
          <p className="mt-2 text-[clamp(0.9rem,1.6vw,1rem)] text-slate-500">
            ???? ??, ??, ???, ?? ??, ????? ? ???? ???? ?????.
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
                    className="relative flex flex-col items-center gap-2 text-[clamp(0.65rem,1vw,0.75rem)] font-semibold text-slate-500"
                  >
                    <span
                      className={`flex h-[clamp(2rem,3vw,2.6rem)] w-[clamp(2rem,3vw,2.6rem)] items-center justify-center rounded-full border-2 transition-all ${
                        isDone
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : isActive
                            ? "border-indigo-500 text-indigo-600 bg-white"
                            : "border-slate-300 bg-white text-slate-400"
                      }`}
                    >
                      {isDone ? <FiCheckCircle className="text-white" /> : index + 1}
                    </span>
                    <span className={`${isActive ? "text-indigo-600" : "text-slate-500"}`}>
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-[clamp(1.8rem,3vw,3rem)] rounded-[clamp(1.25rem,2.5vw,2rem)] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] border border-slate-200">
          <div className="h-1 w-full rounded-t-[clamp(1.25rem,2.5vw,2rem)] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400" />
          <div className="p-[clamp(1.25rem,3vw,2.5rem)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[clamp(0.6rem,1vw,0.7rem)] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  STEP {currentStep + 1}
                </p>
                <h2 className="text-[clamp(1.3rem,2.4vw,2rem)] font-bold text-slate-900 mt-2">
                  {activeStep.label}
                </h2>
                <p className="text-[clamp(0.85rem,1.5vw,1rem)] text-slate-500 mt-1">
                  {activeStep.description}
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-400">{progressLabel}</span>
            </div>

            {activeStep.id === "setup" && (
              <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)] grid gap-[clamp(1rem,2vw,1.5rem)] lg:grid-cols-2">
                <div className="rounded-[clamp(1rem,2vw,1.5rem)] border border-slate-200 p-[clamp(1rem,2.3vw,1.5rem)] bg-slate-50">
                  <h3 className="text-[clamp(1rem,1.6vw,1.2rem)] font-semibold text-slate-900">
                    ?? ??? ??? ?????
                  </h3>
                  <p className="mt-2 text-[clamp(0.8rem,1.4vw,0.95rem)] text-slate-500">
                    ??? ?? ??? ???? ??? ????????.
                  </p>
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500">???? ??</label>
                      <input
                        value={projectTitle}
                        onChange={(event) => setProjectTitle(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        placeholder="?: ?? 1500? ??? ??? ??"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500">?? ??</label>
                      <textarea
                        value={projectNotes}
                        onChange={(event) => setProjectNotes(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        rows={5}
                        placeholder="??, ?, CTA ? ?? ???? ??? ???."
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-[clamp(1rem,2vw,1.5rem)] border border-slate-200 p-[clamp(1rem,2.3vw,1.5rem)] bg-slate-50">
                  <h3 className="text-[clamp(1rem,1.6vw,1.2rem)] font-semibold text-slate-900">
                    ?? ?? ?? ??
                  </h3>
                  <p className="mt-2 text-[clamp(0.8rem,1.4vw,0.95rem)] text-slate-500">
                    ????? ??, ??? ??? ?? ?????.
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500">??</label>
                      <select
                        value={renderDuration}
                        onChange={(event) => setRenderDuration(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      >
                        <option value="30s">30?</option>
                        <option value="60s">1?</option>
                        <option value="180s">3?</option>
                        <option value="300s">5?</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500">??</label>
                      <select
                        value={renderRatio}
                        onChange={(event) => setRenderRatio(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      >
                        <option value="16:9">16:9</option>
                        <option value="9:16">9:16</option>
                        <option value="1:1">1:1</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500">FPS</label>
                      <select
                        value={renderFps}
                        onChange={(event) => setRenderFps(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      >
                        <option value="24">24</option>
                        <option value="30">30</option>
                        <option value="60">60</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-6">
                    <label className="text-xs font-semibold text-slate-500">?? ??</label>
                    <textarea
                      value={renderNotes}
                      onChange={(event) => setRenderNotes(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      rows={4}
                      placeholder="??, ??, ?? ?? ? ??? ??? ?????."
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStep.id === "script" && (
              <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                  <span>?? ?? ??? ? ???? ?? ??? ? ???.</span>
                  <a
                    href="/script"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-indigo-200 px-4 py-1 text-xs font-semibold text-indigo-500 hover:border-indigo-300"
                  >
                    ? ??? ??
                  </a>
                </div>
                <div className="mt-4 overflow-hidden rounded-[clamp(1rem,2vw,1.5rem)] border border-slate-200">
                  <iframe
                    title="?? ??"
                    src="/script"
                    className="h-[clamp(420px,72vh,760px)] w-full"
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            {activeStep.id === "tts" && (
              <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                  <span>????? ???? ?? AI ???? ??????.</span>
                  <a
                    href="/tts"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-indigo-200 px-4 py-1 text-xs font-semibold text-indigo-500 hover:border-indigo-300"
                  >
                    ? ??? ??
                  </a>
                </div>
                <div className="mt-4 overflow-hidden rounded-[clamp(1rem,2vw,1.5rem)] border border-slate-200">
                  <iframe
                    title="?? ??"
                    src="/tts"
                    className="h-[clamp(420px,72vh,760px)] w-full"
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            {activeStep.id === "image" && (
              <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)]">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                  <span>??? ?????? ?? ???? ??? ? ????.</span>
                  <a
                    href="/image"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-indigo-200 px-4 py-1 text-xs font-semibold text-indigo-500 hover:border-indigo-300"
                  >
                    ? ??? ??
                  </a>
                </div>
                <div className="mt-4 overflow-hidden rounded-[clamp(1rem,2vw,1.5rem)] border border-slate-200">
                  <iframe
                    title="??? ??"
                    src="/image"
                    className="h-[clamp(420px,72vh,760px)] w-full"
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            {activeStep.id === "generate" && (
              <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)] grid gap-[clamp(1rem,2vw,1.5rem)] lg:grid-cols-[minmax(0,1fr)_clamp(240px,28vw,340px)]">
                <div className="rounded-[clamp(1rem,2vw,1.5rem)] border border-slate-200 p-[clamp(1rem,2.3vw,1.5rem)] bg-slate-50">
                  <h3 className="text-[clamp(1rem,1.6vw,1.2rem)] font-semibold text-slate-900">
                    ?? ??? ?? ???
                  </h3>
                  <p className="mt-2 text-[clamp(0.8rem,1.4vw,0.95rem)] text-slate-500">
                    ???, ??, BGM? ??? ???? ??????.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-500 hover:border-indigo-300">
                      <FiUpload />
                      ?? ??
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,audio/*"
                        onChange={handleFilesAdded}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-slate-400">
                      {assetFiles.length ? `${assetFiles.length}? ?? ???` : "?? ??? ??"}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {assetFiles.length === 0 && (
                      <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                        ???? ??? ??? ?????.
                      </div>
                    )}
                    {assetFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="text-slate-700">{file.name}</p>
                          <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className="text-xs text-slate-400 hover:text-red-500"
                        >
                          ??
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[clamp(1rem,2vw,1.5rem)] border border-slate-200 p-[clamp(1rem,2.3vw,1.5rem)] bg-slate-50">
                  <h3 className="text-[clamp(1rem,1.6vw,1.2rem)] font-semibold text-slate-900">
                    ?? ?? ??
                  </h3>
                  <ul className="mt-4 space-y-2 text-[clamp(0.85rem,1.4vw,0.95rem)] text-slate-500">
                    <li>??: {renderDuration}</li>
                    <li>??: {renderRatio}</li>
                    <li>FPS: {renderFps}</li>
                    <li>???: {assetFiles.length}?</li>
                  </ul>
                  <button
                    type="button"
                    onClick={handlePackageDownload}
                    disabled={!assetFiles.length || isPackaging}
                    className="mt-6 w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(79,70,229,0.2)] transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    <FiDownload />
                    {isPackaging ? "??? ?? ?..." : "?? ??? ????"}
                  </button>
                </div>
              </div>
            )}

            {activeStep.id === "render" && (
              <div className="mt-[clamp(1.5rem,2.5vw,2.5rem)] grid gap-[clamp(1rem,2vw,1.5rem)] lg:grid-cols-[minmax(0,1fr)_clamp(240px,28vw,340px)]">
                <div className="rounded-[clamp(1rem,2vw,1.5rem)] border border-slate-200 p-[clamp(1rem,2.3vw,1.5rem)] bg-slate-50">
                  <h3 className="text-[clamp(1rem,1.6vw,1.2rem)] font-semibold text-slate-900">
                    ?? ?? & ?????
                  </h3>
                  <p className="mt-2 text-[clamp(0.8rem,1.4vw,0.95rem)] text-slate-500">
                    ??, ??, ? ?? ? ?? ???? ?????.
                  </p>
                  <textarea
                    value={editNotes}
                    onChange={(event) => setEditNotes(event.target.value)}
                    rows={6}
                    className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="?: ? 3 ????? ?? / CTA 0.6? ?? / ?? ?? ???"
                  />
                </div>
                <div className="rounded-[clamp(1rem,2vw,1.5rem)] border border-slate-200 p-[clamp(1rem,2.3vw,1.5rem)] bg-slate-50">
                  <h3 className="text-[clamp(1rem,1.6vw,1.2rem)] font-semibold text-slate-900">
                    ?? ?? ??
                  </h3>
                  <ul className="mt-4 space-y-2 text-[clamp(0.85rem,1.4vw,0.95rem)] text-slate-500">
                    <li>?? ??: {renderDuration}</li>
                    <li>?? ??: {renderRatio}</li>
                    <li>???: {renderFps}fps</li>
                    <li>??: ?? ??</li>
                  </ul>
                  <button
                    type="button"
                    onClick={handleDownloadEditNotes}
                    className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(15,23,42,0.25)] transition hover:bg-slate-800 flex items-center justify-center gap-2"
                  >
                    <FiDownload />
                    ?? ??? ????
                  </button>
                </div>
              </div>
            )}

            <div className="mt-[clamp(1.8rem,3vw,3rem)] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handlePrev}
                disabled={!canGoPrev}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-500 transition hover:border-slate-300 disabled:opacity-40"
              >
                <FiChevronLeft />
                ?? ??
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-6 py-2 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(99,102,241,0.25)] transition hover:bg-indigo-400 disabled:opacity-40"
              >
                ?? ??
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>

      <UserCreditSidebar user={user} />
    </div>
  );
};

export default VideoPage;
