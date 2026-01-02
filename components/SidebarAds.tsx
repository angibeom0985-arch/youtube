import React, { useEffect } from 'react';

const SidebarAds: React.FC = () => {
  useEffect(() => {
    // 왼쪽 광고 초기화
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {
      console.error('Left AdSense error:', e);
    }

    // 오른쪽 광고 초기화
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {
      console.error('Right AdSense error:', e);
    }
  }, []);

  return (
    <>
      {/* 왼쪽 사이드 광고 */}
      <div className="hidden xl:block fixed left-4 top-24 w-[160px] h-[600px] z-30">
        <ins 
          className="adsbygoogle"
          style={{ display: 'block', width: '160px', height: '600px' }}
          data-ad-client="ca-pub-2686975437928535"
          data-ad-slot="1369780468"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>

      {/* 오른쪽 사이드 광고 */}
      <div className="hidden xl:block fixed right-4 top-24 w-[160px] h-[600px] z-30">
        <ins 
          className="adsbygoogle"
          style={{ display: 'block', width: '160px', height: '600px' }}
          data-ad-client="ca-pub-2686975437928535"
          data-ad-slot="1369780468"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </>
  );
};

export default SidebarAds;
