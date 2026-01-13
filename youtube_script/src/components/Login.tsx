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
    <button
      onClick={handleGoogleLogin}
      className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow-md font-medium text-sm"
      title="Google 계정으로 로그인"
    >
      <FcGoogle size={20} />
      <span>Google로 시작하기</span>
    </button>
  );
};

export default Login;
