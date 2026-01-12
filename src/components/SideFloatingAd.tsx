import React, { useEffect, useRef } from 'react';

const SideFloatingAd: React.FC<{ side: 'left' | 'right' }> = ({ side }) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const timer = setTimeout(() => {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('Ad loading error:', e);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={adRef}
      style={{
        position: 'fixed',
        top: '50%',
        [side]: '30px',
        transform: 'translateY(-50%)',
        zIndex: 9998,
        width: '160px',
        height: '600px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ins
        className="adsbygoogle"
        style={{
          display: 'inline-block',
          width: '160px',
          height: '600px',
        }}
        data-ad-client="ca-pub-2686975437928535"
        data-ad-slot="6238963767"
        data-ad-format="vertical"
        data-full-width-responsive="false"
      />
      <style>{`
        @media (max-width: 768px) {
          div[style*="position: fixed"][style*="width: 160px"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SideFloatingAd;
