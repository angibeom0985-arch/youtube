// 기본 메타태그 타입
export interface MetaTagsProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  robots?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

// Open Graph 타입
export interface OpenGraphProps {
  title?: string;
  description?: string;
  type?: 'website' | 'article' | 'book' | 'profile' | 'music.song' | 'music.album' | 'video.movie';
  url?: string;
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  siteName?: string;
  locale?: string;
}

// Twitter Cards 타입
export interface TwitterCardsProps {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string; // @username
  creator?: string; // @username
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
}

// JSON-LD 구조화된 데이터 타입
export interface StructuredDataProps {
  type:
    | 'Organization'
    | 'WebSite'
    | 'WebPage'
    | 'Article'
    | 'BreadcrumbList'
    | 'Product'
    | 'LocalBusiness'
    | 'Event'
    | 'Review';
  data: Record<string, unknown>;
}

// 페이지별 SEO 설정 타입
export interface PageSeoProps {
  meta: MetaTagsProps;
  openGraph?: OpenGraphProps;
  twitter?: TwitterCardsProps;
  structuredData?: StructuredDataProps[];
}

// 사이트 기본 설정 타입
export interface SeoConfigProps {
  defaultTitle: string;
  titleTemplate?: string; // "%s | 사이트명" 형태
  defaultDescription: string;
  defaultKeywords?: string;
  siteUrl: string;
  siteName: string;
  defaultImage: string;
  twitterUsername?: string;
  language: string;
  locale: string;
}

// Sitemap URL 타입
export interface SitemapUrl {
  url: string;
  lastModified?: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

// Robots.txt 규칙 타입
export interface RobotsRule {
  userAgent: string;
  allow?: string[];
  disallow?: string[];
  crawlDelay?: number;
}
