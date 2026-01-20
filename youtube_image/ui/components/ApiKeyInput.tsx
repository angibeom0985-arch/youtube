import React, { useEffect, useState } from "react";
import { FiKey, FiEye, FiEyeOff, FiCheckCircle } from "react-icons/fi";
import { Link } from "react-router-dom";

interface ApiKeyInputProps {
  storageKey: string;
  label?: string;
  placeholder?: string;
  helpText?: string;
  apiKeyLink?: string;
  guideRoute?: string;
  theme?: "orange" | "blue" | "emerald" | "indigo";
  apiType?: "gemini" | "youtube" | "googleCloud";
}

const themeStyles = {
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
  storageKey,
  label = "Gemini API 키",
  placeholder = "API 키를 입력하세요",
  helpText = "브라우저에만 저장됩니다.",
  apiKeyLink = "https://aistudio.google.com/app/apikey",
  guideRoute,
  theme = "orange",
  apiType,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  
  const styles = themeStyles[theme];

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setApiKey(stored);
      }
    } catch (error) {
      console.error("API 키를 불러오는데 실패했습니다:", error);
    }
  }, [storageKey]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setApiKey(value);
    // 입력할 때마다 자동 저장은 유지
    try {
      localStorage.setItem(storageKey, value);
    } catch (error) {
      console.error("API 키를 저장하는데 실패했습니다:", error);
    }
  };

  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  const saveAndTestApiKey = async () => {
    if (!apiKey) {
      alert('⚠️ API 키를 먼저 입력해주세요.');
      return;
    }

    // 1. 먼저 저장
    try {
      localStorage.setItem(storageKey, apiKey);
    } catch (error) {
      alert('❌ API 키 저장에 실패했습니다.');
      console.error("API 키 저장 실패:", error);
      return;
    }

    // 2. 그 다음 테스트
    setTestLoading(true);
    setTestResult(null);

    try {
      let testUrl = "";
      
      if (apiType === "gemini") {
        testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      } else if (apiType === "youtube") {
        testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&maxResults=1&key=${apiKey}`;
      } else if (apiType === "googleCloud") {
        testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&maxResults=1&key=${apiKey}`;
      }

      const response = await fetch(testUrl);
      
      if (response.ok) {
        setTestResult("success");
        alert('✅ API 키가 저장되고 정상 작동합니다!');
      } else {
        setTestResult("error");
        const error = await response.json();
        alert(`❌ API 키 오류: ${error.error?.message || '키가 유효하지 않습니다'}`);
      }
    } catch (err) {
      setTestResult("error");
      alert('❌ 테스트 실패: 네트워크를 확인해주세요.');
    } finally {
      setTestLoading(false);
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  return (
    <div className={`${styles.container} rounded-lg p-4 mb-6 shadow-sm`}>
      <div className="flex items-center gap-2 mb-3">
        <FiKey className={`${styles.icon} text-lg`} />
        <label className={`text-sm font-semibold ${styles.label}`}>
          {label}
        </label>
        <div className="ml-auto flex gap-2">
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
      
      <div className="relative">
        <input
          type={showApiKey ? "text" : "password"}
          value={apiKey}
          onChange={handleApiKeyChange}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 ${apiType ? 'pr-24' : 'pr-12'} border rounded-md focus:ring-2 transition-all text-sm ${styles.input}`}
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
              disabled={testLoading || !apiKey}
              className={`px-2 py-1 bg-green-600/20 hover:bg-green-600/30 border border-green-500/40 text-green-100 rounded text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap`}
              title="API 키 저장 및 테스트"
            >
              {testLoading ? (
                "..."
              ) : testResult === "success" ? (
                <FiCheckCircle size={12} />
              ) : (
                "저장·테스트"
              )}
            </button>
          )}
        </div>
      </div>

      {!apiKey && (
        <p className={`mt-2 text-xs ${styles.warning} flex items-center gap-1`}>
          <span>⚠️</span>
          <span>API 키 필요</span>
        </p>
      )}
      
      {helpText && (
        <p className={`mt-2 text-xs ${styles.helpText}`}>
          {helpText}
        </p>
      )}
    </div>
  );
};

export default ApiKeyInput;
