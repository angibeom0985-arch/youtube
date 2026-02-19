import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { generateSsml, generateActingPrompt } from "@/services/geminiService";
import { FiPlay, FiPause, FiMic, FiSliders, FiCpu, FiInfo, FiUser, FiFileText, FiDownload } from "react-icons/fi";
import { supabase } from "@/services/supabase";
import UserCreditToolbar from "@/components/UserCreditToolbar";
import HomeBackButton from "@/components/HomeBackButton";
import type { User } from "@supabase/supabase-js";
import ErrorNotice from "@/components/ErrorNotice";
import { ProgressTracker } from "@/components/ProgressIndicator";
import { CREDIT_COSTS, formatCreditButtonLabel, formatCreditPer10CharsButtonLabel } from "@/constants/creditCosts";

const STORAGE_KEYS = {
  text: "tts_text",
  voice: "tts_voice",
  rate: "tts_rate",
  pitch: "tts_pitch",
  audio: "tts_audio",
  error: "tts_error",
  prompt: "tts_prompt", // ?곌린 ?꾨＼?꾪듃 ???
};

const getStoredString = (key: string, fallback = ""): string => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    console.error("TTS 濡쒖뺄 ??κ컪??遺덈윭?ㅼ? 紐삵뻽?듬땲??", error);
    return fallback;
  }
};

const getStoredNumber = (key: string, fallback: number): number => {
  const value = getStoredString(key, "");
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};


const hasGoogleCredential = (raw: unknown): boolean => {
  if (!raw) return false;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    if (!trimmed.startsWith("{")) return true;

    try {
      const parsed = JSON.parse(trimmed) as {
        apiKey?: unknown;
        client_email?: unknown;
        private_key?: unknown;
      };
      if (typeof parsed.apiKey === "string" && parsed.apiKey.trim()) return true;
      return typeof parsed.client_email === "string" && typeof parsed.private_key === "string";
    } catch {
      return false;
    }
  }

  if (typeof raw === "object") {
    const obj = raw as {
      apiKey?: unknown;
      client_email?: unknown;
      private_key?: unknown;
    };
    if (typeof obj.apiKey === "string" && obj.apiKey.trim()) return true;
    return typeof obj.client_email === "string" && typeof obj.private_key === "string";
  }

  return false;
};

const toTtsErrorMessage = (raw: string): string => {
  const code = (raw || "").trim().toLowerCase();
  if (!code) return "TTS 요청에 실패했습니다.";
  if (code.includes("auth_required")) return "로그인이 필요합니다.";
  if (code.includes("missing_api_key")) {
    return "서버 Google API 키가 설정되지 않았습니다. 관리자에게 문의해 주세요.";
  }
  if (code.includes("credit_limit")) {
    return "크레딧이 부족합니다.";
  }
  if (code.includes("coupon_user_key_required")) {
    return "할인 쿠폰 모드에서는 마이페이지에 본인 Google Cloud API 키를 먼저 등록해야 합니다.";
  }
  if (code.includes("usage_limit")) return "사용량 제한에 도달했습니다. 잠시 후 다시 시도해 주세요.";
  return raw;
};

// Voice presets for Google Cloud TTS.
const voiceOptions = [
  { value: "ko-KR-Standard-A", label: "Jiyoon", gender: "female", type: "Standard", lang: "ko" },
  { value: "ko-KR-Wavenet-A", label: "Yujin", gender: "female", type: "Wavenet", lang: "ko" },
  { value: "ko-KR-Neural2-A", label: "Jisoo", gender: "female", type: "Neural2", lang: "ko" },
  { value: "ko-KR-Standard-C", label: "Minwoo", gender: "male", type: "Standard", lang: "ko" },
  { value: "ko-KR-Wavenet-C", label: "Junho", gender: "male", type: "Wavenet", lang: "ko" },
  { value: "ko-KR-Neural2-C", label: "Minhyuk", gender: "male", type: "Neural2", lang: "ko" },
  { value: "en-US-Neural2-F", label: "Sarah", gender: "female", type: "Neural2", lang: "en" },
  { value: "en-US-Neural2-D", label: "John", gender: "male", type: "Neural2", lang: "en" },
  { value: "ja-JP-Neural2-B", label: "Mayu", gender: "female", type: "Neural2", lang: "ja" },
  { value: "ja-JP-Neural2-D", label: "Keita", gender: "male", type: "Neural2", lang: "ja" },
  { value: "zh-CN-Neural2-A", label: "Xiaoxiao", gender: "female", type: "Neural2", lang: "zh" },
  { value: "zh-CN-Neural2-C", label: "Yunxi", gender: "male", type: "Neural2", lang: "zh" },
];

const TtsPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [text, setText] = useState(() => getStoredString(STORAGE_KEYS.text));
  const [voice, setVoice] = useState(() =>
    getStoredString(STORAGE_KEYS.voice, "ko-KR-Standard-A")
  );
  const [speakingRate, setSpeakingRate] = useState(() =>
    getStoredNumber(STORAGE_KEYS.rate, 1)
  );
  const [pitch, setPitch] = useState(() => getStoredNumber(STORAGE_KEYS.pitch, 0));
  const [actingPrompt, setActingPrompt] = useState(() => getStoredString(STORAGE_KEYS.prompt));
  const [audioSrc, setAudioSrc] = useState(() => {
    const stored = getStoredString(STORAGE_KEYS.audio);
    // 濡쒖뺄 ?ㅽ넗由ъ? ?곗씠?곌? ?덈Т ?щ㈃ ?깅뒫 ???諛??щ옒???곕젮媛 ?덉쑝誘濡?珥덇린???쒖븞 ?먮뒗 臾댁떆
    if (stored.length > 5 * 1024 * 1024) {
      console.warn("TTS audio data too large, clearing storage.");
      return "";
    }
    return stored;
  });
  const [error, setError] = useState(() => getStoredString(STORAGE_KEYS.error));
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState("");
  const [ttsProgress, setTtsProgress] = useState({
    currentStep: 0,
    steps: ["텍스트 준비", "AI 프롬프트 분석", "음성 생성", "완료"],
  });
  const [copyStatus, setCopyStatus] = useState("");
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [useAIActing, setUseAIActing] = useState(false); // AI ?곌린 紐⑤뱶 ?좉?
  const [generatingPrompt, setGeneratingPrompt] = useState(false); // ?袁⑨세?袁る뱜 ??밴쉐 餓?
  const [hasUserGoogleKey, setHasUserGoogleKey] = useState(false); // ?꾨＼?꾪듃 ?앹꽦 以?
  const [couponBypassCredits, setCouponBypassCredits] = useState(false);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadUserKeyStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setHasUserGoogleKey(false);
        return;
      }

      try {
        const response = await fetch("/api/user/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          setHasUserGoogleKey(false);
          return;
        }

        const data = await response.json();
        const hasKey = hasGoogleCredential(data?.google_credit_json);
        const isCouponBypass = data?.coupon_bypass_credits === true;
        setHasUserGoogleKey(hasKey);
        setCouponBypassCredits(isCouponBypass);
        if (isCouponBypass && !hasKey) {
          alert("할인 쿠폰 계정은 마이페이지에서 Google Cloud API 키를 먼저 등록해야 합니다.");
          navigate("/mypage", {
            replace: true,
            state: { from: "/tts", reason: "coupon_api_key_required" },
          });
        }
      } catch {
        setHasUserGoogleKey(false);
        setCouponBypassCredits(false);
      }
    };

    loadUserKeyStatus();
  }, [user?.id, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    if (text !== undefined) setStoredValue(STORAGE_KEYS.text, text);
  }, [text]);

  useEffect(() => setStoredValue(STORAGE_KEYS.voice, voice), [voice]);
  useEffect(() => setStoredValue(STORAGE_KEYS.rate, String(speakingRate)), [speakingRate]);
  useEffect(() => setStoredValue(STORAGE_KEYS.pitch, String(pitch)), [pitch]);

  useEffect(() => {
    // ?ㅻ뵒???뚯뒪媛 ?덈Т ?щ㈃ ??ν븯吏 ?딆쓬
    if (audioSrc && audioSrc.length < 2 * 1024 * 1024) {
      setStoredValue(STORAGE_KEYS.audio, audioSrc);
    } else if (!audioSrc) {
      setStoredValue(STORAGE_KEYS.audio, "");
    }
  }, [audioSrc]);

  useEffect(() => setStoredValue(STORAGE_KEYS.error, error), [error]);
  useEffect(() => setStoredValue(STORAGE_KEYS.prompt, actingPrompt), [actingPrompt]);

  const handleReset = () => {
    if (!window.confirm("紐⑤뱺 ?낅젰??珥덇린?뷀븯?쒓쿋?듬땲源?")) return;
    setText("");
    setVoice("ko-KR-Standard-A");
    setSpeakingRate(1);
    setPitch(0);
    setActingPrompt("");
    setAudioSrc("");
    setError("");
    setCopyStatus("");
    setProgressStep("");
    setUseAIActing(false);
    localStorage.removeItem(STORAGE_KEYS.audio);
  };

  const handlePreviewVoice = async (voiceId: string) => {
    if (playingPreview === voiceId && previewAudio) {
      previewAudio.pause();
      setPlayingPreview(null);
      return;
    }

    if (previewAudio) {
      previewAudio.pause();
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch("/api/tts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: "?덈뀞?섏꽭?? 誘몃━?ｊ린?낅땲??",
          voice: voiceId,
          speakingRate: 1,
          pitch: 0,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(toTtsErrorMessage(payload?.message || "Preview failed"));
      }
      const data = await response.json();
      if (data?.billing?.mode === "server_credit") {
        window.dispatchEvent(new Event("creditRefresh"));
      }
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);

      audio.onended = () => setPlayingPreview(null);
      audio.play();
      setPreviewAudio(audio);
      setPlayingPreview(voiceId);
    } catch (e) {
      console.error(e);
      alert("誘몃━蹂닿린瑜??ъ깮?????놁뒿?덈떎.");
    }
  };

  const handleAutoGeneratePrompt = async () => {
    if (!text.trim()) {
      alert("?蹂몄쓣 癒쇱? ?낅젰?댁＜?몄슂.");
      return;
    }

    setGeneratingPrompt(true);
    try {
      const prompt = await generateActingPrompt(text);
      setActingPrompt(prompt);
    } catch (error: any) {
      alert(error.message || "?꾨＼?꾪듃 ?먮룞 ?앹꽦???ㅽ뙣?덉뒿?덈떎.");
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      alert("濡쒓렇?몄씠 ?꾩슂??湲곕뒫?낅땲??");
      return;
    }
    if (!text.trim()) {
      setError("蹂?섑븷 ?띿뒪?몃? ?낅젰??二쇱꽭??");
      return;
    }
    if (couponBypassCredits && !hasUserGoogleKey) {
      const message = "할인 쿠폰 계정은 마이페이지에서 Google Cloud API 키를 먼저 등록해야 합니다.";
      setError(message);
      alert(message);
      navigate("/mypage", {
        replace: true,
        state: { from: "/tts", reason: "coupon_api_key_required" },
      });
      return;
    }

    setIsGenerating(true);
    setProgressStep("preparing");
    setTtsProgress({ ...ttsProgress, currentStep: 0 });
    setError("");

    try {
      let finalSsml = "";

      // 1. AI ?곌린 紐⑤뱶?닿굅???꾨＼?꾪듃媛 ?덉쑝硫?SSML ?앹꽦
      if (useAIActing || actingPrompt.trim()) {
        setProgressStep("analyzing"); // ?곌린 遺꾩꽍 以?
        setTtsProgress(prev => ({ ...prev, currentStep: 1 }));
        finalSsml = await generateSsml(text, actingPrompt);
      } else {
        // AI ?곌린瑜??ъ슜?섏? ?딆쑝硫?1?④퀎 嫄대꼫?곌린
        setTtsProgress(prev => ({ ...prev, currentStep: 1 }));
      }

      // 2. TTS ?붿껌
      setProgressStep("requesting");
      setTtsProgress(prev => ({ ...prev, currentStep: 2 }));
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/tts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: finalSsml ? undefined : text,
          ssml: finalSsml || undefined,
          voice,
          speakingRate,
          pitch,
        }),
      });

      setProgressStep("processing");
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(toTtsErrorMessage(payload?.message || "TTS ?붿껌 ?ㅽ뙣"));
      }

      if (!payload?.audioContent) {
        throw new Error("?ㅻ뵒???곗씠?곌? 鍮꾩뼱 ?덉뒿?덈떎.");
      }

      setAudioSrc(`data:audio/mp3;base64,${payload.audioContent}`);
      if (payload?.billing?.mode === "server_credit") {
        window.dispatchEvent(new Event("creditRefresh"));
      }
      setProgressStep("completed");
      setTtsProgress(prev => ({ ...prev, currentStep: 3 }));

    } catch (err: any) {
      console.error("TTS ?붿껌 ?ㅽ뙣:", err);
      const message = err?.message || "?????녿뒗 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.";
      if (String(message).includes("마이페이지") || String(message).toLowerCase().includes("coupon_user_key_required")) {
        navigate("/mypage", {
          replace: true,
          state: { from: "/tts", reason: "coupon_api_key_required" },
        });
      }
      setError(message);
    } finally {
      setIsGenerating(false);
      setTtsProgress({ ...ttsProgress, currentStep: 0 });
    }
  };

  const filterVoices = (gender: string) => voiceOptions.filter(v => v.gender === gender);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          <p className="text-emerald-400 font-medium">?ㅽ뒠?붿삤瑜?以鍮꾪븯??以?..</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050a0a] text-white relative">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-slate-950 to-emerald-900/20 pointer-events-none" />

      {/* Auth Status - Top Right */}
      <div className="absolute top-0 right-0 p-4 sm:p-6 flex gap-3 z-50 items-center">
        <UserCreditToolbar user={user} onLogout={handleLogout} tone="emerald" showCredits={false} />
      </div>
      <div className="absolute top-0 left-0 p-4 sm:p-6 z-50">
        <HomeBackButton tone="emerald" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-12">
        {/* Header */}
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              AI 음성 스튜디오
            </h1>
            <p className="text-slate-400 mt-2">대본을 자연스러운 음성으로 빠르게 변환합니다.</p>
          </div>
          <button onClick={handleReset} className="px-5 py-2.5 text-sm font-bold text-slate-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
            초기화
          </button>
        </div>



        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-6">

            {/* Voice Selection */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
              <h2 className="text-lg font-bold text-emerald-300 mb-5 flex items-center gap-2">
                <FiUser /> 紐⑹냼由??좏깮
              </h2>

              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">?ъ꽦 ?깆슦</label>
                  <div className="space-y-2">
                    {filterVoices("female").map(v => (
                      <div
                        key={v.value}
                        onClick={() => setVoice(v.value)}
                        className={`group flex items-center justify-between p-3.5 rounded-xl cursor-pointer border transition-all ${voice === v.value ? 'bg-emerald-500/20 border-emerald-500/50 ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-slate-900/40 border-white/5 hover:border-white/20'}`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm font-bold truncate ${voice === v.value ? 'text-emerald-300' : 'text-slate-200'}`}>
                            {v.label} <span className="opacity-50 text-[10px] ml-1">({v.lang.toUpperCase()})</span>
                          </span>
                          <span className="text-[11px] text-slate-500">{v.type}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePreviewVoice(v.value); }}
                          className="p-2 rounded-full bg-white/5 hover:bg-emerald-500 hover:text-white text-emerald-400 transition-all"
                          title="誘몃━?ｊ린"
                        >
                          {playingPreview === v.value ? <FiPause size={14} /> : <FiPlay size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">?⑥꽦 ?깆슦</label>
                  <div className="space-y-2">
                    {filterVoices("male").map(v => (
                      <div
                        key={v.value}
                        onClick={() => setVoice(v.value)}
                        className={`group flex items-center justify-between p-3.5 rounded-xl cursor-pointer border transition-all ${voice === v.value ? 'bg-emerald-500/20 border-emerald-500/50 ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-slate-900/40 border-white/5 hover:border-white/20'}`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm font-bold truncate ${voice === v.value ? 'text-emerald-300' : 'text-slate-200'}`}>
                            {v.label} <span className="opacity-50 text-[10px] ml-1">({v.lang.toUpperCase()})</span>
                          </span>
                          <span className="text-[11px] text-slate-500">{v.type}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePreviewVoice(v.value); }}
                          className="p-2 rounded-full bg-white/5 hover:bg-emerald-500 hover:text-white text-emerald-400 transition-all"
                          title="誘몃━?ｊ린"
                        >
                          {playingPreview === v.value ? <FiPause size={14} /> : <FiPlay size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Settings */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <h2 className="text-lg font-bold text-emerald-300 mb-5 flex items-center gap-2">
                <FiSliders /> ?뚯꽦 ?ㅼ젙
              </h2>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300 font-medium">?띾룄</span>
                    <span className="text-emerald-400 font-bold">{speakingRate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={speakingRate}
                    onChange={(e) => setSpeakingRate(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300 font-medium">??(Pitch)</span>
                    <span className="text-emerald-400 font-bold">{pitch.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.5"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Text Input & Result */}
          <div className="lg:col-span-8 space-y-6">

            {/* Acting Prompt Section */}
            <div className={`border rounded-2xl p-6 transition-all duration-500 ${useAIActing ? 'bg-emerald-900/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-xl ${useAIActing ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400'} flex-shrink-0`}>
                    <FiCpu size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-200">AI ?곌린 紐⑤뱶</h3>
                    <p className="text-xs text-slate-500">?띿뒪?몄뿉 媛먯젙怨??곌린瑜??뷀빀?덈떎</p>
                  </div>
                </div>
                <button
                  onClick={() => setUseAIActing(!useAIActing)}
                  className={`relative h-6 w-12 rounded-full transition-colors focus:outline-none flex-shrink-0 ml-4 ${useAIActing ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useAIActing ? 'translate-x-[1.75rem]' : 'translate-x-1'}`} />
                </button>
              </div>

              {useAIActing && (
                <div className="mt-4 animate-fadeIn">
                  <div className="flex gap-2 mb-2">
                    <textarea
                      value={actingPrompt}
                      onChange={(e) => setActingPrompt(e.target.value)}
                      placeholder="?? ?댁뒪 ?듭빱泥섎읆 ?좊ː媛??덇쾶, ?ы뵂 ?쒕씪留?二쇱씤怨듭쿂???좎젅?섍쾶 (鍮꾩썙?먮㈃ ?蹂?遺꾩꽍?섏뿬 ?먮룞 ?꾩꽦)"
                      className="flex-1 bg-black/40 border border-emerald-500/20 rounded-xl p-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all leading-relaxed"
                      rows={2}
                    />
                    <button
                      onClick={handleAutoGeneratePrompt}
                      disabled={generatingPrompt || !text.trim()}
                      className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-100 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed self-start"
                      title="?蹂몄쓣 遺꾩꽍?섏뿬 ?곌린 ???먮룞 ?꾩꽦"
                    >
                      {generatingPrompt ? "분석 중..." : `자동 완성 (${formatCreditButtonLabel(CREDIT_COSTS.GENERATE_IDEAS)})`}
                    </button>
                  </div>
                  <div className="flex items-start gap-2 mt-3 text-xs text-emerald-400/70">
                    <FiInfo className="mt-0.5 flex-shrink-0" />
                    <p>AI媛 ?蹂몄쓣 遺꾩꽍?섏뿬 理쒖쟻???곌린 ?ㅼ쓣 ?쒖븞?⑸땲?? ?꾨＼?꾪듃瑜?鍮꾩썙?먮㈃ ?蹂??댁슜???곕씪 ?먯뿰?ㅻ윭???ㅼ쑝濡??쎌뒿?덈떎.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Text Input */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4 gap-3">
                <label className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <FiFileText className="text-emerald-400" /> 대본 입력
                </label>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 font-mono">
                    {text.length.toLocaleString()} 자
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || !text.trim()}
                    className={`rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(16,185,129,0.25)] transition-all hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2`}
                  >
                    <FiMic size={16} />
                    {isGenerating ? "생성 중..." : `음성 생성 (${formatCreditPer10CharsButtonLabel(CREDIT_COSTS.TTS_PER_10_CHARS)})`}
                  </button>
                </div>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-80 bg-black/30 border border-white/5 rounded-xl p-5 text-white placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-none transition-all shadow-inner tts-text-input"
                placeholder="여기에 변환할 대본을 입력하세요. 해설형, 내레이션형 모두 가능합니다."
                style={
                  {
                    userSelect: "text",
                    WebkitUserSelect: "text",
                  } as React.CSSProperties
                }
              />
              {isGenerating && (
                <p className="mt-3 text-sm text-emerald-300">
                  {progressStep === "analyzing" ? "AI가 감정/톤을 분석하고 있습니다..." : progressStep === "requesting" ? "음성을 생성하고 있습니다..." : "요청을 처리 중입니다..."}
                </p>
              )}
            </div>

            {isGenerating && (
              <ProgressTracker
                currentStepIndex={ttsProgress.currentStep}
                stepLabels={ttsProgress.steps}
                stepDescriptions={[
                  "?띿뒪?몃? 遺꾩꽍?섍퀬 ?뚯꽦 ?앹꽦??以鍮꾪븯怨??덉뒿?덈떎",
                  "AI媛 媛먯젙怨??듭뼇??遺꾩꽍?섍퀬 ?덉뒿?덈떎",
                  "Google Cloud TTS濡??뚯꽦???앹꽦?섍퀬 ?덉뒿?덈떎",
                  "?뚯꽦 ?뚯씪 ?앹꽦???꾨즺?섏뿀?듬땲??",
                ]}
                estimatedTimeSeconds={15}
              />
            )}

            <ErrorNotice error={error} context="TTS ?뚯꽦 ?앹꽦" />

            {/* Audio Result */}
            {audioSrc && (
              <div className="bg-emerald-900/10 border border-emerald-500/30 rounded-2xl p-8 animate-fadeIn shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-lg">
                <h3 className="text-xl font-bold text-emerald-300 mb-6 flex items-center gap-3">
                  <div className="bg-emerald-500 text-white p-1.5 rounded-lg shadow-lg shadow-emerald-500/20">
                    <FiPlay size={18} />
                  </div>
                  ?앹꽦??AI 紐⑹냼由?
                </h3>
                <audio controls className="w-full mb-6 accent-emerald-500 filter invert h-12" key={audioSrc}>
                  <source src={audioSrc} type="audio/mpeg" />
                </audio>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">二쇱쓽: 釉뚮씪?곗? 罹먯떆瑜?吏?곕㈃ ?앹꽦???ㅻ뵒?ㅺ? ?щ씪吏????덉뒿?덈떎.</p>
                  <a
                    href={audioSrc}
                    download={`voice_${new Date().getTime()}.mp3`}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                  >
                    <FiDownload />
                    MP3 ?ㅼ슫濡쒕뱶
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.4);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default TtsPage;


