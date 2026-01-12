import React from 'react';

interface AdBlockWarningModalProps {
  isOpen: boolean;
}

const AdBlockWarningModal: React.FC<AdBlockWarningModalProps> = ({ isOpen }) => {
  if (!isOpen) return null;

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] p-4">
      <div className="bg-gradient-to-br from-red-900 to-red-950 border-4 border-red-500 rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-pulse">
        <div className="text-center">
          {/* 경고 아이콘 */}
          <div className="mb-6">
            <svg 
              className="w-24 h-24 mx-auto text-red-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>

          {/* 제목 */}
          <h2 className="text-4xl font-extrabold text-white mb-4">
            ⚠️ 광고 차단 프로그램 감지
          </h2>

          {/* 설명 */}
          <div className="text-white space-y-4 mb-8">
            <p className="text-xl font-semibold text-red-300">
              광고 차단 프로그램(AdBlock)이 활성화되어 있습니다.
            </p>
            <p className="text-lg">
              이 서비스는 <span className="text-yellow-300 font-bold">완전 무료</span>로 제공되며,<br />
              광고 수익으로 운영됩니다.
            </p>
            <div className="bg-red-800 bg-opacity-50 rounded-lg p-4 mt-4">
              <p className="text-lg font-semibold text-yellow-300">
                💡 서비스를 이용하시려면
              </p>
              <ol className="text-left mt-3 space-y-2 text-white">
                <li>1️⃣ 브라우저의 광고 차단 프로그램을 <span className="text-red-300 font-bold">비활성화</span>해주세요</li>
                <li>2️⃣ 또는 이 사이트를 광고 차단 <span className="text-green-300 font-bold">예외 목록</span>에 추가해주세요</li>
                <li>3️⃣ 설정 후 아래 버튼을 클릭하여 <span className="text-blue-300 font-bold">새로고침</span>해주세요</li>
              </ol>
            </div>
          </div>

          {/* 안내 문구 */}
          <p className="text-sm text-gray-300 mb-6">
            광고 차단을 해제하시면 모든 기능을 제한 없이 이용하실 수 있습니다.
          </p>

          {/* 새로고침 버튼 */}
          <button
            onClick={handleReload}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            🔄 광고 차단 해제 후 새로고침
          </button>

          {/* 추가 안내 */}
          <div className="mt-6 text-sm text-gray-400">
            <p>광고 차단 프로그램: AdBlock, uBlock Origin, AdGuard 등</p>
            <p className="mt-2">💰 광고 수익은 더 나은 서비스 개발에 사용됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdBlockWarningModal;
