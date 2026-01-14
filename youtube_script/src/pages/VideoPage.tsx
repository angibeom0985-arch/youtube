import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiDownload,
  FiEdit3,
  FiFilm,
  FiImage,
  FiFileText,
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
  checklist: "video_project_checklist",
  renderNotes: "video_project_render_notes",
  renderDuration: "video_project_render_duration",
  renderRatio: "video_project_render_ratio",
  renderFps: "video_project_render_fps",
  editNotes: "video_project_edit_notes",
};

type StepId = "script" | "image" | "render" | "edit";

const defaultChecklist: Record<StepId, boolean> = {
  script: false,
  image: false,
  render: false,
  edit: false,
};

const getStoredString = (key: string, fallback = ""): string => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    console.error("VideoPage storage read failed:", error);
    return fallback;
  }
};

const getStoredJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.error("VideoPage storage parse failed:", error);
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

const setStoredJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
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
  const [activeStep, setActiveStep] = useState<StepId | null>("script");
  const [loadedSteps, setLoadedSteps] = useState<Record<StepId, boolean>>({
    script: true,
    image: false,
    render: false,
    edit: false,
  });
  const [projectTitle, setProjectTitle] = useState(() =>
    getStoredString(STORAGE_KEYS.title, "내 영상 프로젝트")
  );
  const [projectNotes, setProjectNotes] = useState(() =>
    getStoredString(STORAGE_KEYS.notes)
  );
  const [checklist, setChecklist] = useState<Record<StepId, boolean>>(() =>
    getStoredJson(STORAGE_KEYS.checklist, defaultChecklist)
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
  useEffect(() => setStoredJson(STORAGE_KEYS.checklist, checklist), [checklist]);
  useEffect(() => setStoredValue(STORAGE_KEYS.renderNotes, renderNotes), [renderNotes]);
  useEffect(() => setStoredValue(STORAGE_KEYS.renderDuration, renderDuration), [renderDuration]);
  useEffect(() => setStoredValue(STORAGE_KEYS.renderRatio, renderRatio), [renderRatio]);
  useEffect(() => setStoredValue(STORAGE_KEYS.renderFps, renderFps), [renderFps]);
  useEffect(() => setStoredValue(STORAGE_KEYS.editNotes, editNotes), [editNotes]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleToggleStep = (step: StepId) => {
    setActiveStep((prev) => (prev === step ? null : step));
    setLoadedSteps((prev) => ({ ...prev, [step]: true }));
  };

  const stepProgress = useMemo(() => {
    const total = Object.keys(defaultChecklist).length;
    const completed = Object.values(checklist).filter(Boolean).length;
    return { total, completed };
  }, [checklist]);

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

  const handleDownloadEditNotes = () => {
    const content = editNotes.trim() || "편집 노트가 비어 있습니다.";
    const fileName = `${projectTitle || "video-project"}-edit-notes.txt`;
    downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), fileName);
    setChecklist((prev) => ({ ...prev, edit: true }));
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
        "이 패키지는 AI 영상 제작 작업용입니다.\nassets 폴더에는 이미지/오디오/영상 소스가 들어있습니다.\nmanifest.json에는 프로젝트 설정과 파일 목록이 기록되어 있습니다."
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const fileName = `${projectTitle || "video-project"}-package.zip`;
      downloadBlob(blob, fileName);
      setChecklist((prev) => ({ ...prev, render: true }));
    } catch (error) {
      console.error("영상 패키징 실패:", error);
      alert("패키지 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsPackaging(false);
    }
  };

  const steps = [
    {
      id: "script" as StepId,
      label: "대본 생성",
      description: "영상의 전체 흐름과 대사를 완성합니다.",
      accent: "from-orange-500/20 to-transparent border-orange-500/40",
      icon: <FiFileText />,
      iframeSrc: "/script",
    },
    {
      id: "image" as StepId,
      label: "이미지 생성",
      description: "스토리보드와 이미지 소스를 생성합니다.",
      accent: "from-blue-500/20 to-transparent border-blue-500/40",
      icon: <FiImage />,
      iframeSrc: "/image",
    },
    {
      id: "render" as StepId,
      label: "영상 생성",
      description: "소스를 모아 렌더링 패키지를 만듭니다.",
      accent: "from-emerald-500/20 to-transparent border-emerald-500/40",
      icon: <FiFilm />,
    },
    {
      id: "edit" as StepId,
      label: "영상 편집",
      description: "편집 지시사항과 체크리스트를 정리합니다.",
      accent: "from-purple-500/20 to-transparent border-purple-500/40",
      icon: <FiEdit3 />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white relative">
      <div className="absolute top-0 right-0 p-4 sm:p-6 flex gap-3 z-50 items-center">
        {user ? (
          <div className="flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <div className="flex items-center gap-2">
              {user.user_metadata.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border border-red-500/40"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                  <FiUser className="text-red-400" />
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white truncate max-w-[100px]">
                  {user.user_metadata.full_name || user.email?.split("@")[0]}
                </span>
                <span className="text-[10px] text-red-400/70 truncate max-w-[100px]">
                  {user.email}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-bold px-3 py-1 bg-red-500/10 hover:bg-red-500/20 hover:text-red-200 rounded-full transition-all border border-red-500/20"
            >
              로그아웃
            </button>
          </div>
        ) : null}
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-red-300 hover:text-red-200 transition-colors"
        >
          홈으로 돌아가기
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            올인원 영상 제작 스튜디오
          </h1>
          <p className="mt-3 text-slate-300 max-w-2xl">
            대본 생성부터 이미지, 영상 패키징, 편집 정리까지 한 페이지에서
            이어서 진행하세요.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <h2 className="text-lg font-semibold text-white mb-4">프로젝트 설정</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    프로젝트 이름
                  </label>
                  <input
                    value={projectTitle}
                    onChange={(event) => setProjectTitle(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="예: 2024 라이프스타일 브이로그"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    영상 메모
                  </label>
                  <textarea
                    value={projectNotes}
                    onChange={(event) => setProjectNotes(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    rows={4}
                    placeholder="콘셉트, 타깃, 분위기를 간단히 적어두세요."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">진행 체크리스트</h2>
                <span className="text-xs text-slate-400">
                  {stepProgress.completed}/{stepProgress.total} 완료
                </span>
              </div>
              <div className="space-y-3">
                {steps.map((step) => (
                  <label
                    key={step.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 text-slate-200">
                      <FiCheckCircle className={checklist[step.id] ? "text-red-400" : "text-slate-500"} />
                      {step.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={checklist[step.id]}
                      onChange={(event) =>
                        setChecklist((prev) => ({
                          ...prev,
                          [step.id]: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-red-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-5">
            {steps.map((step, index) => {
              const isOpen = activeStep === step.id;
              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border bg-gradient-to-br ${step.accent} bg-black/40 p-5 transition-all`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleStep(step.id)}
                    className="flex w-full items-start justify-between text-left"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-xl text-white/80">{step.icon}</div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400">
                          STEP {index + 1}
                        </p>
                        <h3 className="text-xl font-bold text-white">{step.label}</h3>
                        <p className="mt-1 text-sm text-slate-300">{step.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <span>{isOpen ? "접기" : "열기"}</span>
                      {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-5 space-y-4">
                      {step.id === "script" && (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
                            <span>대본 생성 도구를 바로 실행합니다.</span>
                            <a
                              href={step.iframeSrc}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-orange-500/40 px-4 py-1 text-xs font-semibold text-orange-300 hover:border-orange-400 hover:text-orange-200 transition-colors"
                            >
                              새 탭에서 열기
                            </a>
                          </div>
                          {loadedSteps.script && (
                            <div className="overflow-hidden rounded-2xl border border-orange-500/20 bg-black/60">
                              <iframe
                                title="대본 생성"
                                src={step.iframeSrc}
                                className="h-[80vh] min-h-[520px] w-full"
                                loading="lazy"
                              />
                            </div>
                          )}
                        </>
                      )}

                      {step.id === "image" && (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
                            <span>이미지 생성 도구를 한 화면에서 이어서 사용하세요.</span>
                            <a
                              href={step.iframeSrc}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-blue-500/40 px-4 py-1 text-xs font-semibold text-blue-300 hover:border-blue-400 hover:text-blue-200 transition-colors"
                            >
                              새 탭에서 열기
                            </a>
                          </div>
                          {loadedSteps.image && (
                            <div className="overflow-hidden rounded-2xl border border-blue-500/20 bg-black/60">
                              <iframe
                                title="이미지 생성"
                                src={step.iframeSrc}
                                className="h-[80vh] min-h-[520px] w-full"
                                loading="lazy"
                              />
                            </div>
                          )}
                        </>
                      )}

                      {step.id === "render" && (
                        <div className="space-y-5">
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                길이
                              </label>
                              <select
                                value={renderDuration}
                                onChange={(event) => setRenderDuration(event.target.value)}
                                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              >
                                <option value="30s">30초</option>
                                <option value="60s">1분</option>
                                <option value="180s">3분</option>
                                <option value="300s">5분</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                비율
                              </label>
                              <select
                                value={renderRatio}
                                onChange={(event) => setRenderRatio(event.target.value)}
                                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              >
                                <option value="16:9">16:9</option>
                                <option value="9:16">9:16</option>
                                <option value="1:1">1:1</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                FPS
                              </label>
                              <select
                                value={renderFps}
                                onChange={(event) => setRenderFps(event.target.value)}
                                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              >
                                <option value="24">24</option>
                                <option value="30">30</option>
                                <option value="60">60</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                              렌더 메모
                            </label>
                            <textarea
                              value={renderNotes}
                              onChange={(event) => setRenderNotes(event.target.value)}
                              rows={3}
                              className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              placeholder="컷 편집 규칙, 화면 전환 속도 등을 적어두세요."
                            />
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-white">소스 파일 업로드</p>
                                <p className="text-xs text-slate-400">
                                  이미지, 음성, BGM 파일을 모아서 패키지로 저장합니다.
                                </p>
                              </div>
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-500/40 px-4 py-2 text-xs font-semibold text-emerald-200 hover:border-emerald-400">
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
                            </div>

                            <div className="mt-4 space-y-2">
                              {assetFiles.length === 0 && (
                                <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
                                  아직 추가된 파일이 없습니다.
                                </div>
                              )}
                              {assetFiles.map((file, index) => (
                                <div
                                  key={`${file.name}-${index}`}
                                  className="flex items-center justify-between rounded-lg border border-white/5 bg-black/40 px-3 py-2 text-sm"
                                >
                                  <div>
                                    <p className="text-slate-200">{file.name}</p>
                                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveFile(index)}
                                    className="text-xs text-slate-400 hover:text-red-300"
                                  >
                                    삭제
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handlePackageDownload}
                            disabled={!assetFiles.length || isPackaging}
                            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-[0_0_18px_rgba(16,185,129,0.25)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center gap-2"
                          >
                            <FiDownload />
                            {isPackaging ? "패키지 만드는 중..." : "렌더 패키지 다운로드"}
                          </button>
                        </div>
                      )}

                      {step.id === "edit" && (
                        <div className="space-y-4">
                          <p className="text-sm text-slate-300">
                            편집 방향, 자막 스타일, 음악 포인트를 정리해두세요.
                          </p>
                          <textarea
                            value={editNotes}
                            onChange={(event) => setEditNotes(event.target.value)}
                            rows={5}
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                            placeholder="예: 인트로 3초 내에 훅 / 컷 전환은 0.6초 / 자막은 노란 강조"
                          />
                          <button
                            type="button"
                            onClick={handleDownloadEditNotes}
                            className="w-full rounded-xl bg-purple-500 px-4 py-3 text-sm font-bold text-white shadow-[0_0_18px_rgba(168,85,247,0.25)] transition hover:bg-purple-400 flex items-center justify-center gap-2"
                          >
                            <FiDownload />
                            편집 노트 다운로드
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <UserCreditSidebar user={user} />
    </div>
  );
};

export default VideoPage;
