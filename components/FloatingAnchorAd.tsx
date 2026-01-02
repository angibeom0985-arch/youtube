import React, { useEffect, useState } from "react";

const FloatingAnchorAd: React.FC = () => {
  const [adSize, setAdSize] = useState({ width: "728px", height: "90px" });

  useEffect(() => {
    // 화면 크기에 따른 광고 크기 설정
    const updateAdSize = () => {
      const isMobile = window.innerWidth < 768;
      setAdSize({
        width: isMobile ? "320px" : "728px",
        height: isMobile ? "50px" : "90px",
      });
    };

    // 초기 설정
    updateAdSize();

    // 화면 크기 변경 시 업데이트
    window.addEventListener("resize", updateAdSize);

    return () => {
      window.removeEventListener("resize", updateAdSize);
    };
  }, []);

  useEffect(() => {
    // AdSense 스크립트 로드
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push(
        {}
      );
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, [adSize]); // adSize 변경 시 재로드

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 bg-[#1A1A1A] shadow-lg rounded-lg overflow-hidden">
      <ins
        className="adsbygoogle"
        style={{
          display: "inline-block",
          width: adSize.width,
          height: adSize.height,
        }}
        data-ad-client="ca-pub-2686975437928535"
        data-ad-slot="8116896499"
      />
    </div>
  );
};

export default FloatingAnchorAd;
