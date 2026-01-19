import { User } from '@supabase/supabase-js';

// 애플리케이션에서 사용하는 사용자 타입
export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    provider?: string;
  };
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
}

// 인증 컨텍스트 타입
export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithKakao: () => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

// 로그인/회원가입 폼 타입
export interface AuthFormData {
  email: string;
  password: string;
  confirmPassword?: string;
}

// 인증 에러 타입
export interface AuthError {
  message: string;
  status?: number;
}

// Supabase User를 AuthUser로 변환하는 유틸리티 타입
export const mapSupabaseUser = (user: User | null): AuthUser | null => {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email || '',
    user_metadata: user.user_metadata,
    app_metadata: user.app_metadata,
  };
};
