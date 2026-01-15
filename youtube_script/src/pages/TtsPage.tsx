import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { generateSsml } from "../services/geminiService";
import { FiPlay, FiPause, FiMic, FiSliders, FiCpu, FiInfo } from "react-icons/fi";
import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";
import UserCreditToolbar from "../components/UserCreditToolbar";

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

// 목소리 옵션 데이터 확장
const voiceOptions = [
  // 여성 목소리
  { value: "ko-KR-Standard-A", label: "서연 (차분한)", gender: "female", type: "Standard" },
  { value: "ko-KR-Standard-B", label: "지민 (아나운서 톤)", gender: "female", type: "Standard" },
  { value: "ko-KR-Standard-D", label: "하은 (발랄한)", gender: "female", type: "Standard" },
  { value: "ko-KR-Wavenet-A", label: "수진 (자연스러운)", gender: "female", type: "WaveNet" },
  { value: "ko-KR-Wavenet-B", label: "유나 (부드러운)", gender: "female", type: "WaveNet" },
  { value: "ko-KR-Neural2-A", label: "지원 (고품질 AI)", gender: "female", type: "Neural2" },
  { value: "ko-KR-Neural2-B", label: "서윤 (뉴스 톤)", gender: "female", type: "Neural2" },
  // 추가된 여성 목소리
  { value: "en-US-Neural2-F", label: "Sarah (영어/여성)", gender: "female", type: "English" },
  { value: "ja-JP-Neural2-B", label: "Mayu (일본어/여성)", gender: "female", type: "Japanese" },

  // 남성 목소리
  { value: "ko-KR-Standard-C", label: "민준 (신뢰감 있는)", gender: "male", type: "Standard" },
  { value: "ko-KR-Wavenet-C", label: "준호 (굵은 목소리)", gender: "male", type: "WaveNet" },
  { value: "ko-KR-Wavenet-D", label: "지훈 (청년)", gender: "male", type: "WaveNet" },
  { value: "ko-KR-Neural2-C", label: "도현 (고품질 AI)", gender: "male", type: "Neural2" },
  // 추가된 남성 목소리
  { value: "en-US-Neural2-D", label: "John (영어/남성)", gender: "male", type: "English" },
];

const TtsPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [text, setText] = useState(() => getStoredString(STORAGE_KEYS.text));
  const [voice, setVoice] = useState(() =>
    getStoredString(STORAGE_KEYS.voice, "ko-KR-Standard-A")
  );
  const [speakingRate, setSpeakingRate] = useState(() =>
    getStoredNumber(STORAGE_KEYS.rate, 1)
  );
  const [pitch, setPitch] = useState(() => getStoredNumber(STORAGE_KEYS.pitch, 0));
  const [actingPrompt, setActingPrompt] = useState(() => getStoredString(STORAGE_KEYS.prompt));
  const [audioSrc, setAudioSrc] = useState(() => getStoredString(STORAGE_KEYS.audio));
  const [error, setError] = useState(() => getStoredString(STORAGE_KEYS.error));
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [useAIActing, setUseAIActing] = useState(false); // AI 연기 모드 토글

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => setStoredValue(STORAGE_KEYS.text, text), [text]);
  useEffect(() => setStoredValue(STORAGE_KEYS.voice, voice), [voice]);
  useEffect(() => setStoredValue(STORAGE_KEYS.rate, String(speakingRate)), [speakingRate]);
  useEffect(() => setStoredValue(STORAGE_KEYS.pitch, String(pitch)), [pitch]);
  useEffect(() => setStoredValue(STORAGE_KEYS.audio, audioSrc), [audioSrc]);
  useEffect(() => setStoredValue(STORAGE_KEYS.error, error), [error]);
  useEffect(() => setStoredValue(STORAGE_KEYS.prompt, actingPrompt), [actingPrompt]);

  const handleReset = () => {
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
          text: "안녕하세요, 제 목소리입니다.",
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

  const handleGenerate = async () => {
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
        
        // 프롬프트가 비어있으면 "자연스럽게" 또는 텍스트 맥락에 맞게 자동 생성하도록 geminiService에서 처리됨
        finalSsml = await generateSsml(text, actingPrompt, ""); // API 키는 서버에서 처리
      }

      // 2. TTS 요청
      setProgressStep("requesting");
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: finalSsml ? undefined : text, // SSML이 있으면 텍스트 대신 보냄
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
      window.dispatchEvent(new Event("creditRefresh"));
      setProgressStep("completed");

    } catch (err: any) {
      console.error("TTS 요청 실패:", err);
      setError(err.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const femaleVoices = voiceOptions.filter(v => v.gender === "female");
  const maleVoices = voiceOptions.filter(v => v.gender === "male");

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-950 to-emerald-900 text-white relative">
      {/* Auth Status - Top Right */}
      <div className="absolute top-0 right-0 p-4 sm:p-6 flex gap-3 z-50 items-center">
        <UserCreditToolbar user={user} onLogout={handleLogout} tone="emerald" />
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link to="/" className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2 mb-2">
               ← 메인으로 돌아가기
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              AI 성우 스튜디오
            </h1>
            <p className="text-slate-400 mt-1">대본에 감정을 입혀 생생한 목소리를 만들어보세요.</p>
          </div>
          <button onClick={handleReset} className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
            초기화
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Voice Selection */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-emerald-300 mb-4 flex items-center gap-2">
                <FiUser /> 목소리 선택
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">여성 성우</label>
                  <div className="space-y-2">
                    {femaleVoices.map(v => (
                      <div 
                        key={v.value}
                        onClick={() => setVoice(v.value)}
                        className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all ${voice === v.value ? 'bg-emerald-500/20 border-emerald-500/50 ring-1 ring-emerald-500/50' : 'bg-slate-800/50 border-transparent hover:bg-slate-800'}`}
                      >
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${voice === v.value ? 'text-emerald-300' : 'text-slate-200'}`}>{v.label}</span>
                          <span className="text-xs text-slate-500">{v.type}</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handlePreviewVoice(v.value); }}
                          className="p-2 rounded-full hover:bg-white/10 text-emerald-400 transition-colors"
                          title="미리듣기"
                        >
                          {playingPreview === v.value ? <FiPause size={14} /> : <FiPlay size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">남성 성우</label>
                  <div className="space-y-2">
                    {maleVoices.map(v => (
                      <div 
                        key={v.value}
                        onClick={() => setVoice(v.value)}
                        className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all ${voice === v.value ? 'bg-emerald-500/20 border-emerald-500/50 ring-1 ring-emerald-500/50' : 'bg-slate-800/50 border-transparent hover:bg-slate-800'}`}
                      >
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${voice === v.value ? 'text-emerald-300' : 'text-slate-200'}`}>{v.label}</span>
                          <span className="text-xs text-slate-500">{v.type}</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handlePreviewVoice(v.value); }}
                          className="p-2 rounded-full hover:bg-white/10 text-emerald-400 transition-colors"
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
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-emerald-300 mb-4 flex items-center gap-2">
                <FiSliders /> 음성 설정
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">속도</span>
                    <span className="text-emerald-400">{speakingRate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={speakingRate}
                    onChange={(e) => setSpeakingRate(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">톤 (Pitch)</span>
                    <span className="text-emerald-400">{pitch.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.5"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Text Input & Result */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Acting Prompt Section */}
            <div className={`border rounded-xl p-5 transition-all duration-300 ${useAIActing ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${useAIActing ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    <FiCpu size={18} />
                  </div>
                  <div>
                    <h2 className={`font-semibold ${useAIActing ? 'text-emerald-300' : 'text-slate-300'}`}>AI 감정 연기</h2>
                    <p className="text-xs text-slate-400">Gemini가 대본을 분석해 감정을 입힙니다.</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setUseAIActing(!useAIActing)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${useAIActing ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useAIActing ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {useAIActing && (
                <div className="mt-3 animate-fadeIn">
                  <textarea
                    value={actingPrompt}
                    onChange={(e) => setActingPrompt(e.target.value)}
                    placeholder="예: 아주 슬픈 목소리로 읽어줘, 뉴스 앵커처럼 진지하게, 어린아이에게 말하듯 다정하게 (비워두면 AI가 대본을 분석해 자동으로 설정합니다)"
                    className="w-full bg-slate-900/50 border border-emerald-500/30 rounded-lg p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    rows={2}
                  />
                  <div className="flex items-start gap-2 mt-2 text-xs text-emerald-400/80">
                    <FiInfo className="mt-0.5" />
                    <p>AI가 텍스트를 SSML(음성 합성 마크업 언어)로 변환하여 억양, 숨쉬기, 강조를 자동으로 추가합니다.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Text Input */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
              <label className="text-lg font-semibold text-slate-200 mb-3 block">대본 입력</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-64 bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-none"
                placeholder="여기에 변환할 텍스트를 입력하세요..."
              />
              <div className="mt-2 text-right text-xs text-slate-500">
                {text.length}자
              </div>
            </div>

            {/* Action Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !text.trim()}
                className={`w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-[0_0_18px_rgba(16,185,129,0.25)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center gap-2`}
              >
                {isGenerating ? (
                  "처리 중입니다..."
                ) : (
                  <>
                    <span>TTS 생성하기</span>
                    {text.trim() && (
                      <span className="bg-emerald-700/50 px-2 py-0.5 rounded text-xs font-normal">
                        예상 {Math.ceil(text.trim().length / 10)} ⚡
                      </span>
                    )}
                  </>
                )}
              </button>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-200 text-sm animate-fadeIn">
                <p className="font-semibold mb-1">오류가 발생했습니다</p>
                <p>{error}</p>
              </div>
            )}

            {/* Audio Result */}
            {audioSrc && (
              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-6 animate-fadeIn">
                <h3 className="text-lg font-semibold text-emerald-300 mb-4 flex items-center gap-2">
                  <FiPlay /> 생성 완료
                </h3>
                <audio controls className="w-full mb-4 accent-emerald-500">
                  <source src={audioSrc} type="audio/mpeg" />
                </audio>
                <div className="flex justify-end">
                  <a
                    href={audioSrc}
                    download="generated_voice.mp3"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    MP3 다운로드
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 사용자 크레딧 사이드바 */}
    </div>
  );
};

export default TtsPage;
