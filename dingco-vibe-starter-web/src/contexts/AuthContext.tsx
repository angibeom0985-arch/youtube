'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContextType, AuthUser, mapSupabaseUser } from '@/types/auth';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내에서 사용해야 합니다');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 현재 세션 확인 (에러 처리 추가)
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(mapSupabaseUser(session?.user ?? null));
        setLoading(false);
      })
      .catch((error) => {
        console.error('Supabase 세션 확인 오류:', error);
        setUser(null);
        setLoading(false);
      });

    // 인증 상태 변화 감지 (에러 처리 추가)
    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(mapSupabaseUser(session?.user ?? null));
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } catch (_error) {
      console.error('Supabase 인증 상태 감지 오류:', _error);
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (_error) {
      return { error: '로그인 중 오류가 발생했습니다' };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (_error) {
      return { error: '회원가입 중 오류가 발생했습니다' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (_error) {
      console.error('로그아웃 오류:', _error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (_error) {
      return { error: 'Google 로그인 중 오류가 발생했습니다' };
    } finally {
      setLoading(false);
    }
  };

  const signInWithKakao = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (_error) {
      return { error: '카카오 로그인 중 오류가 발생했습니다' };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (_error) {
      return { error: '비밀번호 재설정 중 오류가 발생했습니다' };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithKakao,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
