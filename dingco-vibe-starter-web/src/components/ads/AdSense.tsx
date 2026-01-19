'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';

// 광고 슬롯 타입 정의
export type AdSlotType = 'banner' | 'sidebar' | 'inline' | 'footer' | 'responsive';

// 광고 크기 타입 정의
export type AdSize = {
  width: number;
  height: number;
};

// AdSense Props 타입 정의
interface AdSenseProps {
  slotId: string; // Google AdSense 광고 단위 ID
  slotType?: AdSlotType;
  size?: AdSize;
  className?: string;
  responsive?: boolean;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
}

// Google AdSense 광고 컴포넌트
export const AdSense: React.FC<AdSenseProps> = ({
  slotId,
  slotType = 'banner',
  size = { width: 728, height: 90 },
  className = '',
  responsive = true,
  format = 'auto',
}) => {
  const adClientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID;
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // AdSense 광고 푸시 (광고가 로드된 후)
    if (!isDevelopment && adClientId) {
      try {
        if (
          typeof window !== 'undefined' &&
          (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle
        ) {
          const adsbygoogle = (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle;
          adsbygoogle.push({});
        }
      } catch (error) {
        console.error('AdSense 광고 로드 오류:', error);
      }
    }
  }, [isDevelopment, adClientId]);

  // 개발 환경에서는 광고 대신 플레이스홀더 표시
  if (isDevelopment || !adClientId) {
    return (
      <div
        className={`bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-sm ${className}`}
        style={{
          width: responsive ? '100%' : size.width,
          height: size.height,
          minHeight: '90px',
        }}
      >
        <div className="text-center">
          <div className="font-medium">AdSense 광고 영역</div>
          <div className="text-xs mt-1">
            {slotType} • {slotId}
          </div>
          {isDevelopment && <div className="text-xs mt-1 text-blue-600">개발 모드</div>}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Google AdSense 스크립트 (전역에서 한 번만 로드) */}
      <Script
        id="adsbygoogle-init"
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClientId}`}
      />

      {/* 광고 영역 */}
      <div className={className}>
        <ins
          className="adsbygoogle"
          style={{
            display: responsive ? 'block' : 'inline-block',
            width: responsive ? '100%' : size.width,
            height: size.height,
          }}
          data-ad-client={adClientId}
          data-ad-slot={slotId}
          data-ad-format={format}
          data-full-width-responsive={responsive ? 'true' : 'false'}
        />
      </div>
    </>
  );
};

// 미리 정의된 광고 크기들
export const AD_SIZES = {
  banner: { width: 728, height: 90 },
  leaderboard: { width: 728, height: 90 },
  rectangle: { width: 300, height: 250 },
  sidebar: { width: 160, height: 600 },
  mobile: { width: 320, height: 50 },
  square: { width: 250, height: 250 },
} as const;

// 광고 슬롯별 컴포넌트들
export const BannerAd: React.FC<Omit<AdSenseProps, 'slotType' | 'size'>> = (props) => (
  <AdSense {...props} slotType="banner" size={AD_SIZES.banner} />
);

export const SidebarAd: React.FC<Omit<AdSenseProps, 'slotType' | 'size'>> = (props) => (
  <AdSense {...props} slotType="sidebar" size={AD_SIZES.sidebar} />
);

export const RectangleAd: React.FC<Omit<AdSenseProps, 'slotType' | 'size'>> = (props) => (
  <AdSense {...props} slotType="inline" size={AD_SIZES.rectangle} />
);

export const MobileAd: React.FC<Omit<AdSenseProps, 'slotType' | 'size'>> = (props) => (
  <AdSense {...props} slotType="banner" size={AD_SIZES.mobile} />
);

// 광고 성능 추적을 위한 유틸리티
export const trackAdImpression = (adSlotId: string, adType: AdSlotType) => {
  if (
    typeof window !== 'undefined' &&
    (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  ) {
    const gtag = (window as unknown as { gtag: (...args: unknown[]) => void }).gtag;
    gtag('event', 'ad_impression', {
      ad_slot_id: adSlotId,
      ad_type: adType,
    });
  }
};

// 광고 클릭 추적
export const trackAdClick = (adSlotId: string, adType: AdSlotType) => {
  if (
    typeof window !== 'undefined' &&
    (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  ) {
    const gtag = (window as unknown as { gtag: (...args: unknown[]) => void }).gtag;
    gtag('event', 'ad_click', {
      ad_slot_id: adSlotId,
      ad_type: adType,
    });
  }
};

export default AdSense;
