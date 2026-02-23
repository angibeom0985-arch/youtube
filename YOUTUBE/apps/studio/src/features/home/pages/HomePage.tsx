import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";
import type { User } from "@supabase/supabase-js";
import LoginModal from "@/components/LoginModal";

interface HomePageProps {
  basePath?: string;
  allowUnauthedNavigation?: boolean;
}

const enableKakaoLogin = import.meta.env.VITE_ENABLE_KAKAO_LOGIN === "true";

const HomePage: React.FC<HomePageProps> = ({
  basePath = "",
  allowUnauthedNavigation = false,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState<string>("");
  const navigate = useNavigate();

  const normalizedBasePath = basePath && basePath != "/" ? basePath.replace(/\/$/, "") : "";
  const benchmarkingPath = `${normalizedBasePath}/benchmarking` || "/benchmarking";
  const scriptPath = `${normalizedBasePath}/script` || "/script";
  const imagePath = `${normalizedBasePath}/image` || "/image";
  const ttsPath = `${normalizedBasePath}/tts` || "/tts";
  const videoPath = `${normalizedBasePath}/video` || "/video";

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get("from");

    if (from && !user) {
      const pageNames: Record<string, string> = {
        "/tts": "TTS(음성 변환)",
        "/script": "대본 생성",
        "/image": "이미지 생성",
        "/benchmarking": "벤치마킹",
        "/video": "영상 제작",
      };

      const pageName = pageNames[from] || "해당 페이지";
      setRedirectMessage(`${pageName} 기능을 사용하려면 로그인이 필요합니다.`);
    }
  }, [user]);

  useEffect(() => {
    const hash = window.location.hash || "";
    const hasAuthHash =
      hash.includes("access_token") || hash.includes("refresh_token") || hash.includes("error");

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);

      if (session) {
        const urlParams = new URLSearchParams(window.location.search);
        const from = urlParams.get("from");

        if (from && from !== "/") {
          navigate(from);
          return;
        }

        if (hasAuthHash) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      if (session) {
        const urlParams = new URLSearchParams(window.location.search);
        const from = urlParams.get("from");

        if (from && from !== "/") {
          navigate(from);
          return;
        }

        if (hasAuthHash) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleAuth = async () => {
    const redirectTo = window.location.origin;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  };

  const handleKakaoAuth = async () => {
    if (!enableKakaoLogin) return;
    const redirectTo = window.location.origin;

    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo,
        scopes: "profile_nickname",
        queryParams: {
          prompt: "consent",
        },
      },
    });
  };

  const handleNavigation = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    if (!user && !allowUnauthedNavigation) {
      setIsLoginModalOpen(true);
    } else {
      navigate(path);
    }
  };

  const benchmarkingCardStyle = {
    borderColor: "var(--tone-image-purple, #a855f7)",
    background:
      "linear-gradient(135deg, rgba(168, 85, 247, 0.38), rgba(168, 85, 247, 0.16) 48%, transparent 100%)",
  } as React.CSSProperties;

  const scriptCardStyle = {
    borderColor: "var(--tone-image-orange, #ea580c)",
    background:
      "linear-gradient(135deg, rgba(234, 88, 12, 0.38), rgba(234, 88, 12, 0.16) 48%, transparent 100%)",
  } as React.CSSProperties;

  const imageCardStyle = {
    borderColor: "var(--tone-image-blue, #2563eb)",
    background:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.35), rgba(37, 99, 235, 0.14) 48%, transparent 100%)",
  } as React.CSSProperties;

  const ttsCardStyle = {
    borderColor: "var(--tone-image-green, #16a34a)",
    background:
      "linear-gradient(135deg, rgba(22, 163, 74, 0.32), rgba(22, 163, 74, 0.12) 48%, transparent 100%)",
  } as React.CSSProperties;

  const videoCardStyle = {
    borderColor: "var(--tone-brand-red, #ff0000)",
    background:
      "linear-gradient(135deg, rgba(239, 68, 68, 0.38), rgba(249, 115, 22, 0.18) 48%, transparent 100%)",
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-black text-white relative">
      <div className="absolute top-0 right-0 p-6 flex gap-3 z-10 items-center">
        {user ? (
          <div className="flex items-center gap-3">
            <Link
              to="/pricing"
              className="px-4 py-2 text-sm font-bold text-amber-100 border border-amber-400/50 rounded-full bg-amber-500/20 hover:bg-amber-500/30 transition-all flex items-center gap-2 shadow-[0_0_18px_rgba(251,191,36,0.25)]"
            >
              <span>크레딧 구매</span>
            </Link>
            <Link
              to="/mypage"
              className="px-4 py-2 text-sm font-bold text-red-100 border border-red-500/40 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-all flex items-center gap-2"
            >
              <span>마이페이지</span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-6">
              {enableKakaoLogin && (
                <button
                  onClick={handleKakaoAuth}
                  className="px-8 py-4 text-lg font-black bg-red-500 text-white rounded-2xl hover:bg-red-400 transition-all shadow-[0_0_30px_rgba(239,68,68,0.35)] hover:shadow-[0_0_40px_rgba(239,68,68,0.5)] transform hover:-translate-y-1 active:scale-95 border border-red-400"
                >
                  카카오 로그인
                </button>
              )}
              <button
                onClick={handleGoogleAuth}
                className="px-8 py-4 text-lg font-black text-red-100 border-2 border-red-500/40 rounded-2xl bg-red-500/10 hover:bg-red-500/20 hover:border-red-400 transition-all active:scale-95"
              >
                로그인
              </button>
              <button
                onClick={handleGoogleAuth}
                className="px-8 py-4 text-lg font-black bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white rounded-2xl hover:from-red-500 hover:via-red-400 hover:to-orange-400 transition-all shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,0.6)] transform hover:-translate-y-1 active:scale-95 border border-red-400/40"
              >
                무료 회원가입
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16">
        {redirectMessage && !user && (
          <div className="mb-8 w-full max-w-3xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500/50 rounded-2xl p-6 text-center animate-pulse">
            <p className="text-xl font-bold text-white mb-2">{redirectMessage}</p>
            <p className="text-red-200">아래 버튼을 클릭해서 로그인해 주세요.</p>
          </div>
        )}

        <div className="mx-auto w-full max-w-4xl text-center">
          <div className="inline-flex items-center rounded-full border border-red-400/30 bg-red-500/10 px-4 py-1 text-xs font-bold tracking-[0.16em] text-red-100/90">
            CREATOR SUITE
          </div>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-[0.01em] sm:text-5xl lg:text-6xl bg-gradient-to-r from-red-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
            DOT 데이비 옴니튜브
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base font-medium leading-relaxed text-slate-300 sm:text-lg">
            아이디어부터 대본, 이미지, 편집 흐름까지.
            <br className="hidden sm:block" />
            제작의 점들을 하나의 수익 라인으로 연결하는 YouTube 제작 워크스페이스.
          </p>
        </div>

        <div className="mt-10 w-full">
          <a
            href={videoPath}
            onClick={(e) => handleNavigation(e, videoPath)}
            style={videoCardStyle}
            className="group relative block w-full overflow-hidden rounded-3xl border p-8 transition duration-300 hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-red-600/25 px-4 py-1.5 text-xs font-black text-red-100 animate-pulse ring-1 ring-red-300/60 shadow-[0_0_18px_rgba(248,113,113,0.55)]">
                  인기
                </span>
                <h2 className="mt-4 text-3xl font-black">영상 제작 스튜디오</h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  대본 생성, 이미지 제작, 영상 패키징, 편집 체크리스트 통합.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 text-sm lg:items-end lg:text-right">
                <span className="rounded-full bg-black/40 px-4 py-2 font-semibold text-slate-200">대본 → 이미지 → 영상 → 편집</span>
                <span className="inline-flex w-fit max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-5 py-2 text-sm font-black text-white shadow-[0_0_18px_rgba(185,28,28,0.55)] bg-red-700 group-hover:bg-red-600 transition-colors">
                  영상 제작 시작 -&gt;
                </span>
              </div>
            </div>
          </a>
        </div>

        <div className="mt-10 grid w-full gap-6 sm:grid-cols-2">
          <a
            href={benchmarkingPath}
            onClick={(e) => handleNavigation(e, benchmarkingPath)}
            style={benchmarkingCardStyle}
            className="group rounded-2xl border p-6 transition duration-300 hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="mt-2 text-2xl font-bold">벤치마킹 영상 발굴</h2>
                <p
                  className="mt-3 text-sm text-slate-100/80 overflow-hidden"
                  style={{ display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" }}
                >
                  키워드 기반 영상 탐색, 채널 규모 대비 조회 효율 분석.
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex w-fit max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-purple, #a855f7)" }}
              >
                영상 발굴 시작 -&gt;
              </span>
            </div>
          </a>

          <a
            href={scriptPath}
            onClick={(e) => handleNavigation(e, scriptPath)}
            style={scriptCardStyle}
            className="group rounded-2xl border p-6 transition duration-300 hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="mt-2 text-2xl font-bold">대본 생성</h2>
                <p className="mt-3 text-sm text-slate-100/80 truncate whitespace-nowrap overflow-hidden">
                  레퍼런스 대본 분석, 내 채널용 대본 구조화.
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex w-fit max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-orange, #ea580c)" }}
              >
                대본 생성 시작 -&gt;
              </span>
            </div>
          </a>

          <a
            href={imagePath}
            onClick={(e) => handleNavigation(e, imagePath)}
            style={imageCardStyle}
            className="group rounded-2xl border p-6 transition duration-300 hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="mt-2 text-2xl font-bold">이미지 생성</h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  대본 기반 이미지 생성, 스토리보드 구성.
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex w-fit max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-blue, #2563eb)" }}
              >
                이미지 생성 시작 -&gt;
              </span>
            </div>
          </a>

          <a
            href={ttsPath}
            onClick={(e) => handleNavigation(e, ttsPath)}
            style={ttsCardStyle}
            className="group rounded-2xl border p-6 transition duration-300 hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="mt-2 text-2xl font-bold">TTS 생성</h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  대본 음성 변환, 나레이션 오디오 생성.
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex w-fit max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-green, #16a34a)" }}
              >
                TTS 생성 시작 -&gt;
              </span>
            </div>
          </a>
        </div>

        <div className="mt-12 text-xs text-slate-400/80">
          <span>제작자: 데이비</span>
          <span className="block">
            문의 :{" "}
            <a
              href="mailto:david153.official@gmail.com"
              className="underline underline-offset-2 hover:text-slate-200"
            >
              david153.official@gmail.com
            </a>
          </span>
        </div>
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginGoogle={handleGoogleAuth}
        onLoginKakao={enableKakaoLogin ? handleKakaoAuth : undefined}
      />
    </div>
  );
};

export default HomePage;
