import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { generateSsml, generateActingPrompt } from "../services/geminiService";
import { FiPlay, FiPause, FiMic, FiSliders, FiCpu, FiInfo, FiUser, FiFileText, FiDownload } from "react-icons/fi";
import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";
import ErrorNotice from "../components/ErrorNotice";
import ApiKeyInput from "../components/ApiKeyInput";

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
    localStorage.setItem(key, value);
  } catch (error) {
    console.error("TTS 로컬 저장값을 저장하지 못했습니다:", error);
  }
};

// 목소리 옵션 데이터 확장 (Google Cloud TTS 지원 음성들)
const voiceOptions = [
  // --- 한국어 (KO) ---
  { value: "ko-KR-Standard-A", label: "소연", gender: "female", type: "차분함", lang: "ko" },
  { value: "ko-KR-Standard-B", label: "지민", gender: "female", type: "또렷함", lang: "ko" },
  { value: "ko-KR-Standard-D", label: "다영", gender: "female", type: "발랄함", lang: "ko" },
  { value: "ko-KR-Wavenet-A", label: "애진", gender: "female", type: "섬세함", lang: "ko" },
  { value: "ko-KR-Wavenet-B", label: "유나", gender: "female", type: "부드러움", lang: "ko" },
  { value: "ko-KR-Neural2-A", label: "지수", gender: "female", type: "고품질", lang: "ko" },
  { value: "ko-KR-Neural2-B", label: "소윤", gender: "female", type: "밝음", lang: "ko" },
  { value: "ko-KR-Standard-C", label: "민우", gender: "male", type: "중후함", lang: "ko" },
  { value: "ko-KR-Wavenet-C", label: "준혁", gender: "male", type: "저음", lang: "ko" },
  { value: "ko-KR-Wavenet-D", label: "지훈", gender: "male", type: "차분함", lang: "ko" },
  { value: "ko-KR-Neural2-C", label: "민현", gender: "male", type: "고품질", lang: "ko" },

  // --- 영어 (EN-US) ---
  { value: "en-US-Neural2-F", label: "Sarah", gender: "female", type: "Professional", lang: "en" },
  { value: "en-US-Neural2-H", label: "Emma", gender: "female", type: "Soft", lang: "en" },
  { value: "en-US-Neural2-D", label: "John", gender: "male", type: "Bold", lang: "en" },
  { value: "en-US-Neural2-J", label: "Michael", gender: "male", type: "Clear", lang: "en" },

  // --- 일본어 (JA-JP) ---
  { value: "ja-JP-Neural2-B", label: "Mayu", gender: "female", type: "Natural", lang: "ja" },
  { value: "ja-JP-Neural2-C", label: "Nanami", gender: "female", type: "Cute", lang: "ja" },
  { value: "ja-JP-Neural2-D", label: "Keita", gender: "male", type: "Cool", lang: "ja" },

  // --- 중국어 (ZH-CN) ---
  { value: "zh-CN-Neural2-A", label: "Xiaoxiao", gender: "female", type: "Friendly", lang: "zh" },
  { value: "zh-CN-Neural2-C", label: "Yunxi", gender: "male", type: "Deep", lang: "zh" },
];

const TtsPage: React.FC = () => {
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
    // 로컬 스토리지 데이터가 너무 크면 성능 저하 및 크래시 우려가 있으므로 초기화 제안 또는 무시
    if (stored.length > 5 * 1024 * 1024) {
      console.warn("TTS audio data too large, clearing storage.");
      return "";
    }
    return stored;
  });
  const [error, setError] = useState(() => getStoredString(STORAGE_KEYS.error));
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [useAIActing, setUseAIActing] = useState(false); // AI 연기 모드 토글
  const [generatingPrompt, setGeneratingPrompt] = useState(false); // 프롬프트 생성 중

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
    // 오디오 소스가 너무 크면 저장하지 않음
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
          text: "안녕하세요, 미리듣기입니다.",
          voice: voiceId,
          speakingRate: 1,
          pitch: 0,
        }),
      });

      if (!response.ok) throw new Error("Preview failed");
      const data = await response.json();
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      
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
      const prompt = await generateActingPrompt(text, "");
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

    setIsGenerating(true);
    setProgressStep("preparing");
    setError("");

    try {
      let finalSsml = "";

      // 1. AI 연기 모드이거나 프롬프트가 있으면 SSML 생성
      if (useAIActing || actingPrompt.trim()) {
        setProgressStep("analyzing"); // 연기 분석 중
        finalSsml = await generateSsml(text, actingPrompt, "");
      }

      // 2. TTS 요청
      setProgressStep("requesting");
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
        throw new Error(payload?.message || "TTS 요청 실패");
      }

      if (!payload?.audioContent) {
        throw new Error("오디오 데이터가 비어 있습니다.");
      }

      setAudioSrc(`data:audio/mp3;base64,${payload.audioContent}`);
      setProgressStep("completed");

    } catch (err: any) {
      console.error("TTS 요청 실패:", err);
      setError(err.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
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
        
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link to="/" className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2 mb-2 font-medium">
               ← 메인으로 돌아가기
            </Link>
            <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              AI 성우 스튜디오
            </h1>
            <p className="text-slate-400 mt-2">대본에 감정을 입혀 생생한 목소리를 만들어보세요.</p>
          </div>
          <button onClick={handleReset} className="px-5 py-2.5 text-sm font-bold text-slate-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
            초기화
          </button>
        </div>

        {/* API 키 입력 */}
        <ApiKeyInput
          storageKey="google_cloud_tts_api_key"
          label="Google Cloud TTS API 키"
          placeholder="Google Cloud TTS API 키"
          helpText="브라우저에만 저장됩니다."
          guideRoute="/api-guide-cloudconsole"
          theme="emerald"
          apiType="googleCloud"
        />

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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
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
                      placeholder="예: 뉴스 앵커처럼 신뢰감 있게, 슬픈 드라마 주인공처럼 애절하게 (비워두면 대본 분석하여 자동 완성)"
                      className="flex-1 bg-black/40 border border-emerald-500/20 rounded-xl p-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all leading-relaxed"
                      rows={2}
                    />
                    <button
                      onClick={handleAutoGeneratePrompt}
                      disabled={generatingPrompt || !text.trim()}
                      className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-100 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed self-start"
                      title="대본을 분석하여 연기 톤 자동 완성"
                    >
                      {generatingPrompt ? "분석 중..." : "자동 완성"}
                    </button>
                  </div>
                  <div className="flex items-start gap-2 mt-3 text-xs text-emerald-400/70">
                    <FiInfo className="mt-0.5 flex-shrink-0" />
                    <p>AI가 대본을 분석하여 최적의 연기 톤을 제안합니다. 프롬프트를 비워두면 대본 내용에 따라 자연스러운 톤으로 읽습니다.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Text Input */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <label className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <FiFileText className="text-emerald-400" /> 대본 입력
                </label>
                <div className="text-xs text-slate-500 font-mono">
                  {text.length.toLocaleString()} 자
                </div>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-80 bg-black/30 border border-white/5 rounded-xl p-5 text-white placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-none transition-all shadow-inner tts-text-input"
                placeholder="여기에 변환할 텍스트를 입력하세요. 대화체, 나레이션 모두 가능합니다."
                style={
                  {
                    userSelect: "text",
                    WebkitUserSelect: "text",
                  } as React.CSSProperties
                }
              />
            </div>

            {/* Action Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !text.trim()}
                className={`w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-lg font-black text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all hover:from-emerald-500 hover:to-teal-500 hover:-translate-y-0.5 active:scale-[0.98] disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3`}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{progressStep === 'analyzing' ? 'AI가 감정 분석 중...' : progressStep === 'requesting' ? '음성 생성 중...' : '처리 중...'}</span>
                  </>
                ) : (
                  <>
                    <FiMic size={22} />
                    <span>TTS 음성 생성하기</span>
                    {text.trim() && (
                      <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-bold ml-2">
                        {Math.ceil(text.trim().length / 10)} ⚡
                      </span>
                    )}
                  </>
                )}
              </button>

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

