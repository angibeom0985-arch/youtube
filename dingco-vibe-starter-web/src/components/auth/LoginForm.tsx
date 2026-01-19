'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthFormData } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
}

export const LoginForm = ({ onSuccess, onSwitchToSignUp }: LoginFormProps) => {
  const { signIn, signInWithGoogle, signInWithKakao, loading } = useAuth();
  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('이메일과 비밀번호를 입력해주세요');
      return;
    }

    const result = await signIn(formData.email, formData.password);

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess?.();
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const result = await signInWithGoogle();

    if (result.error) {
      setError(result.error);
    }
  };

  const handleKakaoSignIn = async () => {
    setError('');
    const result = await signInWithKakao();

    if (result.error) {
      setError(result.error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 에러가 있을 때 onError 콜백 호출
  React.useEffect(() => {
    if (error && onSuccess) {
      // 에러 처리 로직
    }
  }, [error, onSuccess]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">로그인</CardTitle>
        <CardDescription>계정에 로그인하여 서비스를 이용하세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="이메일을 입력하세요"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="비밀번호를 입력하세요"
              disabled={loading}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">또는</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full"
          >
            Google로 로그인
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleKakaoSignIn}
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400"
          >
            카카오로 로그인
          </Button>
        </div>

        {onSwitchToSignUp && (
          <p className="text-center text-sm text-gray-600">
            계정이 없으신가요?{' '}
            <button
              type="button"
              onClick={onSwitchToSignUp}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              회원가입
            </button>
          </p>
        )}
      </CardContent>
    </Card>
  );
};
