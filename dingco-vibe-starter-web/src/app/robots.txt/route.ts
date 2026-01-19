import { NextResponse } from 'next/server';
import { generateRobotsTxt } from '@/lib/seo/sitemap';

export async function GET() {
  try {
    // robots.txt 생성
    const robotsTxt = generateRobotsTxt();

    // 응답 헤더 설정
    const response = new NextResponse(robotsTxt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
      },
    });

    return response;
  } catch (error) {
    console.error('robots.txt 생성 오류:', error);

    return new NextResponse('robots.txt 생성 중 오류가 발생했습니다.', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

export const dynamic = 'force-dynamic';
