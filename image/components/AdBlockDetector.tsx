import React, { useEffect, useState } from 'react';

const AdBlockDetector: React.FC = () => {
  const [isAdBlockEnabled, setIsAdBlockEnabled] = useState(false);

  useEffect(() => {
    const detectAdBlock = async () => {
      // 방법 1: Google Ads 스크립트 로드 확인
      const adsScriptLoaded = document.querySelector('script[src*="adsbygoogle"]');
      
      // 방법 2: 테스트 요소 생성
      const testAd = document.createElement('div');
      testAd.innerHTML = '&nbsp;';
      testAd.className = 'adsbox ad-placement ad-placeholder adbadge BannerAd';
      testAd.style.height = '1px';
      testAd.style.position = 'absolute';
      testAd.style.top = '-9999px';
      testAd.style.left = '-9999px';
      document.body.appendChild(testAd);

      await new Promise(resolve => setTimeout(resolve, 100));

      const isBlocked = 
        testAd.offsetHeight === 0 || 
        testAd.offsetWidth === 0 ||
        window.getComputedStyle(testAd).display === 'none' ||
        window.getComputedStyle(testAd).visibility === 'hidden';

      document.body.removeChild(testAd);

      // 방법 3: adsbygoogle 객체 확인
      const adsGoogleExists = typeof window.adsbygoogle !== 'undefined';
      
      // 방법 4: 광고 차단 감지 (fetch 테스트)
      let fetchBlocked = false;
      try {
        await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store'
        });
      } catch (e) {
        fetchBlocked = true;
      }

      // 하나라도 차단이 감지되면
      if (isBlocked || !adsGoogleExists || fetchBlocked) {
        setIsAdBlockEnabled(true);
      }
    };

    // 페이지 로드 후 1초 뒤 감지 (광고 스크립트 로딩 대기)
    const timer = setTimeout(detectAdBlock, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!isAdBlockEnabled) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#1f2937',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>
          🚫
        </div>
        <h2
          style={{
            color: '#f87171',
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '16px',
          }}
        >
          광고 차단 프로그램이 감지되었습니다
        </h2>
        <p
          style={{
            color: '#d1d5db',
            fontSize: '16px',
            lineHeight: '1.6',
            marginBottom: '24px',
          }}
        >
          이 웹사이트는 광고 수익으로 운영됩니다. 
          <br />
          서비스를 계속 이용하시려면 광고 차단 프로그램을 비활성화하고 페이지를 새로고침해주세요.
        </p>
        <div
          style={{
            backgroundColor: '#374151',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'left',
          }}
        >
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '12px', fontWeight: 'bold' }}>
            💡 해결 방법:
          </p>
          <ol style={{ color: '#d1d5db', fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px' }}>
            <li>광고 차단 확장 프로그램을 비활성화하세요 (AdBlock, uBlock Origin 등)</li>
            <li>이 사이트를 광고 허용 목록에 추가하세요</li>
            <li>페이지를 새로고침하세요 (F5 또는 Ctrl+R)</li>
          </ol>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#8b5cf6',
            color: 'white',
            padding: '14px 32px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            width: '100%',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#7c3aed';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#8b5cf6';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          페이지 새로고침
        </button>
        <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '20px' }}>
          무료 서비스 제공을 위해 광고가 필요합니다. 양해 부탁드립니다. 🙏
        </p>
      </div>
    </div>
  );
};

export default AdBlockDetector;
