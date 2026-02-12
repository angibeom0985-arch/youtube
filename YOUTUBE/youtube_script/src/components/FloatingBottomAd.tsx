import React, { useEffect, useRef, useState } from 'react';

const FloatingBottomAd: React.FC = () => {
  const adRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

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

  if (!isVisible) return null;

  return (
    <div
      ref={adRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        backgroundColor: '#fff',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '728px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '8px',
      }}
    >
      <button
        onClick={() => setIsVisible(false)}
        style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          background: '#ef4444',
          color: 'white',
          border: '2px solid white',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          cursor: 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
        title="광고 닫기"
      >
        ×
      </button>
      <ins
        className="adsbygoogle"
        style={{
          display: 'inline-block',
          width: '100%',
          height: '90px',
        }}
        data-ad-client="ca-pub-2686975437928535"
        data-ad-slot="6238963767"
        data-ad-format="horizontal"
        data-full-width-responsive="false"
      />
      <style>{`
        @media (max-width: 768px) {
          ins.adsbygoogle {
            height: 50px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default FloatingBottomAd;
