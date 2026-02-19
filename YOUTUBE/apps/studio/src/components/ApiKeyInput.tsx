import React, { useCallback, useEffect, useState } from "react";
import { FiKey, FiEye, FiEyeOff, FiCheckCircle } from "react-icons/fi";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";

interface ApiKeyInputProps {
  apiKey: string; // <-- Add apiKey prop
  setApiKey: (key: string) => void; // <-- Add setApiKey prop
  storageKey: string;
  label?: string;
  placeholder?: string;
  helpText?: string;
  apiKeyLink?: string;
  guideRoute?: string;
  theme?: "red" | "orange" | "blue" | "emerald" | "indigo";
  apiType?: "gemini" | "youtube" | "googleCloud" | "google-cloud";
}

const themeStyles = {
  red: {
    container: "bg-gradient-to-r from-red-950/40 to-red-900/30 border border-red-800/40",
    icon: "text-red-500",
    label: "text-red-200",
    input: "bg-[#1A1A1A] border-red-800/40 text-neutral-200 focus:ring-red-500 focus:border-red-500 placeholder-neutral-500",
    button: "text-red-400 hover:text-red-300",
    warning: "text-red-400",
    helpText: "text-neutral-400",
    guideButton: "px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-100 rounded-lg text-sm font-medium transition-all"
  },
  orange: {
    container: "bg-gradient-to-r from-orange-950/40 to-orange-900/30 border border-orange-800/40",
    icon: "text-orange-500",
    label: "text-orange-200",
    input: "bg-[#1A1A1A] border-orange-800/40 text-neutral-200 focus:ring-orange-500 focus:border-orange-500 placeholder-neutral-500",
    button: "text-orange-400 hover:text-orange-300",
    warning: "text-orange-400",
    helpText: "text-neutral-400",
    guideButton: "px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-100 rounded-lg text-sm font-medium transition-all"
  },
  blue: {
    container: "bg-gradient-to-r from-blue-950/40 to-blue-900/30 border border-blue-800/40",
    icon: "text-blue-500",
    label: "text-blue-200",
    input: "bg-[#1A1A1A] border-blue-800/40 text-neutral-200 focus:ring-blue-500 focus:border-blue-500 placeholder-neutral-500",
    button: "text-blue-400 hover:text-blue-300",
    warning: "text-blue-400",
    helpText: "text-neutral-400",
    guideButton: "px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-100 rounded-lg text-sm font-medium transition-all"
  },
  emerald: {
    container: "bg-gradient-to-r from-emerald-950/40 to-emerald-900/30 border border-emerald-800/40",
    icon: "text-emerald-500",
    label: "text-emerald-200",
    input: "bg-[#1A1A1A] border-emerald-800/40 text-neutral-200 focus:ring-emerald-500 focus:border-emerald-500 placeholder-neutral-500",
    button: "text-emerald-400 hover:text-emerald-300",
    warning: "text-emerald-400",
    helpText: "text-neutral-400",
    guideButton: "px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-100 rounded-lg text-sm font-medium transition-all"
  },
  indigo: {
    container: "bg-gradient-to-r from-indigo-950/40 to-indigo-900/30 border border-indigo-800/40",
    icon: "text-indigo-500",
    label: "text-indigo-200",
    input: "bg-[#1A1A1A] border-indigo-800/40 text-neutral-200 focus:ring-indigo-500 focus:border-indigo-500 placeholder-neutral-500",
    button: "text-indigo-400 hover:text-indigo-300",
    warning: "text-indigo-400",
    helpText: "text-neutral-400",
    guideButton: "px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-100 rounded-lg text-sm font-medium transition-all"
  }
};

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  apiKey: propApiKey, // Rename prop to avoid conflict with internal state variable
  setApiKey: setPropApiKey, // Rename prop setter
  storageKey,
  label = "Gemini API 키",
  placeholder = "API 키를 입력해주세요.",
  helpText = "브라우저 및 계정에 안전하게 저장됩니다.",
  apiKeyLink = "https://aistudio.google.com/app/apikey",
  guideRoute,
  theme = "orange",
  apiType,
}) => {
  // Remove internal apiKey state, use propApiKey directly
  const [showApiKey, setShowApiKey] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isServerSaved, setIsServerSaved] = useState(false);
  const [collapseTouched, setCollapseTouched] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const styles = themeStyles[theme];

  // Helper to fetch keys from backend
  const fetchBackendKeys = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch("/api/user/settings", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        let backendKey = "";
        if (apiType === "gemini" && data.gemini_api_key) {
          backendKey = data.gemini_api_key;
        } else if ((apiType === "googleCloud" || apiType === "google-cloud") && data.google_credit_json) {
          // Handle both types just in case
          backendKey = typeof data.google_credit_json === 'string'
            ? data.google_credit_json
            : JSON.stringify(data.google_credit_json);
        }

        if (backendKey) {
          setPropApiKey(backendKey); // Use prop setter
          try {
            localStorage.setItem(storageKey, backendKey);
          } catch (error) {
            console.error("API 키 저장에 실패했습니다:", error);
          }
          if (!collapseTouched) {
            setIsCollapsed(true);
          }
          setIsServerSaved(true);
        }
      }
    } catch (e) {
      console.error("Failed to fetch backend settings", e);
    }
  }, [storageKey, apiType, setPropApiKey, collapseTouched]);

  useEffect(() => {
    if (hasInitialized) return;

    // Initialize from localStorage first, then try fetching from backend
    let hasLocalKey = false;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && stored !== propApiKey) { // Only update if stored is different from prop to avoid infinite loop
        setPropApiKey(stored);
        hasLocalKey = true;
        if (!collapseTouched) {
          setIsCollapsed(true);
        }
      } else if (!stored && propApiKey) { // If propApiKey exists but not in localStorage, save it
        localStorage.setItem(storageKey, propApiKey);
        hasLocalKey = true;
        if (!collapseTouched) {
          setIsCollapsed(true);
        }
      }
    } catch (error) {
      console.error("API 키를 불러오거나 저장하는 중 오류가 발생했습니다:", error);
    }

    // Local key가 없을 때만 백엔드 값을 가져와 덮어씀.
    if (!hasLocalKey) {
      fetchBackendKeys();
    }

    setHasInitialized(true);
  }, [storageKey, apiType, fetchBackendKeys, propApiKey, setPropApiKey, collapseTouched, hasInitialized]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPropApiKey(value); // Use prop setter
    setIsServerSaved(false);
    try {
      localStorage.setItem(storageKey, value);
    } catch (error) {
      console.error("API 키 저장에 실패했습니다:", error);
    }
  };

  const clearLocalApiKey = () => {
    setPropApiKey("");
    setIsServerSaved(false);
    setCollapseTouched(true);
    setIsCollapsed(false);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("API 키 삭제에 실패했습니다:", error);
    }
  };

  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted) {
      setPropApiKey(pasted);
      setIsServerSaved(false);
      try {
        localStorage.setItem(storageKey, pasted);
      } catch (error) {
        console.error("API 키 저장에 실패했습니다:", error);
      }
      e.preventDefault();
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.getData("text");
    if (!dropped) return;
    setPropApiKey(dropped);
    setIsServerSaved(false);
    try {
      localStorage.setItem(storageKey, dropped);
    } catch (error) {
      console.error("API 키 저장에 실패했습니다:", error);
    }
  };

  const buildApiTestErrorMessage = (rawMessage: string) => {
    const message = String(rawMessage || "");
    const lowered = message.toLowerCase();

    if (lowered.includes("expired")) {
      return `서버 저장은 완료되었습니다.\n\n테스트 실패: API 키가 만료되었습니다.\nGoogle AI Studio에서 새 키를 발급받아 다시 저장/테스트 해주세요.\n\n원본 오류: ${message}`;
    }
    if (lowered.includes("invalid") || lowered.includes("api key not valid")) {
      return `서버 저장은 완료되었습니다.\n\n테스트 실패: API 키가 유효하지 않습니다.\n키 복사값을 확인하고 다시 시도해주세요.\n\n원본 오류: ${message}`;
    }
    if (lowered.includes("permission")) {
      return `서버 저장은 완료되었습니다.\n\n테스트 실패: API 키 권한 문제가 있습니다.\nGoogle AI Studio 프로젝트/권한 설정을 확인해주세요.\n\n원본 오류: ${message}`;
    }
    if (lowered.includes("quota") || lowered.includes("rate")) {
      return `서버 저장은 완료되었습니다.\n\n테스트 실패: 쿼터 또는 요청 제한에 걸렸습니다.\n잠시 후 다시 시도해주세요.\n\n원본 오류: ${message}`;
    }
    return `서버 저장은 완료되었습니다.\n\n테스트 실패: ${message || "키가 유효하지 않습니다."}`;
  };

  const saveAndTestApiKey = async () => {
    if (!propApiKey) { // Use propApiKey
      alert("먼저 API 키를 입력해주세요.");
      return;
    }

    try {
      localStorage.setItem(storageKey, propApiKey); // Use propApiKey
    } catch (error) {
      alert("API 키 로컬 저장에 실패했습니다.");
      return;
    }

    // Backend Save
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsServerSaved(false);
      alert("로그인이 필요합니다. 다시 로그인한 후 시도해주세요.");
      return;
    }
    try {
      const payload: any = {};
      if (apiType === "gemini") {
        payload.gemini_api_key = propApiKey;
      } else if (apiType === "googleCloud" || apiType === "google-cloud") {
        try {
          const json = JSON.parse(propApiKey);
          payload.google_credit_json = json;
        } catch {
          payload.google_credit_json = { apiKey: propApiKey };
        }
      }

      if (Object.keys(payload).length > 0) {
        const saveResponse = await fetch("/api/user/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload)
        });
        if (!saveResponse.ok) {
          let reason = "backend_save_failed";
          try {
            const data = await saveResponse.json();
            reason = data?.details || data?.message || reason;
          } catch {
            try {
              reason = await saveResponse.text();
            } catch {
              // noop
            }
          }
          throw new Error(reason);
        }
        setIsServerSaved(true);
      }
    } catch (e) {
      console.error("Backend save failed", e);
      setIsServerSaved(false);
      const reason = e instanceof Error && e.message ? `\n사유: ${e.message}` : "";
      alert(`서버에 API 키 저장이 실패했습니다. 다시 시도해주세요.${reason}`);
      return;
    }

    // Test logic
    setTestLoading(true);
    setTestResult(null);

    try {
      let testUrl = "";

      if (apiType === "gemini") {
        testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${propApiKey}`; // Use propApiKey
      } else if (apiType === "youtube") {
        testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&maxResults=1&key=${propApiKey}`; // Use propApiKey
      } else if (apiType === "googleCloud" || apiType === "google-cloud") {
        if (propApiKey.trim().startsWith("{")) { // Use propApiKey
          // Service Account JSON
          setTestResult("success");
          alert("Google Cloud JSON 키가 저장되었습니다. (서버에서 검증됩니다)");
          setTestLoading(false);
          return;
        } else {
          // API Key String - test against Google Cloud TTS API directly
          testUrl = `https://texttospeech.googleapis.com/v1/voices?key=${propApiKey}`;
        }
      }

      const response = await fetch(testUrl);

      if (response.ok) {
        setTestResult("success");
        alert("API 키가 저장되었고 정상 동작합니다.");
      } else {
        setTestResult("error");
        let errorMessage = "키가 유효하지 않습니다.";
        try {
          const error = await response.json();
          errorMessage = error?.error?.message || errorMessage;
        } catch {
          // keep default
        }
        alert(buildApiTestErrorMessage(errorMessage));
      }
    } catch (err) {
      setTestResult("error");
      alert("서버 저장은 완료되었습니다.\n\n테스트 요청에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 테스트해주세요.");
    } finally {
      setTestLoading(false);
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  return (
    <div className={`${styles.container} rounded-lg shadow-sm transition-all duration-300 ${isCollapsed ? 'p-3 mb-3' : 'p-4 mb-6'}`}>
      <div className="flex items-center gap-2 mb-3">
        <FiKey className={`${styles.icon} text-lg`} />
        <label className={`text-sm font-semibold ${styles.label}`}>
          {label}
        </label>
        {propApiKey && isServerSaved && (
          <span className="text-xs text-green-400 ml-2">저장됨</span>
        )}
        {propApiKey && !isServerSaved && (
          <span className="text-xs text-yellow-400 ml-2">로컬 입력됨</span>
        )}
        <div className="ml-auto flex gap-2">
          {propApiKey && (
            <button
              onClick={clearLocalApiKey}
              className="text-xs px-2 py-1 rounded border border-white/20 hover:bg-white/10 transition-colors text-slate-200"
              title="입력칸에서 키를 지우고 다시 입력"
            >
              지우기
            </button>
          )}
          {propApiKey && ( // Use propApiKey
            <button
              onClick={() => {
                setCollapseTouched(true);
                setIsCollapsed(!isCollapsed);
              }}
              className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: styles.label.split(' ')[0].replace('text-', '') }}
            >
              {isCollapsed ? "펼치기" : "접기"}
            </button>
          )}
          {guideRoute && (
            <Link
              to={guideRoute}
              className={styles.guideButton}
            >
              발급방법
            </Link>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={propApiKey} // Use propApiKey
              onChange={handleApiKeyChange}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onCopy={() => {}}
              onCut={() => {}}
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className={`w-full px-4 py-2.5 ${apiType ? 'pr-24' : 'pr-12'} border rounded-md focus:ring-2 transition-all text-sm ${styles.input}`}
              style={{ userSelect: "text", WebkitUserSelect: "text" }}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleShowApiKey}
                className={`transition-colors ${styles.button}`}
                title={showApiKey ? "숨기기" : "보기"}
              >
                {showApiKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
              {apiType && (
                <button
                  onClick={saveAndTestApiKey}
                  disabled={testLoading || !propApiKey} // Use propApiKey
                  className={`px-2 py-1 bg-green-600/20 hover:bg-green-600/30 border border-green-500/40 text-green-100 rounded text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap`}
                  title="API 키 저장 및 테스트"
                >
                  {testLoading ? (
                    "..."
                  ) : testResult === "success" ? (
                    <FiCheckCircle size={12} />
                  ) : (
                    "저장/테스트"
                  )}
                </button>
              )}
            </div>
          </div>

          {!propApiKey && ( // Use propApiKey
            <p className={`mt-2 text-xs ${styles.warning} flex items-center gap-1`}>
              <span>주의</span>
              <span>API 키를 입력해주세요.</span>
            </p>
          )}

          {helpText && (
            <p className={`mt-2 text-xs ${styles.helpText}`}>
              {helpText}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default ApiKeyInput;
