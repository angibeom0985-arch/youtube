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
  
  // URL ???????????from ?????????낟??????????饔낅떽?????????
  const [redirectMessage, setRedirectMessage] = useState<string>("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get("from");

    if (from && !user) {
      const pageNames: Record<string, string> = {
        "/tts": "TTS (?뚯꽦 蹂??",
        "/script": "?蹂??앹꽦",
        "/image": "?대?吏 ?앹꽦",
        "/benchmarking": "踰ㅼ튂留덊궧",
        "/video": "?곸긽 ?쒖옉",
      };

      const pageName = pageNames[from] || "?대떦 ?섏씠吏";
      setRedirectMessage(`${pageName} 湲곕뒫???ъ슜?섎젮硫?濡쒓렇?몄씠 ?꾩슂?⑸땲??`);
    }
  }, [user]);

  useEffect(() => {
    const hash = window.location.hash || "";
    const hasAuthHash =
      hash.includes("access_token") || hash.includes("refresh_token") || hash.includes("error");

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      // ????癲????????롮쾸????怨뚮옩鴉???? ??????????ル뒌???????袁⑸즴罹???????곌떽釉붾?????????????????얠뺏??븍툙????????????
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
      
      // ????癲????????롮쾸????怨뚮옩鴉???? ??????????ル뒌???????袁⑸즴罹???????곌떽釉붾?????????????????얠뺏??븍툙????????????
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
    // ?????獄쏅챶留??????????????獄쏅챶留?????饔낅떽???????ㅻ쳲??????????????????????얠뺏??븍툙????????????URL ????μ떜媛?걫???
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
              <span>제작자: 데이비</span>
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
                ????癲???
              </button>
              <button
                onClick={handleGoogleAuth}
                className="px-8 py-4 text-lg font-black bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white rounded-2xl hover:from-red-500 hover:via-red-400 hover:to-orange-400 transition-all shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,0.6)] transform hover:-translate-y-1 active:scale-95 border border-red-400/40"
              >
                ?耀붾굝??????????????????????????쎛??
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16">

        {/* ????癲????????獄쏅챶留???耀붾굝?????????? ??????*/}
        {redirectMessage && !user && (
          <div className="mb-8 w-full max-w-3xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500/50 rounded-2xl p-6 text-center animate-pulse">
            <p className="text-xl font-bold text-white mb-2">???{redirectMessage}</p>
            <p className="text-red-200">?????獄쏅챶留?????????????????轅붽틓??????????癲???饔낅떽???嶺뚮슢梨뜹ㅇ??꿔꺂??????????</p>
          </div>
        )}

        <div className="text-center">
          <h1 className="text-5xl font-black tracking-[0.04em] sm:text-6xl lg:text-7xl bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(249,115,22,0.35)]">
            DOT ????????????????꿔꺂?€??紐낅뭵
          </h1>
          <p className="mt-6 text-xl font-bold sm:text-2xl text-slate-100/95">
            ??DOT)???嚥싲갭큔?????????깅즿?????汝뷴젆?琉껆???????????紐껊괘?????????? ?????????β뼯??????????癰궽블뀮????얠??袁⑸즴??? ?????怨뺤르????꿔꺂??????
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
                  ???癲ル슢?ο㎖??                </span>
                <h2 className="mt-4 text-3xl font-black">
                  ????노듋嶺???嶺뚮??ｆ뤃??????됲닩???됰Ŋ??벧?                </h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  ???????꾩룆?????낇뀘????????꿔꺂???, ????노듋嶺?????筌먯옕?? ?癲ル슢???밸퉲??꿔꺂?????용Ъ嶺뚮Ŋ?????癲ル슢?ο㎖?疫뀀툙???됱삩? ?????됰Ŧ六???????????????꿔꺂????紐꾩뗄??嶺뚮ㅎ????
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 text-sm lg:items-end lg:text-right">
                <span className="rounded-full bg-black/40 px-4 py-2 font-semibold text-slate-200">
                  ???????????꿔꺂??? ??????노듋嶺????癲ル슢???밸퉲?                </span>
                <span className="inline-flex items-center rounded-full px-5 py-2 text-sm font-black text-white shadow-[0_0_18px_rgba(185,28,28,0.55)] bg-red-700 group-hover:bg-red-600 transition-colors">
                  ????노듋嶺???嶺뚮??ｆ뤃???嶺뚮??ｆ뤃????袁⑦꺙 -&gt;
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
                  ?筌?六???잙컾維곭빊??熬곣뫀瑜?????노듋嶺??熬곣뫖利든뜏??                </h2>
                <p
                  className="mt-3 text-sm text-slate-100/80 overflow-hidden"
                  style={{ display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" }}
                >
                  ?筌?六???잙컾維곭빊??熬곣뫀瑜???꿔꺂??????????◈????雅? ????ｋ뽫뜏??????노듋嶺????辱????窺??꿔꺂?????? ????筌?????????????됰슦????????숈춻?????곗뒩泳???嶺뚮ㅎ????
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-purple, #a855f7)" }}
              >
                ????노듋嶺??熬곣뫖利든뜏????嶺뚮??ｆ뤃????袁⑦꺙 -&gt;
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
                  ???????꾩룆???                </h2>
                <p className="mt-3 text-sm text-slate-100/80 truncate whitespace-nowrap overflow-hidden">
                  ?????놁???????노듋嶺????곗뒩泳????熬곣뫖利?嚥????Β????????筌??????⑤슢?뽫춯????辱????窺????꾩룆????嶺뚮ㅎ????
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-orange, #ea580c)" }}
              >
                ???????꾩룆?????嶺뚮??ｆ뤃????袁⑦꺙 -&gt;
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
                  ?????耀붾굝????? ????ш끽維뽳쭩???
                </h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  ???????곕츥?嶺뚮?爰??輿삳뿫遊억쭕?룹춸??耀붾굝????????????耀붾굝??????? ????????????얠뺏??븍툙????????? ???轅붽틓???壤굿??걜???轅붽틓??????
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-blue, #2563eb)" }}
              >
                ?????耀붾굝????? ????ш끽維뽳쭩??????轅붽틓???壤굿??걜???????썹땟洹욌뙀?-&gt;
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
                  TTS ????ш끽維뽳쭩???
                </h2>
                <p className="mt-3 text-sm text-slate-100/80">
                  ???????곕츥?嶺뚮?爰????????????????????곕츥????????????????????源놁７?????癲?????????轅붽틓???壤굿??걜???轅붽틓??????
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <span
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: "var(--tone-image-green, #16a34a)" }}
              >
                TTS ????ш끽維뽳쭩??????轅붽틓???壤굿??걜???????썹땟洹욌뙀?-&gt;
              </span>
            </div>
          </a>
        </div>

        <div className="mt-12 text-xs text-slate-400/80">
          <span>제작자: 데이비</span>
          <span className="block">
            ?얜챷??:{" "}
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

      {/* ????????????????轅붽틓??????*/}
    </div>
  );
};

export default HomePage;
