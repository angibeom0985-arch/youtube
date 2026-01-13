import React from 'react';
import { supabase } from '../services/supabase';
import { FcGoogle } from 'react-icons/fc';

interface LoginProps {
  onLogin?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('Error logging in with Google:', error.message);
        alert('로그인 중 오류가 발생했습니다: ' + error.message);
      } else if (onLogin) {
        onLogin();
      }
    } catch (error) {
      console.error('Unexpected error during login:', error);
      alert('로그인 중 예기치 않은 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-blue-500 font-bold animate-pulse">
        ✨ 신규 가입 시 무료 크레딧 제공!
      </span>
      <button
        onClick={handleGoogleLogin}
        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow-md font-medium text-sm border border-gray-200"
        title="Google 계정으로 로그인하고 크레딧 받기"
      >
        <FcGoogle size={20} />
        <span>Google로 시작하기</span>
      </button>
    </div>
  );
};

export default Login;
