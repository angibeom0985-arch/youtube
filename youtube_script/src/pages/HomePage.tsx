import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";
import LoginModal from "../components/LoginModal";

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
          <div className="flex items-center gap-4">
             <span className="hidden sm:inline-block text-sm md:text-base font-black text-yellow-400 animate-bounce bg-yellow-400/20 px-4 py-1.5 rounded-full border-2 border-yellow-400/30 shadow-[0_0_15px_rgba(250,204,21,0.3)]">
              🎁 신규 가입 시 무료 크레딧 제공!
            </span>
            <button
              onClick={handleAuth}
              className="px-5 py-2.5 text-sm font-bold text-white border border-white/20 rounded-full hover:bg-white/10 hover:border-white/40 transition-all active:scale-95"
            >
              로그인
            </button>
            <button
              onClick={handleAuth}
              className="px-6 py-2.5 text-sm font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-900/20 active:scale-95 border border-blue-400/30"
            >
              지금 회원가입
            </button>
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
          <p className="mt-4 text-base text-slate-200/80 sm:text-lg">
            대본 생성부터 시작하거나 이미지·TTS 생성으로 바로 이동할 수 있습니다.
          </p>
        </div>

        <div className="mt-12 grid w-full gap-6 sm:grid-cols-2">
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
            <div className="mt-6 text-sm font-semibold">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-black"
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
            <div className="mt-6 text-sm font-semibold">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-black"
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
            <div className="mt-6 text-sm font-semibold">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-black"
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
            <div className="mt-6 text-sm font-semibold">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-black"
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
    </div>
  );
};

export default HomePage;
