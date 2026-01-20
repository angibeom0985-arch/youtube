import React, { useState, useEffect } from 'react';
import { FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { validateGeminiApiKey, validateGoogleCloudApiKey, saveApiKey } from '../services/apiKeyValidation';

interface ApiKeySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyType: 'gemini' | 'googleCloud';
  onSuccess: (apiKey: string) => void;
}

const ApiKeySetupModal: React.FC<ApiKeySetupModalProps> = ({ isOpen, onClose, keyType, onSuccess }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [rememberKey, setRememberKey] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      // 모달이 닫힐 때 상태 초기화
      setApiKey('');
      setValidationResult(null);
    }
  }, [isOpen]);

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = keyType === 'gemini' 
        ? await validateGeminiApiKey(apiKey)
        : await validateGoogleCloudApiKey(apiKey);
      
      setValidationResult(result);

      if (result.valid) {
        if (rememberKey) {
          saveApiKey(keyType, apiKey);
        }
        setTimeout(() => {
          onSuccess(apiKey);
          onClose();
        }, 1000);
      }
    } catch (error) {
      setValidationResult({
        valid: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      });
    } finally {
      setIsValidating(false);
    }
  };

  if (!isOpen) return null;

  const title = keyType === 'gemini' 
    ? 'Gemini API 키 설정'
    : 'Google Cloud API 키 설정';

  const description = keyType === 'gemini'
    ? '대본 분석 및 이미지 생성에 사용되는 Gemini API 키를 입력해주세요.'
    : '벤치마킹 및 TTS 기능에 사용되는 Google Cloud API 키를 입력해주세요.';

  const guideLink = keyType === 'gemini'
    ? '/api-guide-aistudio'
    : '/api-guide-cloudconsole';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl max-w-md w-full p-6 shadow-2xl">
        {/* 헤더 */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            <p className="text-sm text-neutral-400">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* API 키 입력 */}
        <div className="mb-4">
          <label htmlFor="api-key-input" className="block text-sm font-semibold text-neutral-200 mb-2">
            API 키
          </label>
          <input
            id="api-key-input"
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy로 시작하는 39자 API 키"
            className="w-full bg-[#121212] border border-[#2A2A2A] rounded-md p-3 text-neutral-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition font-mono text-sm"
            disabled={isValidating}
          />
        </div>

        {/* 검증 결과 */}
        {validationResult && (
          <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
            validationResult.valid 
              ? 'bg-green-900/20 border border-green-700/50' 
              : 'bg-red-900/20 border border-red-700/50'
          }`}>
            {validationResult.valid ? (
              <>
                <FiCheck className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-green-300 font-semibold text-sm">API 키가 유효합니다!</p>
                  <p className="text-green-400/80 text-xs mt-1">잠시 후 자동으로 닫힙니다.</p>
                </div>
              </>
            ) : (
              <>
                <FiAlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-red-300 font-semibold text-sm">검증 실패</p>
                  <p className="text-red-400/80 text-xs mt-1">{validationResult.error}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* 기억하기 체크박스 */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberKey}
              onChange={(e) => setRememberKey(e.target.checked)}
              className="w-4 h-4 rounded border-[#2A2A2A] bg-[#121212] text-orange-500 focus:ring-2 focus:ring-orange-500"
              disabled={isValidating}
            />
            <span className="text-sm text-neutral-300">API 키 기억하기 (브라우저에 저장)</span>
          </label>
          <p className="text-xs text-neutral-500 mt-1 ml-6">
            공용 컴퓨터에서는 체크하지 마세요.
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={handleValidate}
            disabled={!apiKey.trim() || isValidating || validationResult?.valid}
            className="flex-1 bg-gradient-to-br from-orange-600 to-orange-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isValidating ? '검증 중...' : '검증하기'}
          </button>
          <a
            href={guideLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-3 px-4 rounded-lg transition-all text-center"
          >
            발급 가이드
          </a>
        </div>

        {/* 안내 */}
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <p className="text-blue-300 text-xs">
            💡 API 키는 브라우저에만 저장되며, 외부 서버로 전송되지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySetupModal;
