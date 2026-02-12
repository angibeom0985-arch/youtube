import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("❌ 이미지 페이지 렌더링 오류:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-gray-800 border border-red-600/60 rounded-xl p-6 text-center">
            <h1 className="text-xl font-bold text-red-400 mb-3">
              화면 표시 중 오류가 발생했습니다
            </h1>
            <p className="text-sm text-gray-300 mb-4">
              페이지를 새로고침한 뒤 다시 시도해주세요. 문제가 계속되면
              관리자에게 문의해주세요.
            </p>
            {this.state.error?.message && (
              <pre className="text-xs text-left whitespace-pre-wrap bg-gray-900/60 p-3 rounded">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
