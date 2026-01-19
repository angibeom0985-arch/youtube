import { SeoConfigProps } from '@/types/seo';

// 사이트 기본 SEO 설정
export const seoConfig: SeoConfigProps = {
  defaultTitle: '바이브코딩 올인원 스타터킷',
  titleTemplate: '%s | 바이브코딩 스타터킷',
  defaultDescription:
    '수강생들의 개발 시간을 70% 단축시키는 완성형 개발 환경. Supabase 인증, 토스페이먼츠 결제, SEO 최적화까지 모든 것이 준비된 스타터킷.',
  defaultKeywords:
    '바이브코딩, 스타터킷, Next.js, React, TypeScript, Supabase, 토스페이먼츠, SEO 최적화, 웹 개발, 프론트엔드',
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL || 'https://dingco-vibecoding-web-starter-kit.vercel.app',
  siteName: '바이브코딩 스타터킷',
  defaultImage: '/og-image.jpg',
  twitterUsername: '@vibecoding',
  language: 'ko',
  locale: 'ko_KR',
};

// 페이지별 기본 SEO 설정들
export const pageDefaults = {
  home: {
    title: '개발 시간 70% 단축 올인원 스타터킷',
    description:
      'Supabase 인증, 토스페이먼츠 결제, SEO 최적화까지 모든 것이 준비된 완성형 개발 환경',
    keywords: '웹 개발 스타터킷, Next.js 템플릿, React 보일러플레이트, 빠른 개발',
  },
  auth: {
    title: '로그인 / 회원가입',
    description: 'Supabase 기반의 안전하고 빠른 인증 시스템으로 로그인하세요',
    keywords: '로그인, 회원가입, 인증, Supabase, 소셜 로그인',
  },
  payment: {
    title: '결제 시스템',
    description: '토스페이먼츠 기반의 안전하고 편리한 결제 시스템을 체험해보세요',
    keywords: '결제, 토스페이먼츠, 온라인 결제, 카드 결제, 간편결제',
  },
} as const;

// Open Graph 기본 이미지 설정
export const defaultOpenGraphImages = {
  home: '/images/og/home.jpg',
  auth: '/images/og/auth.jpg',
  payment: '/images/og/payment.jpg',
  default: '/images/og/default.jpg',
};

// 구조화된 데이터 템플릿들
export const structuredDataTemplates = {
  // 조직 정보
  organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: seoConfig.siteName,
    url: seoConfig.siteUrl,
    logo: `${seoConfig.siteUrl}/logo.png`,
    description: seoConfig.defaultDescription,
    sameAs: [
      // 소셜 미디어 링크들 (실제 링크로 교체 필요)
      'https://github.com/vibecoding',
      'https://twitter.com/vibecoding',
    ],
  },

  // 웹사이트 정보
  website: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: seoConfig.siteName,
    url: seoConfig.siteUrl,
    description: seoConfig.defaultDescription,
    inLanguage: seoConfig.language,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${seoConfig.siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  },

  // 소프트웨어 애플리케이션 정보
  softwareApplication: {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: seoConfig.siteName,
    description: seoConfig.defaultDescription,
    url: seoConfig.siteUrl,
    applicationCategory: 'WebApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    author: {
      '@type': 'Organization',
      name: '바이브코딩',
    },
  },
};
