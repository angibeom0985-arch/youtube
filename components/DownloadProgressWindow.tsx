import React, { useEffect, useState } from "react";

interface DownloadProgressWindowProps {
  onComplete: () => void;
}

const DownloadProgressWindow: React.FC<DownloadProgressWindowProps> = ({
  onComplete,
}) => {
  const [status, setStatus] = useState<"downloading" | "complete">("downloading");
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // 메시지 리스너 추가
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "DOWNLOAD_COMPLETE") {
        setStatus("complete");
        onComplete();
      }
    };

    window.addEventListener("message", handleMessage);

    // 2초 후 자동으로 완료 (백업)
    const completeTimer = setTimeout(() => {
      if (status === "downloading") {
        setStatus("complete");
        onComplete();
      }
    }, 2000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(completeTimer);
    };
  }, [onComplete, status]);

  useEffect(() => {
    if (status === "complete") {
      // 1초마다 카운트다운
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            window.close();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#0A0A0A] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 메인 카드 */}
        <div className="bg-[#1A1A1A] border-2 border-red-500/50 rounded-2xl p-8 shadow-[0_0_50px_rgba(217,0,0,0.3)] relative overflow-hidden">
          {/* 배경 애니메이션 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent animate-shimmer" />

          {/* 컨텐츠 */}
          <div className="relative z-10">
            {/* 아이콘 */}
            <div className="flex justify-center mb-6">
              {status === "downloading" ? (
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-red-500/30 rounded-full" />
                  <div className="absolute inset-0 w-24 h-24 border-4 border-transparent border-t-red-500 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.5)] animate-scale-in">
                    <svg
                      className="w-12 h-12 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div className="absolute inset-0 w-24 h-24 bg-green-500/20 rounded-full animate-ping" />
                </div>
              )}
            </div>

            {/* 텍스트 */}
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-white">
                {status === "downloading" ? (
                  <span className="inline-flex items-center gap-2">
                    다운로드 중입니다
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>.</span>
                  </span>
                ) : (
                  "다운로드 완료되었습니다!"
                )}
              </h2>

              {status === "downloading" ? (
                <p className="text-neutral-400">
                  파일을 다운로드하고 있습니다.
                  <br />
                  잠시만 기다려주세요.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-green-400 font-semibold">
                    ✓ 파일이 성공적으로 다운로드되었습니다.
                  </p>
                  <p className="text-neutral-400 text-sm">
                    {countdown}초 후 자동으로 창이 닫힙니다.
                  </p>
                </div>
              )}
            </div>

            {/* 프로그레스 바 */}
            {status === "downloading" && (
              <div className="mt-6">
                <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500 to-red-600 animate-progress" />
                </div>
              </div>
            )}

            {/* 닫기 버튼 (완료 후) */}
            {status === "complete" && (
              <button
                onClick={() => window.close()}
                className="mt-6 w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
              >
                수동으로 닫기
              </button>
            )}
          </div>
        </div>

        {/* 하단 메시지 */}
        <p className="text-center text-neutral-500 text-sm mt-4">
          유튜브 영상 분석 AI © 2025
        </p>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes scale-in {
            0% { transform: scale(0); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
          @keyframes progress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          .animate-shimmer { animation: shimmer 2s infinite; }
          .animate-scale-in { animation: scale-in 0.5s ease-out; }
          .animate-progress { animation: progress 2s ease-in-out; }
        `
      }} />
    </div>
  );
};

export default DownloadProgressWindow;
