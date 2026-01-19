'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageSEO } from '@/components/seo';
import { pageDefaults } from '@/lib/seo/config';

export default function Home() {
  const { user, signOut } = useAuth();

  // 구조화된 데이터는 layout.tsx에서 전역으로 처리됨

  const features = [
    {
      title: '🔐 Supabase 인증',
      description: '이메일/소셜 로그인, 회원가입, 인증 상태 관리',
      status: 'completed',
    },
    {
      title: '💳 토스페이먼츠 결제',
      description: '카드 결제, 간편결제, 결제 승인 시스템',
      status: 'completed',
    },
    {
      title: '🎨 Shadcn/ui 컴포넌트',
      description: '모던하고 접근성 좋은 UI 컴포넌트 라이브러리',
      status: 'completed',
    },
    {
      title: '🚀 SEO 최적화',
      description: '동적 메타태그, 사이트맵, 구조화된 데이터',
      status: 'completed',
    },
  ];

  return (
    <>
      {/* SEO 메타태그 */}
      <PageSEO
        title={pageDefaults.home.title}
        description={pageDefaults.home.description}
        keywords={pageDefaults.home.keywords}
        ogImage="/images/og/home.jpg"
      />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* 헤더 */}
        <header className="bg-white/80 backdrop-blur-md border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  딩코딩코 스타터킷
                </h1>
                <Badge variant="secondary">v1.0</Badge>
              </div>
              <div className="flex items-center space-x-4">
                {user ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">안녕하세요, {user.email}님!</span>
                    <Button variant="outline" onClick={signOut}>
                      로그아웃
                    </Button>
                  </div>
                ) : (
                  <div className="space-x-2">
                    <Link href="/auth">
                      <Button variant="outline">로그인</Button>
                    </Link>
                    <Link href="/auth">
                      <Button>시작하기</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* 메인 컨텐츠 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* 히어로 섹션 */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              개발 시간을{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                70% 단축
              </span>
              시키는
              <br />
              올인원 스타터킷
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Supabase 인증, 토스페이먼츠 결제, SEO 최적화까지 모든 것이 준비된 완성형 개발 환경.
              <br />
              강의 수강생들이 바로 핵심 기능 개발에 집중할 수 있습니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/payment">
                <Button size="lg" className="min-w-[200px]">
                  결제 시스템 체험하기
                </Button>
              </Link>
              <Link href="/auth">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  인증 시스템 체험하기
                </Button>
              </Link>
            </div>
          </div>

          {/* 기능 섹션 */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              포함된 핵심 기능들
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="relative overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <Badge variant={feature.status === 'completed' ? 'default' : 'secondary'}>
                        {feature.status === 'completed' ? '완료' : '진행중'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* 기술 스택 */}
          <Card className="mb-16">
            <CardHeader>
              <CardTitle className="text-2xl text-center">사용된 기술 스택</CardTitle>
              <CardDescription className="text-center">
                최신 기술과 검증된 라이브러리들로 구성
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="frontend" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="frontend">프론트엔드</TabsTrigger>
                  <TabsTrigger value="backend">백엔드 & 인증</TabsTrigger>
                  <TabsTrigger value="tools">도구 & 배포</TabsTrigger>
                </TabsList>

                <TabsContent value="frontend" className="mt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS', 'Shadcn/ui'].map(
                      (tech) => (
                        <div
                          key={tech}
                          className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg text-center"
                        >
                          <p className="font-semibold text-gray-900">{tech}</p>
                        </div>
                      ),
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="backend" className="mt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['Supabase', '토스페이먼츠', 'PostgreSQL', 'Row Level Security'].map(
                      (tech) => (
                        <div
                          key={tech}
                          className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg text-center"
                        >
                          <p className="font-semibold text-gray-900">{tech}</p>
                        </div>
                      ),
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="tools" className="mt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['Vercel', 'ESLint', 'Prettier', 'Husky', 'Commitlint'].map((tech) => (
                      <div
                        key={tech}
                        className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg text-center"
                      >
                        <p className="font-semibold text-gray-900">{tech}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* CTA 섹션 */}
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardContent className="text-center py-12">
              <h2 className="text-3xl font-bold mb-4">지금 바로 시작하세요!</h2>
              <p className="text-xl mb-8 opacity-90">
                모든 설정이 완료된 개발 환경에서 바로 프로젝트를 시작할 수 있습니다.
              </p>
            </CardContent>
          </Card>
        </main>

        {/* 푸터 */}
        <footer className="bg-white border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-gray-600">
              <p className="mb-2">
                Made with ❤️ by{' '}
                <a
                  href="https://www.inflearn.com/users/408812/@dingcodingco"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  딩코딩코
                </a>
              </p>
              <p className="text-sm">© 2025 dingcodingco. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
