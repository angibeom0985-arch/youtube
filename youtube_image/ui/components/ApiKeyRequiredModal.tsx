import React from "react";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiExternalLink } from "react-icons/fi";

interface ApiKeyRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiType: "gemini" | "youtube" | "google-cloud";
  featureName: string;
}

const ApiKeyRequiredModal: React.FC<ApiKeyRequiredModalProps> = ({
  isOpen,
  onClose,
  apiType,
  featureName,
}) => {
  if (!isOpen) return null;

  const getApiInfo = () => {
    switch (apiType) {
      case "gemini":
        return {
          title: "Gemini API 키 필요",
          description: `${featureName} 기능을 사용하려면 Google Gemini API 키가 필요합니다.`,
          guides: [
            {
              name: "AI 스튜디오 API 발급방법",
              path: "/api-guide-aistudio",
              description: "빠른 발급 (권장)",
            },
            {
              name: "클라우드 콘솔 API 발급방법",
              path: "/api-guide-cloudconsole",
              description: "상세한 설정",
            },
          ],
        };
      case "youtube":
        return {
          title: "YouTube API 키 필요",
          description: `${featureName} 기능을 사용하려면 YouTube Data API v3 키가 필요합니다.`,
          guides: [
            {
              name: "클라우드 콘솔 API 발급방법",
              path: "/api-guide-cloudconsole",
              description: "YouTube API 발급",
            },
          ],
        };
      case "google-cloud":
        return {
          title: "Google Cloud API 키 필요",
          description: `${featureName} 기능을 사용하려면 Google Cloud TTS API 키가 필요합니다.`,
          guides: [
            {
              name: "클라우드 콘솔 API 발급방법",
              path: "/api-guide-cloudconsole",
              description: "Cloud TTS API 발급",
            },
          ],
        };
    }
  };

  const apiInfo = getApiInfo();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border-2 border-red-500/30 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-[0_0_50px_rgba(239,68,68,0.3)]">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <FiAlertCircle className="text-red-400 text-2xl" />
          </div>
          <h2 className="text-2xl font-black text-white">{apiInfo.title}</h2>
        </div>

        {/* 설명 */}
        <p className="text-gray-300 mb-6 leading-relaxed">
          {apiInfo.description}
        </p>

        {/* 가이드 버튼들 */}
        <div className="space-y-3 mb-6">
          <p className="text-sm font-semibold text-gray-400 mb-2">
            API 키 발급 방법:
          </p>
          {apiInfo.guides.map((guide) => (
            <Link
              key={guide.path}
              to={guide.path}
              className="block p-4 bg-gradient-to-r from-red-600/10 to-orange-600/10 border border-red-500/30 rounded-lg hover:border-red-500/50 hover:from-red-600/20 hover:to-orange-600/20 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white group-hover:text-red-400 transition-colors">
                    {guide.name}
                  </h3>
                  <p className="text-sm text-gray-400">{guide.description}</p>
                </div>
                <FiExternalLink className="text-red-400 text-xl group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {/* 안내 메시지 */}
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-300">
            💡 API 키는 무료로 발급받을 수 있으며, 발급 후 곧바로 사용 가능합니다.
          </p>
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
};

export default ApiKeyRequiredModal;
