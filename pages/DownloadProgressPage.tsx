import React from "react";
import DownloadProgressWindow from "../components/DownloadProgressWindow";

const DownloadProgressPage: React.FC = () => {
  const handleComplete = () => {
    // 다운로드 완료 처리
    console.log("Download completed");
  };

  return <DownloadProgressWindow onComplete={handleComplete} />;
};

export default DownloadProgressPage;
