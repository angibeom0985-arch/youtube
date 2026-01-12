import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEYS = {
  text: "tts_text",
  voice: "tts_voice",
  rate: "tts_rate",
  pitch: "tts_pitch",
  audio: "tts_audio",
  error: "tts_error",
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

const voiceOptions = [
  { value: "ko-KR-Standard-A", label: "한국어 표준 여성 (A)" },
  { value: "ko-KR-Standard-C", label: "한국어 표준 남성 (C)" },
  { value: "ko-KR-Standard-D", label: "한국어 표준 여성 (D)" },
  { value: "en-US-Standard-C", label: "영어 표준 여성 (C)" },
];

const TtsPage: React.FC = () => {
  const [text, setText] = useState(() => getStoredString(STORAGE_KEYS.text));
  const [voice, setVoice] = useState(() =>
    getStoredString(STORAGE_KEYS.voice, "ko-KR-Standard-A")
  );
  const [speakingRate, setSpeakingRate] = useState(() =>
    getStoredNumber(STORAGE_KEYS.rate, 1)
  );
  const [pitch, setPitch] = useState(() => getStoredNumber(STORAGE_KEYS.pitch, 0));
  const [audioSrc, setAudioSrc] = useState(() => getStoredString(STORAGE_KEYS.audio));
  const [error, setError] = useState(() => getStoredString(STORAGE_KEYS.error));
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(""); // preparing, requesting, processing
  const [copyStatus, setCopyStatus] = useState("");


  useEffect(() => setStoredValue(STORAGE_KEYS.text, text), [text]);
  useEffect(() => setStoredValue(STORAGE_KEYS.voice, voice), [voice]);
  useEffect(() => setStoredValue(STORAGE_KEYS.rate, String(speakingRate)), [speakingRate]);
  useEffect(() => setStoredValue(STORAGE_KEYS.pitch, String(pitch)), [pitch]);
  useEffect(() => setStoredValue(STORAGE_KEYS.audio, audioSrc), [audioSrc]);
  useEffect(() => setStoredValue(STORAGE_KEYS.error, error), [error]);

  const handleReset = () => {
    setText("");
    setVoice("ko-KR-Standard-A");
    setSpeakingRate(1);
    setPitch(0);
    setAudioSrc("");
    setError("");
    setCopyStatus("");
    setProgressStep("");
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
      // 1. 준비 단계 (시각적 피드백을 위한 짧은 지연)
      await new Promise((resolve) => setTimeout(resolve, 600));
      
      setProgressStep("requesting");
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice,
          speakingRate,
          pitch,
        }),
      });

      setProgressStep("processing");
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        // 에러 메시지 구성
        let errorReason = "알 수 없는 오류가 발생했습니다.";
        let solution = "잠시 후 다시 시도해주세요.";
        
        if (response.status === 401 || response.status === 403) {
           errorReason = "Google Cloud API 키 인증에 실패했습니다.";
           solution = "1. Google Cloud Console에서 API 키가 올바른지 확인하세요.\n2. 해당 프로젝트에서 Text-to-Speech API가 '사용 설정(Enable)' 되어 있는지 확인하세요.";
        } else if (response.status === 429) {
           errorReason = "API 요청 한도를 초과했습니다.";
           solution = "잠시 기다렸다가 다시 시도해주세요.";
        } else if (response.status === 500) {
           errorReason = "서버 내부 오류 또는 Google Cloud API 설정 문제입니다.";
           solution = "Google Cloud Console에서 Text-to-Speech API가 활성화되어 있는지 다시 한 번 확인해주세요.";
        }

        const devMessage = payload?.message || "No detail provided";
        
        const formattedError = `🚨 TTS 생성 오류 발생\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 오류 원인:\n• ${errorReason}\n\n` +
          `💡 해결 방법:\n${solution}\n\n` +
          `🔧 개발자 전달 정보:\n` +
          `• 상태 코드: ${response.status}\n` +
          `• 상세 메시지: ${devMessage}\n` +
          `• 오류 시각: ${new Date().toLocaleString()}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━`;

        throw new Error(formattedError);
      }

      if (!payload?.audioContent) {
        throw new Error(
          `🚨 오디오 데이터 누락\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 오류 원인:\n• 서버 응답에 오디오 데이터가 포함되지 않았습니다.\n\n` +
          `💡 해결 방법:\n다시 시도해주세요.\n\n` +
          `🔧 개발자 전달 정보:\n• payload.audioContent is null\n` +
          `━━━━━━━━━━━━━━━━━━━━━━`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 500)); // 완료 느낌 주기
      setAudioSrc(`data:audio/mp3;base64,${payload.audioContent}`);
      setCopyStatus("");
      setProgressStep("completed");

    } catch (err: any) {
      console.error("TTS 요청 실패:", err);
      // 이미 포맷팅된 에러인지 확인
      const msg = err.message || "알 수 없는 오류";
      if (msg.startsWith("🚨")) {
        setError(msg);
      } else {
        // 일반 에러 포맷팅
        const formattedError = `🚨 시스템 오류 발생\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 오류 원인:\n• 네트워크 문제이거나 브라우저 오류일 수 있습니다.\n\n` +
          `💡 해결 방법:\n인터넷 연결을 확인하고 페이지를 새로고침하세요.\n\n` +
          `🔧 개발자 전달 정보:\n` +
          `• 오류 내용: ${msg}\n` +
          `• 오류 시각: ${new Date().toLocaleString()}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━`;
        setError(formattedError);
      }
      setAudioSrc("");
      setCopyStatus("");
    } finally {
      setIsGenerating(false);
      // 성공/실패 후 잠시 뒤에 스텝 초기화는 하지 않음 (상태 보여주기 위함) 또는 필요시 추가
    }
  };

  const handleCopyError = async () => {
    if (!error) {
      return;
    }

    try {
      await navigator.clipboard.writeText(error);
      setCopyStatus("오류 메시지가 복사되었습니다.");
    } catch (copyError) {
      console.error("오류 메시지 복사 실패:", copyError);
      setCopyStatus("오류 메시지 복사에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900/60 via-slate-900/70 to-emerald-800/60 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-emerald-100"
            >
              ← 홈으로
            </Link>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">
              TTS 음성 제작
            </h1>
            <p className="mt-3 text-sm text-emerald-100/80 sm:text-base">
              API 키는 서버에서 자동으로 사용됩니다. 텍스트만 입력해 주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-emerald-300/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-500/25"
          >
            초기화
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-950/30 p-6 shadow-[0_0_30px_rgba(16,185,129,0.18)]">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-emerald-200">
                  변환할 텍스트
                </label>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="예) 여러분 안녕하세요. 오늘은..."
                  rows={8}
                  className="mt-2 w-full resize-y rounded-lg border border-emerald-500/30 bg-emerald-950/50 px-3 py-2 text-sm text-white placeholder:text-emerald-200/60 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 tts-text-input"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-emerald-200">
                  목소리 선택
                </label>
                <select
                  value={voice}
                  onChange={(event) => setVoice(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-emerald-500/30 bg-emerald-950/50 px-3 py-2 text-sm text-white focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                >
                  {voiceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-emerald-200">
                  말하기 속도: {speakingRate.toFixed(2)}
                </label>
                <input
                  type="range"
                  min={0.7}
                  max={1.3}
                  step={0.05}
                  value={speakingRate}
                  onChange={(event) => setSpeakingRate(Number(event.target.value))}
                  className="mt-3 w-full accent-emerald-400"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-emerald-200">
                  음높이: {pitch.toFixed(1)}
                </label>
                <input
                  type="range"
                  min={-6}
                  max={6}
                  step={0.5}
                  value={pitch}
                  onChange={(event) => setPitch(Number(event.target.value))}
                  className="mt-3 w-full accent-emerald-400"
                />
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="mt-2 w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-[0_0_18px_rgba(16,185,129,0.25)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isGenerating ? "처리 중입니다..." : "TTS 생성하기"}
              </button>

              {/* 진행 상태 표시바 */}
              {isGenerating && (
                <div className="mt-4 rounded-lg bg-emerald-950/40 p-3 border border-emerald-500/20">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm text-emerald-100/90">
                      <div className={`h-2 w-2 rounded-full transition-colors ${progressStep === 'preparing' || progressStep === 'requesting' || progressStep === 'processing' ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-800'}`} />
                      <span className={progressStep === 'preparing' ? 'font-bold text-emerald-300' : ''}>1. 텍스트 분석 및 준비</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-emerald-100/90">
                      <div className={`h-2 w-2 rounded-full transition-colors ${progressStep === 'requesting' || progressStep === 'processing' ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-800'}`} />
                      <span className={progressStep === 'requesting' ? 'font-bold text-emerald-300' : ''}>2. Google 서버 요청 중</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-emerald-100/90">
                      <div className={`h-2 w-2 rounded-full transition-colors ${progressStep === 'processing' ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-800'}`} />
                      <span className={progressStep === 'processing' ? 'font-bold text-emerald-300' : ''}>3. 오디오 데이터 변환 중</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-orange-500/60 bg-orange-950/50 p-4 text-sm text-orange-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold text-orange-100">오류 메시지</span>
              <button
                type="button"
                onClick={handleCopyError}
                className="rounded-full border border-orange-400/60 bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-100 transition hover:border-orange-300 hover:bg-orange-500/30"
              >
                복사
              </button>
            </div>
            <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-orange-100">
              {error}
            </pre>
            {copyStatus && (
              <p className="mt-3 text-xs text-orange-100/80">{copyStatus}</p>
            )}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-emerald-400/25 bg-emerald-950/25 p-6">
          <h2 className="text-lg font-bold text-emerald-200">생성 결과</h2>
          {audioSrc ? (
            <div className="mt-4 space-y-4">
              <audio controls className="w-full">
                <source src={audioSrc} type="audio/mpeg" />
              </audio>
              <a
                href={audioSrc}
                download="youtube-factory-tts.mp3"
                className="inline-flex items-center justify-center rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/25"
              >
                MP3 다운로드
              </a>
            </div>
          ) : (
            <p className="mt-3 text-sm text-emerald-100/70">
              아직 생성된 음성이 없습니다. 텍스트를 입력한 뒤 TTS 생성하기를 눌러주세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TtsPage;
