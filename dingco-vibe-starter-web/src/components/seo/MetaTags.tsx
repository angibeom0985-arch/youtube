'use client';

import React, { useEffect } from 'react';
import { MetaTagsProps, OpenGraphProps, TwitterCardsProps, StructuredDataProps } from '@/types/seo';
import { seoConfig } from '@/lib/seo/config';

// 통합 SEO 컴포넌트 Props
interface SEOProps {
  meta: MetaTagsProps;
  openGraph?: OpenGraphProps;
  twitter?: TwitterCardsProps;
  structuredData?: StructuredDataProps[];
  noindex?: boolean;
  nofollow?: boolean;
}

// 동적 메타태그 생성 컴포넌트 (App Router 전용)
export const MetaTags: React.FC<SEOProps> = ({
  meta,
  openGraph,
  twitter,
  structuredData,
  noindex = false,
  nofollow = false,
}) => {
  // 제목 포맷팅
  const formatTitle = (title: string) => {
    if (seoConfig.titleTemplate && title !== seoConfig.defaultTitle) {
      return seoConfig.titleTemplate.replace('%s', title);
    }
    return title;
  };

  // canonical URL 생성
  const getCanonicalUrl = () => {
    if (meta.canonical) {
      return meta.canonical.startsWith('http')
        ? meta.canonical
        : `${seoConfig.siteUrl}${meta.canonical}`;
    }
    return undefined;
  };

  // robots meta 생성
  const getRobotsMeta = () => {
    const robots = [];
    if (noindex) robots.push('noindex');
    if (nofollow) robots.push('nofollow');
    if (meta.robots) robots.push(meta.robots);
    return robots.length > 0 ? robots.join(', ') : 'index, follow';
  };

  // Open Graph URL 생성
  const getOpenGraphUrl = () => {
    return (
      openGraph?.url || (typeof window !== 'undefined' ? window.location.href : seoConfig.siteUrl)
    );
  };

  // Open Graph 이미지 URL 생성
  const getOpenGraphImage = () => {
    if (openGraph?.image) {
      return openGraph.image.startsWith('http')
        ? openGraph.image
        : `${seoConfig.siteUrl}${openGraph.image}`;
    }
    return `${seoConfig.siteUrl}${seoConfig.defaultImage}`;
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // 동적으로 메타태그 업데이트 (App Router에서는 이 방식 사용)

    // 기본 메타태그
    document.title = formatTitle(meta.title);

    // 기존 메타태그들 제거 후 새로 추가
    const updateMeta = (name: string, content: string, property?: boolean) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let element = document.querySelector(selector) as HTMLMetaElement;

      if (!element) {
        element = document.createElement('meta');
        if (property) {
          element.setAttribute('property', name);
        } else {
          element.setAttribute('name', name);
        }
        document.head.appendChild(element);
      }
      element.content = content;
    };

    // 기본 메타태그 업데이트
    updateMeta('description', meta.description);
    if (meta.keywords) updateMeta('keywords', meta.keywords);
    if (meta.author) updateMeta('author', meta.author);
    updateMeta('robots', getRobotsMeta());
    updateMeta('content-language', seoConfig.language);
    updateMeta('language', seoConfig.language);

    // Open Graph 태그
    updateMeta('og:title', openGraph?.title || meta.title, true);
    updateMeta('og:description', openGraph?.description || meta.description, true);
    updateMeta('og:type', openGraph?.type || 'website', true);
    updateMeta('og:url', getOpenGraphUrl(), true);
    updateMeta('og:image', getOpenGraphImage(), true);
    updateMeta('og:site_name', openGraph?.siteName || seoConfig.siteName, true);
    updateMeta('og:locale', openGraph?.locale || seoConfig.locale, true);

    // Twitter Cards
    updateMeta('twitter:card', twitter?.card || 'summary_large_image');
    if (twitter?.site) updateMeta('twitter:site', twitter.site);
    if (twitter?.creator) updateMeta('twitter:creator', twitter.creator);
    updateMeta('twitter:title', twitter?.title || meta.title);
    updateMeta('twitter:description', twitter?.description || meta.description);
    updateMeta('twitter:image', twitter?.image || getOpenGraphImage());

    // Canonical URL
    const canonicalUrl = getCanonicalUrl();
    if (canonicalUrl) {
      let canonicalElement = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonicalElement) {
        canonicalElement = document.createElement('link');
        canonicalElement.rel = 'canonical';
        document.head.appendChild(canonicalElement);
      }
      canonicalElement.href = canonicalUrl;
    }

    // 구조화된 데이터 (JSON-LD)
    if (structuredData) {
      // 기존 JSON-LD 스크립트들 제거
      const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
      existingScripts.forEach((script) => {
        if (script.getAttribute('data-dynamic') === 'true') {
          script.remove();
        }
      });

      // 새로운 JSON-LD 추가
      structuredData.forEach((data, index) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-dynamic', 'true');
        script.textContent = JSON.stringify(data.data);
        document.head.appendChild(script);
      });
    }
  }, [meta, openGraph, twitter, structuredData, noindex, nofollow]);

  // App Router에서는 실제 JSX를 반환하지 않고 useEffect로 처리
  return null;
};

// 간단한 페이지 SEO 컴포넌트
interface PageSEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
}

export const PageSEO: React.FC<PageSEOProps> = ({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  noindex = false,
}) => {
  return (
    <MetaTags
      meta={{
        title,
        description,
        keywords,
        canonical,
      }}
      openGraph={{
        title,
        description,
        image: ogImage,
        type: 'website',
      }}
      twitter={{
        title,
        description,
        image: ogImage,
        card: 'summary_large_image',
      }}
      noindex={noindex}
    />
  );
};

// 블로그/기사 SEO 컴포넌트
interface ArticleSEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

export const ArticleSEO: React.FC<ArticleSEOProps> = ({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  author,
  publishedTime,
  modifiedTime,
}) => {
  const structuredData: StructuredDataProps[] = [
    {
      type: 'Article',
      data: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        author: {
          '@type': 'Person',
          name: author || '딩코딩코',
        },
        publisher: {
          '@type': 'Organization',
          name: seoConfig.siteName,
          logo: {
            '@type': 'ImageObject',
            url: `${seoConfig.siteUrl}/logo.png`,
          },
        },
        datePublished: publishedTime,
        dateModified: modifiedTime || publishedTime,
        image: ogImage
          ? `${seoConfig.siteUrl}${ogImage}`
          : `${seoConfig.siteUrl}${seoConfig.defaultImage}`,
      },
    },
  ];

  return (
    <MetaTags
      meta={{
        title,
        description,
        keywords,
        canonical,
        author,
        publishedTime,
        modifiedTime,
      }}
      openGraph={{
        title,
        description,
        image: ogImage,
        type: 'article',
      }}
      twitter={{
        title,
        description,
        image: ogImage,
        card: 'summary_large_image',
      }}
      structuredData={structuredData}
    />
  );
};

export default MetaTags;
