import React from 'react';
import { supabase } from '../services/supabase';
import { FcGoogle } from 'react-icons/fc';
import { SiKakaotalk } from 'react-icons/si';

interface LoginProps {
  onLogin?: () => void;
}

const enableKakaoLogin = import.meta.env.VITE_ENABLE_KAKAO_LOGIN === 'true';

const Login: React.FC<LoginProps> = ({ onLogin }) => {

  const handleKakaoLogin = async () => {
    if (!enableKakaoLogin) return;
    try {
      const redirectTo = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo,
          scopes: 'profile_nickname',
          queryParams: {
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Error logging in with Kakao:', error.message);
        alert('??? ??? ??: ' + error.message);
      } else if (onLogin) {
        onLogin();
      }
    } catch (error) {
      console.error('Unexpected error during Kakao login:', error);
      alert('??? ??? ? ? ? ?? ??? ??????.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const redirectTo = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
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
    <div className="flex flex-col items-center gap-3">
      <span className="text-sm font-black text-blue-600 animate-bounce bg-blue-50 px-3 py-1 rounded-full border border-blue-200 shadow-sm">
        ✨ 지금 가입하고 무료 크레딧 받기
      </span>



      {enableKakaoLogin && (
        <button
          onClick={handleKakaoLogin}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-300 text-black rounded-lg hover:bg-yellow-200 transition-colors shadow-md font-medium text-sm border border-yellow-200"
          title="??? ???? ??????."
        >
          <SiKakaotalk size={20} />
          <span>???? ????</span>
        </button>
      )}
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
