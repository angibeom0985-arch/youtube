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
import { CREDIT_COSTS, withCreditLabel, withCreditPer10CharsLabel } from "@/constants/creditCosts";

const STORAGE_KEYS = {
  text: "tts_text",
  voice: "tts_voice",
  rate: "tts_rate",
  pitch: "tts_pitch",
  audio: "tts_audio",
  error: "tts_error",
  prompt: "tts_prompt", // 연기 프롬프트 저장
};

const getStoredString = (key: string, fallback = ""): string => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    console.error("TTS 로컬 저장값을 불러오지 못했습니다:", error);
    return fallback;
  }
};

const getStoredNumber = (key: string, fallback: number): number => {
  const value = getStoredString(key, "");
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const setStoredValue = (key: string, value: string): void => {
  try {
    if (!value) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, value);
  } catch (error) {
    console.error("TTS localStorage 저장 실패:", error);
  }
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
// Korean Google Cloud TTS provides limited base models: Female (A, B) and Male (C, D).
// We use pitch and rate combinations to create distinct "virtual personas" from these base models.
const voiceOptions = [
  // --- 여성 (Female) ---
  { value: "ko-KR-Neural2-A", label: "지수 (차분한 어조)", gender: "female", type: "Neural2", lang: "ko", presetPitch: 1.2, presetRate: 0.98 },
  { value: "ko-KR-Wavenet-A", label: "지윤 (안정적인 설명)", gender: "female", type: "Wavenet", lang: "ko", presetPitch: 0.0, presetRate: 1.0 },
  { value: "ko-KR-Standard-A", label: "미정 (명확한 정보전달)", gender: "female", type: "Standard", lang: "ko", presetPitch: -1.0, presetRate: 0.95 },
  { value: "ko-KR-Neural2-B", label: "유진 (밝고 경쾌한 리포터)", gender: "female", type: "Neural2", lang: "ko", presetPitch: 2.6, presetRate: 1.05 },
  { value: "ko-KR-Wavenet-B", label: "소희 (발랄한 브이로그)", gender: "female", type: "Wavenet", lang: "ko", presetPitch: 3.0, presetRate: 1.08 },
  
  // --- 남성 (Male) ---
  { value: "ko-KR-Neural2-C", label: "민우 (신뢰감 있는 나레이션)", gender: "male", type: "Neural2", lang: "ko", presetPitch: -1.8, presetRate: 0.98 },
  { value: "ko-KR-Wavenet-C", label: "지훈 (권위 있는 프레젠테이션)", gender: "male", type: "Wavenet", lang: "ko", presetPitch: -1.2, presetRate: 1.02 },
  { value: "ko-KR-Standard-C", label: "재훈 (발랄한 진행)", gender: "male", type: "Standard", lang: "ko", presetPitch: -0.6, presetRate: 1.1 },
  { value: "ko-KR-Wavenet-D", label: "태양 (활기찬 예능/광고)", gender: "male", type: "Wavenet", lang: "ko", presetPitch: -0.4, presetRate: 1.08 },
  { value: "ko-KR-Standard-D", label: "준서 (차분한 다큐멘터리)", gender: "male", type: "Standard", lang: "ko", presetPitch: -2.8, presetRate: 0.94 },
  
  // --- 외국어 (Foreign) ---
  { value: "en-US-Neural2-F", label: "Sarah", gender: "female", type: "Neural2", lang: "en" },
  { value: "en-US-Neural2-D", label: "John", gender: "male", type: "Neural2", lang: "en" },
  { value: "ja-JP-Neural2-B", label: "Mayu", gender: "female", type: "Neural2", lang: "ja" },
  { value: "ja-JP-Neural2-D", label: "Keita", gender: "male", type: "Neural2", lang: "ja" },
  { value: "zh-CN-Neural2-A", label: "Xiaoxiao", gender: "female", type: "Neural2", lang: "zh" },
  { value: "zh-CN-Neural2-C", label: "Yunxi", gender: "male", type: "Neural2", lang: "zh" },
];

interface TtsPageProps {
  basePath?: string;
}

const TtsPage: React.FC<TtsPageProps> = ({ basePath = "/tts" }) => {
  const navigate = useNavigate();
  const normalizedBasePath =
    basePath && basePath !== "/" ? basePath.replace(/\/$/, "") : "";
  const ttsFromPath = `${normalizedBasePath || "/tts"}`;
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
    // 로컬 스토리지 데이터가 너무 크면 성능 저하 가능성이 있어 무시합니다.
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
  const previewCacheRef = useRef<Map<string, string>>(new Map());
  const [useAIActing, setUseAIActing] = useState(false); // AI 연기 모드 토글
  const [generatingPrompt, setGeneratingPrompt] = useState(false); // 프롬프트 생성 중
  const [hasUserGoogleKey, setHasUserGoogleKey] = useState(false); // 사용자 키 등록 여부
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
            state: { from: ttsFromPath, reason: "coupon_api_key_required" },
          });
        }
      } catch {
        setHasUserGoogleKey(false);
        setCouponBypassCredits(false);
      }
    };

    loadUserKeyStatus();
  }, [user?.id, navigate, ttsFromPath]);

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
    // 오디오 소스가 너무 크면 저장하지 않습니다.
    if (audioSrc && audioSrc.length < 2 * 1024 * 1024) {
      setStoredValue(STORAGE_KEYS.audio, audioSrc);
    } else if (!audioSrc) {
      setStoredValue(STORAGE_KEYS.audio, "");
    }
  }, [audioSrc]);

  useEffect(() => setStoredValue(STORAGE_KEYS.error, error), [error]);
  useEffect(() => setStoredValue(STORAGE_KEYS.prompt, actingPrompt), [actingPrompt]);

  const handleReset = () => {
    if (!window.confirm("모든 입력을 초기화하시겠습니까?")) return;
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
      const cachedAudioSrc = previewCacheRef.current.get(voiceId);
      if (cachedAudioSrc) {
        const cachedAudio = new Audio(cachedAudioSrc);
        cachedAudio.onended = () => setPlayingPreview(null);
        await cachedAudio.play();
        setPreviewAudio(cachedAudio);
        setPlayingPreview(voiceId);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const previewVoiceConfig = voiceOptions.find(v => v.value === voiceId);
      const previewPitch = previewVoiceConfig?.presetPitch ?? 0;
      const previewRate = previewVoiceConfig?.presetRate ?? 1;

      const response = await fetch("/api/tts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: "안녕하세요, 유튜브 채널에 오신 것을 환영합니다. 오늘 영상 핵심만 빠르게 들려드릴게요.",
          voice: voiceId,
          speakingRate: previewRate,
          pitch: previewPitch,
          preview: true,
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
      const audioSrc = `data:audio/mp3;base64,${data.audioContent}`;
      previewCacheRef.current.set(voiceId, audioSrc);
      const audio = new Audio(audioSrc);

      audio.onended = () => setPlayingPreview(null);
      audio.play();
      setPreviewAudio(audio);
      setPlayingPreview(voiceId);
    } catch (e) {
      console.error(e);
      alert("미리보기를 재생할 수 없습니다.");
    }
  };

  const handleAutoGeneratePrompt = async () => {
    if (!text.trim()) {
      alert("대본을 먼저 입력해주세요.");
      return;
    }

    setGeneratingPrompt(true);
    try {
      const prompt = await generateActingPrompt(text);
      setActingPrompt(prompt);
    } catch (error: any) {
      alert(error.message || "프롬프트 자동 생성에 실패했습니다.");
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      alert("로그인이 필요한 기능입니다.");
      return;
    }
    if (!text.trim()) {
      setError("변환할 텍스트를 입력해 주세요.");
      return;
    }
    if (couponBypassCredits && !hasUserGoogleKey) {
      const message = "할인 쿠폰 계정은 마이페이지에서 Google Cloud API 키를 먼저 등록해야 합니다.";
      setError(message);
      alert(message);
      navigate("/mypage", {
        replace: true,
        state: { from: ttsFromPath, reason: "coupon_api_key_required" },
      });
      return;
    }

    setIsGenerating(true);
    setProgressStep("preparing");
    setTtsProgress({ ...ttsProgress, currentStep: 0 });
    setError("");

    try {
      let finalSsml = "";

      // 1. AI 연기 모드이거나 프롬프트가 있으면 SSML 생성
      if (useAIActing || actingPrompt.trim()) {
        setProgressStep("analyzing"); // 연기 분석 중
        setTtsProgress(prev => ({ ...prev, currentStep: 1 }));
        finalSsml = await generateSsml(text, actingPrompt);
      } else {
        // AI 연기를 사용하지 않으면 1단계 건너뛰기
        setTtsProgress(prev => ({ ...prev, currentStep: 1 }));
      }

      // 2. TTS 요청
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
        throw new Error(toTtsErrorMessage(payload?.message || "TTS 요청 실패"));
      }

      if (!payload?.audioContent) {
        throw new Error("오디오 데이터가 비어 있습니다.");
      }

      setAudioSrc(`data:audio/mp3;base64,${payload.audioContent}`);
      if (payload?.billing?.mode === "server_credit") {
        window.dispatchEvent(new Event("creditRefresh"));
      }
      setProgressStep("completed");
      setTtsProgress(prev => ({ ...prev, currentStep: 3 }));

    } catch (err: any) {
      console.error("TTS 요청 실패:", err);
      const message = err?.message || "알 수 없는 오류가 발생했습니다.";
      if (String(message).includes("마이페이지") || String(message).toLowerCase().includes("coupon_user_key_required")) {
        navigate("/mypage", {
          replace: true,
          state: { from: ttsFromPath, reason: "coupon_api_key_required" },
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
          <p className="text-emerald-400 font-medium">스튜디오를 준비하는 중...</p>
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
                <FiUser /> 목소리 선택
              </h2>

              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">여성 성우</label>
                  <div className="space-y-2">
                    {filterVoices("female").map(v => (
                      <div
                        key={v.value}
                        onClick={() => {
                          setVoice(v.value);
                          if (v.presetPitch !== undefined) setPitch(v.presetPitch);
                          if (v.presetRate !== undefined) setSpeakingRate(v.presetRate);
                        }}
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
                          title="미리듣기"
                        >
                          {playingPreview === v.value ? <FiPause size={14} /> : <FiPlay size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">남성 성우</label>
                  <div className="space-y-2">
                    {filterVoices("male").map(v => (
                      <div
                        key={v.value}
                        onClick={() => {
                          setVoice(v.value);
                          if (v.presetPitch !== undefined) setPitch(v.presetPitch);
                          if (v.presetRate !== undefined) setSpeakingRate(v.presetRate);
                        }}
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
                          title="미리듣기"
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
                <FiSliders /> 음성 설정
              </h2>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300 font-medium">속도</span>
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
                    <span className="text-slate-300 font-medium">톤 (Pitch)</span>
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
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className={`p-2 rounded-xl ${useAIActing ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400'} flex-shrink-0`}>
                    <FiCpu size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-200">AI 연기 모드</h3>
                    <p className="text-xs text-slate-500">텍스트에 감정과 연기를 더합니다</p>
                  </div>
                </div>
                <button
                  onClick={() => setUseAIActing(!useAIActing)}
                  className={`relative h-6 w-12 flex-shrink-0 rounded-full transition-colors focus:outline-none ${useAIActing ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useAIActing ? 'translate-x-[1.75rem]' : 'translate-x-1'}`} />
                </button>
              </div>

              {useAIActing && (
                <div className="mt-4 animate-fadeIn">
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                    <textarea
                      value={actingPrompt}
                      onChange={(e) => setActingPrompt(e.target.value)}
                      placeholder="예: 뉴스 앵커처럼 신뢰감 있게, 슬픈 드라마 주인공처럼 애절하게 (비워두면 대본 분석 후 자동 완성)"
                      className="min-w-0 flex-1 rounded-xl border border-emerald-500/20 bg-black/40 p-4 text-sm leading-relaxed text-white placeholder:text-slate-600 transition-all focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      rows={2}
                    />
                    <button
                      onClick={handleAutoGeneratePrompt}
                      disabled={generatingPrompt || !text.trim()}
                      className="self-start rounded-xl border border-emerald-500/40 bg-emerald-600/20 px-4 py-2 text-sm font-medium text-emerald-100 transition-all hover:bg-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
                      title="대본을 분석하여 연기 톤 자동 완성"
                    >
                      {generatingPrompt ? "분석 중..." : withCreditLabel("자동 완성", CREDIT_COSTS.GENERATE_IDEAS, { couponBypass: couponBypassCredits })}
                    </button>
                  </div>
                  <div className="flex items-start gap-2 mt-3 text-xs text-emerald-400/70">
                    <FiInfo className="mt-0.5 flex-shrink-0" />
                    <p>AI가 대본을 분석해 최적의 연기 톤을 제안합니다. 프롬프트를 비우면 대본 내용에 맞춰 자연스럽게 읽습니다.</p>
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
                    {isGenerating ? "생성 중..." : withCreditPer10CharsLabel("음성 생성", CREDIT_COSTS.TTS_PER_10_CHARS, { couponBypass: couponBypassCredits })}
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
                  "텍스트를 분석하고 음성 생성을 준비하고 있습니다",
                  "AI가 감정과 억양을 분석하고 있습니다",
                  "Google Cloud TTS로 음성을 생성하고 있습니다",
                  "음성 파일 생성이 완료되었습니다",
                ]}
                estimatedTimeSeconds={15}
              />
            )}

            <ErrorNotice error={error} context="TTS 음성 생성" />

            {/* Audio Result */}
            {audioSrc && (
              <div className="bg-emerald-900/10 border border-emerald-500/30 rounded-2xl p-8 animate-fadeIn shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-lg">
                <h3 className="text-xl font-bold text-emerald-300 mb-6 flex items-center gap-3">
                  <div className="bg-emerald-500 text-white p-1.5 rounded-lg shadow-lg shadow-emerald-500/20">
                    <FiPlay size={18} />
                  </div>
                  생성된 AI 목소리
                </h3>
                <audio controls className="w-full mb-6 accent-emerald-500 filter invert h-12" key={audioSrc}>
                  <source src={audioSrc} type="audio/mpeg" />
                </audio>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">주의: 브라우저 캐시를 지우면 생성된 오디오가 사라질 수 있습니다.</p>
                  <a
                    href={audioSrc}
                    download={`voice_${new Date().getTime()}.mp3`}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                  >
                    <FiDownload />
                    MP3 다운로드
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


