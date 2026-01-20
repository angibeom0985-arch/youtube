import React, { useEffect, useState } from "react";
import { FiKey, FiEye, FiEyeOff } from "react-icons/fi";
import { Link } from "react-router-dom";

interface ApiKeyInputProps {
  storageKey: string;
  label?: string;
  placeholder?: string;
  helpText?: string;
  apiKeyLink?: string;
  guideRoute?: string; // 내부 가이드 페이지 경로
  theme?: "orange" | "blue" | "emerald" | "indigo";
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
  helpText = "API 키는 브라우저에만 저장되며 외부로 전송되지 않습니다.",
  apiKeyLink = "https://aistudio.google.com/app/apikey",
  guideRoute,
  theme = "orange",
}) => {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  
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
    try {
      localStorage.setItem(storageKey, value);
    } catch (error) {
      console.error("API 키를 저장하는데 실패했습니다:", error);
    }
  };

  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
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
              API 발급방법
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
          className={`w-full px-4 py-2.5 pr-12 border rounded-md focus:ring-2 transition-all text-sm ${styles.input}`}
        />
        <button
          type="button"
          onClick={toggleShowApiKey}
          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${styles.button}`}
          title={showApiKey ? "API 키 숨기기" : "API 키 보기"}
        >
          {showApiKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
        </button>
      </div>

      {!apiKey && (
        <p className={`mt-2 text-xs ${styles.warning} flex items-center gap-1`}>
          <span>⚠️</span>
          <span>API 키가 필요합니다. API 발급방법 버튼을 눌러 발급받아주세요.</span>
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
