import { SitemapUrl, RobotsRule } from '@/types/seo';
import { seoConfig } from './config';

// 정적 페이지 URL들 (실제 프로젝트에 맞게 수정)
const staticPages = [
  { url: '/', priority: 1.0, changeFrequency: 'daily' as const },
  { url: '/auth', priority: 0.8, changeFrequency: 'monthly' as const },
  { url: '/payment', priority: 0.8, changeFrequency: 'monthly' as const },
  { url: '/payment/success', priority: 0.5, changeFrequency: 'monthly' as const },
  { url: '/payment/fail', priority: 0.5, changeFrequency: 'monthly' as const },
];

// 동적 페이지 URL 생성 함수
export const getDynamicPages = async (): Promise<SitemapUrl[]> => {
  // 실제 프로젝트에서는 데이터베이스나 API에서 동적 페이지 목록을 가져와야 합니다
  // 예시: 블로그 포스트, 상품 페이지 등

  const dynamicPages: SitemapUrl[] = [];

  // 예시: 블로그 포스트가 있다면
  // const posts = await fetchBlogPosts();
  // posts.forEach(post => {
  //   dynamicPages.push({
  //     url: `/blog/${post.slug}`,
  //     lastModified: new Date(post.updatedAt),
  //     priority: 0.6,
  //     changeFrequency: 'weekly'
  //   });
  // });

  return dynamicPages;
};

// 사이트맵 XML 생성
export const generateSitemap = async (): Promise<string> => {
  const staticUrls: SitemapUrl[] = staticPages.map((page) => ({
    url: page.url,
    lastModified: new Date(),
    priority: page.priority,
    changeFrequency: page.changeFrequency,
  }));

  const dynamicUrls = await getDynamicPages();
  const allUrls = [...staticUrls, ...dynamicUrls];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${allUrls
  .map(
    (url) => `  <url>
    <loc>${seoConfig.siteUrl}${url.url}</loc>
    <lastmod>${url.lastModified?.toISOString() || new Date().toISOString()}</lastmod>
    <changefreq>${url.changeFrequency || 'monthly'}</changefreq>
    <priority>${url.priority || 0.5}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return sitemap;
};

// robots.txt 생성
export const generateRobotsTxt = (): string => {
  const rules: RobotsRule[] = [
    {
      userAgent: '*',
      allow: ['/'],
      disallow: ['/api/', '/admin/', '/_next/', '/static/', '/private/', '*.json', '*.xml'],
    },
    {
      userAgent: 'Googlebot',
      allow: ['/'],
      disallow: ['/api/', '/admin/'],
      crawlDelay: 1,
    },
  ];

  let robotsTxt = '';

  rules.forEach((rule) => {
    robotsTxt += `User-agent: ${rule.userAgent}\n`;

    if (rule.allow) {
      rule.allow.forEach((path) => {
        robotsTxt += `Allow: ${path}\n`;
      });
    }

    if (rule.disallow) {
      rule.disallow.forEach((path) => {
        robotsTxt += `Disallow: ${path}\n`;
      });
    }

    if (rule.crawlDelay) {
      robotsTxt += `Crawl-delay: ${rule.crawlDelay}\n`;
    }

    robotsTxt += '\n';
  });

  // 사이트맵 URL 추가
  robotsTxt += `Sitemap: ${seoConfig.siteUrl}/sitemap.xml\n`;
  robotsTxt += `Sitemap: ${seoConfig.siteUrl}/sitemap-news.xml\n`;

  return robotsTxt;
};

// 사이트맵 인덱스 생성 (여러 사이트맵이 있는 경우)
export const generateSitemapIndex = (): string => {
  const sitemaps = [
    { url: '/sitemap.xml', lastModified: new Date() },
    // 추가 사이트맵이 있다면 여기에 추가
    // { url: '/sitemap-news.xml', lastModified: new Date() },
    // { url: '/sitemap-images.xml', lastModified: new Date() },
  ];

  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (sitemap) => `  <sitemap>
    <loc>${seoConfig.siteUrl}${sitemap.url}</loc>
    <lastmod>${sitemap.lastModified.toISOString()}</lastmod>
  </sitemap>`,
  )
  .join('\n')}
</sitemapindex>`;

  return sitemapIndex;
};

// Next.js API 라우트에서 사용할 헬퍼 함수들
export const sitemapHelpers = {
  // 사이트맵 응답 헤더 설정
  setSitemapHeaders: (res: { setHeader: (key: string, value: string) => void }) => {
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  },

  // robots.txt 응답 헤더 설정
  setRobotsHeaders: (res: { setHeader: (key: string, value: string) => void }) => {
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  },
};

// URL 정규화 함수
export const normalizeUrl = (url: string): string => {
  // 중복 슬래시 제거
  url = url.replace(/\/+/g, '/');

  // 마지막 슬래시 제거 (루트 URL 제외)
  if (url.length > 1 && url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  return url;
};

// URL 우선순위 계산 (페이지 깊이 기반)
export const calculatePriority = (url: string): number => {
  const depth = url.split('/').length - 1;

  if (depth === 1) return 1.0; // 홈페이지
  if (depth === 2) return 0.8; // 주요 섹션
  if (depth === 3) return 0.6; // 서브 페이지
  return 0.4; // 깊은 페이지
};

// 페이지 변경 빈도 계산
export const calculateChangeFrequency = (url: string): SitemapUrl['changeFrequency'] => {
  if (url === '/') return 'daily';
  if (url.includes('/blog/') || url.includes('/news/')) return 'weekly';
  if (url.includes('/product/') || url.includes('/service/')) return 'monthly';
  return 'yearly';
};

// 사이트맵 검증
export const validateSitemap = (sitemap: string): boolean => {
  try {
    // XML 형식 기본 검증
    const hasXmlDeclaration = sitemap.includes('<?xml version="1.0"');
    const hasUrlset = sitemap.includes('<urlset');
    const hasClosingUrlset = sitemap.includes('</urlset>');

    return hasXmlDeclaration && hasUrlset && hasClosingUrlset;
  } catch (error) {
    console.error('사이트맵 검증 오류:', error);
    return false;
  }
};
