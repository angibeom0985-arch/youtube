import { NextResponse } from 'next/server';
import { generateSitemap } from '@/lib/seo/sitemap';

export async function GET() {
  try {
    // 사이트맵 생성
    const sitemap = await generateSitemap();

    // 응답 헤더 설정
    const response = new NextResponse(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
      },
    });

    return response;
  } catch (error) {
    console.error('사이트맵 생성 오류:', error);

    return new NextResponse('사이트맵 생성 중 오류가 발생했습니다.', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

export const dynamic = 'force-dynamic';
