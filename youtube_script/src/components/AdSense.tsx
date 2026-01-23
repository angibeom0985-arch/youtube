import React, { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdSenseProps {
  adSlot?: string;
  className?: string;
}

const AdSense: React.FC<AdSenseProps> = ({ adSlot = "8116896499", className = '' }) => {
  useEffect(() => {
    try {
      // adsbygoogle가 배열이고 production 환경일 때만 실행
      if (typeof window !== 'undefined' && 
          Array.isArray(window.adsbygoogle) && 
          process.env.NODE_ENV === 'production') {
        window.adsbygoogle.push({});
      }
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

  // development 환경에서는 AdSense 렌더링하지 않음
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  return (
    <div className={`text-center my-6 ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-2686975437928535"
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdSense;
