import React, { useEffect, useState } from 'react';

interface AdBlockDetectorProps {
  onAdBlockDetected: () => void;
}

const AdBlockDetector: React.FC<AdBlockDetectorProps> = ({ onAdBlockDetected }) => {
  useEffect(() => {
    const detectAdBlock = async () => {
      // 방법 1: Google AdSense 스크립트 로딩 확인
      const checkAdSenseScript = () => {
        const scripts = document.querySelectorAll('script[src*="adsbygoogle"]');
        if (scripts.length > 0) {
          // 스크립트가 있는지 확인
          const adsbygoogle = (window as any).adsbygoogle;
          if (!adsbygoogle || adsbygoogle.loaded !== true) {
            return true; // AdBlock 감지
          }
        }
        return false;
      };

      // 방법 2: 테스트 광고 요소 생성
      const checkTestAd = (): Promise<boolean> => {
        return new Promise((resolve) => {
          const testAd = document.createElement('div');
          testAd.innerHTML = '&nbsp;';
          testAd.className = 'adsbox ad-banner ad-placement advertisement';
          testAd.style.position = 'absolute';
          testAd.style.top = '-1px';
          testAd.style.left = '-1px';
          testAd.style.width = '1px';
          testAd.style.height = '1px';
          
          document.body.appendChild(testAd);
          
          setTimeout(() => {
            const isBlocked = testAd.offsetHeight === 0 || 
                             testAd.offsetWidth === 0 || 
                             testAd.style.display === 'none' ||
                             testAd.style.visibility === 'hidden';
            
            document.body.removeChild(testAd);
            resolve(isBlocked);
          }, 100);
        });
      };

      // 방법 3: Fetch 테스트
      const checkFetchBlock = async (): Promise<boolean> => {
        try {
          const response = await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
            method: 'HEAD',
            mode: 'no-cors',
          });
          return false; // 요청 성공 = AdBlock 없음
        } catch (error) {
          return true; // 요청 실패 = AdBlock 있음
        }
      };

      // 여러 방법으로 감지
      const results = await Promise.all([
        checkTestAd(),
        checkFetchBlock(),
      ]);

      const adBlockDetected = results.some(result => result === true);

      if (adBlockDetected) {
        onAdBlockDetected();
      }
    };

    // 페이지 로드 후 1초 뒤에 감지 시작
    const timer = setTimeout(() => {
      detectAdBlock();
    }, 1000);

    return () => clearTimeout(timer);
  }, [onAdBlockDetected]);

  return null; // UI 없음, 감지만 수행
};

export default AdBlockDetector;
