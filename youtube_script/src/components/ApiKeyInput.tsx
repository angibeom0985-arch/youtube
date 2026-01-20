import React, { useEffect, useState } from "react";
import { FiKey, FiEye, FiEyeOff } from "react-icons/fi";

interface ApiKeyInputProps {
  storageKey: string;
  label?: string;
  placeholder?: string;
  helpText?: string;
  apiKeyLink?: string;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  storageKey,
  label = "Gemini API 키",
  placeholder = "API 키를 입력하세요",
  helpText = "API 키는 브라우저에만 저장되며 외부로 전송되지 않습니다.",
  apiKeyLink = "https://aistudio.google.com/app/apikey",
}) => {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

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
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <FiKey className="text-blue-600 text-lg" />
        <label className="text-sm font-semibold text-gray-800">
          {label}
        </label>
        {apiKeyLink && (
          <a
            href={apiKeyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-blue-600 hover:text-blue-800 underline"
          >
            API 키 발급받기 →
          </a>
        )}
      </div>
      
      <div className="relative">
        <input
          type={showApiKey ? "text" : "password"}
          value={apiKey}
          onChange={handleApiKeyChange}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
        />
        <button
          type="button"
          onClick={toggleShowApiKey}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
          title={showApiKey ? "API 키 숨기기" : "API 키 보기"}
        >
          {showApiKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
        </button>
      </div>

      {!apiKey && (
        <p className="mt-2 text-xs text-orange-600 flex items-center gap-1">
          <span>⚠️</span>
          <span>API 키가 필요합니다. 위 링크에서 발급받아 입력해주세요.</span>
        </p>
      )}
      
      {helpText && (
        <p className="mt-2 text-xs text-gray-600">
          {helpText}
        </p>
      )}
    </div>
  );
};

export default ApiKeyInput;
