import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";
import LoginModal from "../components/LoginModal";
import UserCreditSidebar from "../components/UserCreditSidebar";

interface HomePageProps {
  basePath?: string;
}

const HomePage: React.FC<HomePageProps> = ({ basePath = "" }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const navigate = useNavigate();
  const normalizedBasePath = basePath && basePath != "/" ? basePath.replace(/\/$/, "") : "";
  const benchmarkingPath = `${normalizedBasePath}/benchmarking` || "/benchmarking";
  const scriptPath = `${normalizedBasePath}/script` || "/script";
  const imagePath = `${normalizedBasePath}/image` || "/image";
  const ttsPath = `${normalizedBasePath}/tts` || "/tts";
  const videoPath = `${normalizedBasePath}/video` || "/video";

  useEffect(() => {
    // URL에서 해시(#) 제거
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

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

  const handleAuth = async () => {
    // 현재 접속한 도메인을 기준으로 리다이렉트 URL 설정
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleNavigation = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    if (!user) {
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
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
            <span className="text-sm text-slate-300">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-6">
              <button
                onClick={handleAuth}
                className="px-8 py-4 text-lg font-black text-white border-2 border-white/20 rounded-2xl hover:bg-white/10 hover:border-white/40 transition-all active:scale-95"
              >
                로그인
              </button>
              <button
                onClick={handleAuth}
                className="px-8 py-4 text-lg font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] transform hover:-translate-y-1 active:scale-95 border border-white/20"
              >
                지금 무료 회원가입
              </button>
            </div>
            <span className="hidden lg:inline-block text-lg font-black text-yellow-400 animate-bounce bg-yellow-400/20 px-6 py-2.5 rounded-full border-2 border-yellow-400/30 shadow-[0_0_20px_rgba(250,204,21,0.4)]">
              🎁 신규 가입 시 30 크레딧 즉시 지급!
            </span>
          </div>
        )}
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16">
        <div className="text-center">
          <p className="text-5xl font-black tracking-[0.08em] text-[color:var(--tone-brand-red,#ff0000)] sm:text-6xl lg:text-7xl">
            유튜브 팩토리
          </p>
          <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
            원하는 기능을 선택하세요
          </h1>
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
                <span className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-4 py-1.5 text-xs font-bold text-red-200">
                  NEW 올인원 제작
                </span>
                <h2 className="mt-4 text-3xl font-black">
                  영상 제작 올인원 스튜디오
                </h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  대본 생성부터 이미지, 영상 패키징, 편집 체크리스트까지 한 화면에서 흐름대로 진행합니다.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 text-sm lg:items-end lg:text-right">
                <span className="rounded-full bg-black/40 px-4 py-2 font-semibold text-slate-200">
                  대본 → 이미지 → 영상 → 편집
                </span>
                <span className="inline-flex items-center rounded-full px-5 py-2 text-sm font-black text-white shadow-sm bg-gradient-to-r from-red-500 to-orange-500">
                  올인원 시작하기 -&gt;
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
                <h2 className="mt-2 text-2xl font-bold">
                  벤치마킹 영상 발굴
                </h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  벤치마킹할 만한 잠재력 높은 유튜브 영상을 빠르게 찾아드립니다. 채널 규모 대비 조회 효율을 분석합니다.
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-purple, #a855f7)" }}
              >
                영상 발굴 시작하기 -&gt;
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
                <h2 className="mt-2 text-2xl font-bold">
                  대본 생성
                </h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  떡상한 영상의 대본을 분석한 다음, 그걸 토대로 내 영상의 대본으로 만들어드립니다.
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-orange, #ea580c)" }}
              >
                대본 생성 시작하기 -&gt;
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
                <h2 className="mt-2 text-2xl font-bold">
                  이미지 생성
                </h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  대본에 맞는 이미지와 스토리보드를 제작합니다.
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-blue, #2563eb)" }}
              >
                이미지 생성 시작하기 -&gt;
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
                <h2 className="mt-2 text-2xl font-bold">
                  TTS 생성
                </h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  대본을 음성으로 변환해 나레이션을 빠르게 제작합니다.
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-green, #16a34a)" }}
              >
                TTS 생성 시작하기 -&gt;
              </span>
            </div>
          </a>
        </div>

        <div className="mt-12 text-xs text-slate-400/80">
          안내: 결과 화면에서도 언제든 다른 기능으로 이동할 수 있습니다.
        </div>
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleAuth}
      />

      {/* 사용자 크레딧 사이드바 */}
      <UserCreditSidebar user={user} />
    </div>
  );
};

export default HomePage;
