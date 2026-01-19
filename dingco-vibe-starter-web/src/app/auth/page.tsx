'use client';

import React, { useState } from 'react';
import { LoginForm, SignUpForm } from '@/components/auth';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { PageSEO } from '@/components/seo';
import { pageDefaults } from '@/lib/seo/config';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  // 이미 로그인된 경우 홈으로 리디렉션
  React.useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleAuthSuccess = () => {
    router.push('/');
  };

  if (user) {
    return <div>리디렉션 중...</div>;
  }

  return (
    <>
      {/* SEO 메타태그 */}
      <PageSEO
        title={pageDefaults.auth.title}
        description={pageDefaults.auth.description}
        keywords={pageDefaults.auth.keywords}
        ogImage="/images/og/auth.jpg"
      />

      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {isLogin ? (
            <LoginForm onSuccess={handleAuthSuccess} onSwitchToSignUp={() => setIsLogin(false)} />
          ) : (
            <SignUpForm onSuccess={handleAuthSuccess} onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </>
  );
}
