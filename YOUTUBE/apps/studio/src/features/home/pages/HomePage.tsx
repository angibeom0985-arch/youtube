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
  const navigate = useNavigate();
  const normalizedBasePath = basePath && basePath != "/" ? basePath.replace(/\/$/, "") : "";
  const benchmarkingPath = `${normalizedBasePath}/benchmarking` || "/benchmarking";
  const scriptPath = `${normalizedBasePath}/script` || "/script";
  const imagePath = `${normalizedBasePath}/image` || "/image";
  const ttsPath = `${normalizedBasePath}/tts` || "/tts";
  const videoPath = `${normalizedBasePath}/video` || "/video";
  
  // URL ?묒눖??癒?퐣 from ???뵬沃섎챸苑??類ㅼ뵥
  const [redirectMessage, setRedirectMessage] = useState<string>("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');
    
    if (from && !user) {
      const pageNames: Record<string, string> = {
        '/tts': 'TTS (???쉐 癰궰??',
        '/script': '??癰???밴쉐',
        '/image': '???筌왖 ??밴쉐',
        '/benchmarking': '甕겹끉?귨쭕?딄때',
        '/video': '?怨멸맒 ??뽰삂',
      };
      
      const pageName = pageNames[from] || '??????륁뵠筌왖';
      setRedirectMessage(`${pageName} 疫꿸퀡????????롮젻筌?嚥≪뮄??紐꾩뵠 ?袁⑹뒄??몃빍??`);
    }
  }, [user]);

  useEffect(() => {
    const hash = window.location.hash || "";
    const hasAuthHash =
      hash.includes("access_token") || hash.includes("refresh_token") || hash.includes("error");

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      // 嚥≪뮄????源껊궗 ?? ?癒?삋 揶쎛??삳쐲 ??륁뵠筌왖嚥??귐됰뼄?????
      if (session) {
        const urlParams = new URLSearchParams(window.location.search);
        const from = urlParams.get('from');
        
        if (from && from !== '/') {
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
      
      // 嚥≪뮄????源껊궗 ?? ?癒?삋 揶쎛??삳쐲 ??륁뵠筌왖嚥??귐됰뼄?????
      if (session) {
        const urlParams = new URLSearchParams(window.location.search);
        const from = urlParams.get('from');
        
        if (from && from !== '/') {
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
    // ?袁⑹삺 ?臾믩꺗???袁⑥컭?紐꾩뱽 疫꿸퀣???곗쨮 ?귐됰뼄?????URL ??쇱젟
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


  const handleLogout = async () => {
    await supabase.auth.signOut();
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
              to="/mypage"
              className="px-4 py-2 text-sm font-bold text-red-100 border border-red-500/40 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-all flex items-center gap-2"
            >
              <span>?維 筌띾뜆???륁뵠筌왖</span>
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
                  ???? ????
                </button>
              )}
              <button
                onClick={handleGoogleAuth}
                className="px-8 py-4 text-lg font-black text-red-100 border-2 border-red-500/40 rounded-2xl bg-red-500/10 hover:bg-red-500/20 hover:border-red-400 transition-all active:scale-95"
              >
                嚥≪뮄???
              </button>
              <button
                onClick={handleGoogleAuth}
                className="px-8 py-4 text-lg font-black bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white rounded-2xl hover:from-red-500 hover:via-red-400 hover:to-orange-400 transition-all shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,0.6)] transform hover:-translate-y-1 active:scale-95 border border-red-400/40"
              >
                筌왖疫??얜?利????뜚揶쎛??
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16">

        {/* 嚥≪뮄????袁⑹뒄 筌롫뗄?놅쭪? ??뽯뻻 */}
        {redirectMessage && !user && (
          <div className="mb-8 w-full max-w-3xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500/50 rounded-2xl p-6 text-center animate-pulse">
            <p className="text-xl font-bold text-white mb-2">?逾?{redirectMessage}</p>
            <p className="text-red-200">?袁⑥삋 甕곌쑵????????뤿연 嚥≪뮄??紐낅퉸雅뚯눘苑??</p>
          </div>
        )}

        <div className="text-center">
          <h1 className="text-5xl font-black tracking-[0.04em] sm:text-6xl lg:text-7xl bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(249,115,22,0.35)]">
            DOT ?곗씠鍮??대땲?쒕툕
          </h1>
          <p className="mt-6 text-xl font-bold sm:text-2xl text-slate-100/95">
            ??DOT)?ㅼ쓣 ?댁뼱 ?섎굹?????곸긽)?쇰줈, 湲고쉷遺???섏씡源뚯? ?곌껐?⑸땲??
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
                <span className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-4 py-1.5 text-xs font-bold text-red-200">
                  NEW ???????뽰삂
                </span>
                <h2 className="mt-4 text-3xl font-black">
                  ?怨멸맒 ??뽰삂 ???????쎈뮔?遺우궎
                </h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  ??癰???밴쉐?봔?????筌왖, ?怨멸맒 ???텕筌? ?紐꾩춿 筌ｋ똾寃뺟뵳???硫명돱筌왖 ???遺얇늺?癒?퐣 ?癒?カ??嚥?筌욊쑵六??몃빍??
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 text-sm lg:items-end lg:text-right">
                <span className="rounded-full bg-black/40 px-4 py-2 font-semibold text-slate-200">
                  ??癰??????筌왖 ???怨멸맒 ???紐꾩춿
                </span>
                <span className="inline-flex items-center rounded-full px-5 py-2 text-sm font-black text-white shadow-sm bg-red-500">
                  ???????뽰삂??띾┛ -&gt;
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
                  甕겹끉?귨쭕?딄때 ?怨멸맒 獄쏆뮄??
                </h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  甕겹끉?귨쭕?딄때??筌띾슦釉??醫롮삺???誘? ?醫뤿뮔???怨멸맒????쥓?ㅵ칰?筌≪뼚釉??뺚뵲??덈뼄. 筌?쑬瑗?域뱀뮆??????鈺곌퀬????μ몛???브쑴苑??몃빍??
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-purple, #a855f7)" }}
              >
                ?怨멸맒 獄쏆뮄????뽰삂??띾┛ -&gt;
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
                  ??癰???밴쉐
                </h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  ??り맒???怨멸맒????癰귣챷???브쑴苑????쇱벉, 域밸㈇援??醫?嚥????怨멸맒????癰귣챷?앮에?筌띾슢諭??諭띄뵳?덈빍??
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-orange, #ea580c)" }}
              >
                ??癰???밴쉐 ??뽰삂??띾┛ -&gt;
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
                  ???筌왖 ??밴쉐
                </h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  ??癰귣챷肉?筌띿쉶?????筌왖?? ??쎈꽅?귐됰궖??? ??뽰삂??몃빍??
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-blue, #2563eb)" }}
              >
                ???筌왖 ??밴쉐 ??뽰삂??띾┛ -&gt;
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
                  TTS ??밴쉐
                </h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  ??癰귣챷?????쉐??곗쨮 癰궰??묐퉸 ??롮쟿??곷????쥓?ㅵ칰???뽰삂??몃빍??
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-green, #16a34a)" }}
              >
                TTS ??밴쉐 ??뽰삂??띾┛ -&gt;
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

      {/* ???????????????뺤뺍 */}
    </div>
  );
};

export default HomePage;
