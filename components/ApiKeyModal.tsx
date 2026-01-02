import React, { useState, useEffect } from "react";
import { FiX, FiSave, FiTrash2 } from "react-icons/fi";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => Promise<void>;
  currentApiKey: string | null;
  isValidating?: boolean;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentApiKey,
  isValidating = false,
}) => {
  const [apiKey, setApiKey] = useState(currentApiKey || "");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (currentApiKey) {
      setApiKey(currentApiKey);
    }
  }, [currentApiKey]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (apiKey.trim()) {
      await onSave(apiKey.trim());
    }
  };

  const handleClear = () => {
    setApiKey("");
  };

  // 모달 내부에서는 복사/붙여넣기/드래그 허용
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleInputInteraction = (
    e: React.ClipboardEvent | React.DragEvent | React.MouseEvent
  ) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="api-key-modal bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl border border-gray-700"
        onClick={handleModalClick}
        onCopy={(e) => e.stopPropagation()}
        onCut={(e) => e.stopPropagation()}
        onPaste={(e) => e.stopPropagation()}
        onDragStart={(e) => e.stopPropagation()}
        onDrag={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Gemini API 키 설정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-300 text-sm mb-3">
            AI 분석 기능을 사용하려면 Google Gemini API 키가 필요합니다.
          </p>
          <p className="text-gray-400 text-xs mb-4">
            API 키는 브라우저에만 저장되며 서버로 전송되지 않습니다.
          </p>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              API 키
            </label>
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="여기에 API 키를 입력하세요"
              autoFocus
              onCopy={handleInputInteraction}
              onCut={handleInputInteraction}
              onPaste={handleInputInteraction}
              onDragStart={handleInputInteraction}
              onDrag={handleInputInteraction}
              onContextMenu={handleInputInteraction}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text select-text"
              style={
                {
                  userSelect: "text",
                  WebkitUserSelect: "text",
                } as React.CSSProperties
              }
            />
          </div>

          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="showKey"
              checked={showKey}
              onChange={(e) => setShowKey(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="showKey" className="text-sm text-gray-300">
              API 키 표시
            </label>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || isValidating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {isValidating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                검증 중...
              </>
            ) : (
              <>
                <FiSave size={16} />
                저장하기
              </>
            )}
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <FiTrash2 size={16} />
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <a
            href="/api-guide"
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            API 키 발급 방법 보기 →
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
