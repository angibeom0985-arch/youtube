import React, { useEffect, useState } from 'react';
import { FiExternalLink, FiHome } from 'react-icons/fi';
import AdSense from '../components/AdSense';
import { supabase } from '../services/supabase';
import type { User } from '@supabase/supabase-js';
import UserCreditToolbar from '../components/UserCreditToolbar';
import HomeBackButton from "../components/HomeBackButton";

const ApiGuidePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 사용자 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // 페이지 제목 설정
    document.title = 'API 키 발급 가이드 - 유튜브 영상 분석 AI';
    
    // OG 태그 업데이트
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };
    
    updateMetaTag('og:title', 'API 키 발급 가이드 선택');
    updateMetaTag('og:description', 'Google AI Studio 또는 Cloud Console API 키 발급 가이드를 선택하세요.');
    updateMetaTag('og:image', 'https://youtube.money-hotissue.com/og-image-api-guide.png');
    updateMetaTag('og:url', 'https://youtube.money-hotissue.com/api-guide');

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };


  return (
    <div className="api-guide-page min-h-screen bg-[#121212] text-white font-sans p-4 sm:p-8">
      <div className="absolute top-0 right-0 p-4 sm:p-6 flex gap-3 z-50 items-center">
        <UserCreditToolbar user={user} onLogout={handleLogout} tone="orange" />
      </div>

      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <HomeBackButton tone="orange" className="mb-4" />
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent mb-4">
            API 키 발급 가이드
          </h1>
          <p className="text-neutral-300">서비스 기능별로 필요한 API 키를 선택하여 발급받으세요.</p>
        </header>

        <main className="space-y-6">
          {/* 가이드 선택 카드 */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* AI Studio 가이드 */}
            <a
              href="/api-guide-aistudio"
              className="block bg-gradient-to-br from-orange-900/20 to-orange-800/20 border-2 border-orange-700/50 rounded-xl p-6 hover:border-orange-500 transition-all hover:scale-105"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center text-2xl">
                  🤖
                </div>
                <h2 className="text-2xl font-bold text-white">Google AI Studio</h2>
              </div>
              <p className="text-neutral-300 mb-4">
                Gemini API 키를 발급받아 대본 분석 및 이미지 생성 기능을 사용하세요.
              </p>
              <div className="bg-orange-900/30 border border-orange-700/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-orange-300 font-bold flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  대본 분석 및 이미지 생성 기능
                </p>
                <ul className="text-sm text-orange-100 space-y-1 ml-6">
                  <li>• 유튜브 대본 분석</li>
                  <li>• 떡상 기획안 생성</li>
                  <li>• AI 이미지 생성</li>
                </ul>
              </div>
              <div className="mt-4 pt-4 border-t border-orange-700/30">
                <p className="text-xs text-neutral-500">💡 신용카드 등록 불필요, 완전 무료</p>
              </div>
            </a>

            {/* Cloud Console 가이드 */}
            <a
              href="/api-guide-cloudconsole"
              className="block bg-gradient-to-br from-blue-900/20 to-blue-800/20 border-2 border-blue-700/50 rounded-xl p-6 hover:border-blue-500 transition-all hover:scale-105"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-2xl">
                  ☁️
                </div>
                <h2 className="text-2xl font-bold text-white">Google Cloud Console</h2>
              </div>
              <p className="text-neutral-300 mb-4">
                YouTube Data API 및 TTS API 키를 발급받아 벤치마킹과 음성 변환 기능을 사용하세요.
              </p>
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-blue-300 font-bold flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  벤치마킹과 음성 변환 기능
                </p>
                <ul className="text-sm text-blue-100 space-y-1 ml-6">
                  <li>• YouTube 영상 벤치마킹</li>
                  <li>• 텍스트 음성 변환 (TTS)</li>
                  <li>• 음성 텍스트 변환 (STT)</li>
                </ul>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-700/30">
                <p className="text-xs text-neutral-500">💳 TTS 사용 시 결제 정보 필요</p>
              </div>
            </a>
          </div>

          <AdSense />

          {/* 비교 표 */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">API 키 비교</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="text-left py-3 px-4 text-neutral-400">항목</th>
                    <th className="text-left py-3 px-4 text-orange-400">AI Studio</th>
                    <th className="text-left py-3 px-4 text-blue-400">Cloud Console</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-300">
                  <tr className="border-b border-[#2A2A2A]">
                    <td className="py-3 px-4">발급 위치</td>
                    <td className="py-3 px-4">aistudio.google.com</td>
                    <td className="py-3 px-4">console.cloud.google.com</td>
                  </tr>
                  <tr className="border-b border-[#2A2A2A]">
                    <td className="py-3 px-4">비용</td>
                    <td className="py-3 px-4 text-green-400">완전 무료</td>
                    <td className="py-3 px-4 text-yellow-400">일부 유료 (TTS)</td>
                  </tr>
                  <tr className="border-b border-[#2A2A2A]">
                    <td className="py-3 px-4">결제 정보</td>
                    <td className="py-3 px-4">불필요</td>
                    <td className="py-3 px-4">TTS 사용 시 필요</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">주요 기능</td>
                    <td className="py-3 px-4">대본/이미지 생성</td>
                    <td className="py-3 px-4">벤치마킹/음성</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <AdSense />

          {/* FAQ */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">자주 묻는 질문</h3>
            <div className="space-y-4">
              <div className="border-b border-[#2A2A2A] pb-4">
                <h4 className="font-bold text-white mb-2">Q: 두 개의 API 키를 모두 발급받아야 하나요?</h4>
                <p className="text-neutral-300 text-sm">A: 사용하려는 기능에 따라 다릅니다. 대본 분석만 사용한다면 AI Studio만, 벤치마킹도 필요하면 둘 다 발급받으세요.</p>
              </div>
              <div className="border-b border-[#2A2A2A] pb-4">
                <h4 className="font-bold text-white mb-2">Q: API 키 발급이 어려워요</h4>
                <p className="text-neutral-300 text-sm">A: 각 가이드 페이지에서 단계별 스크린샷과 함께 자세히 안내하고 있습니다. 위 카드를 클릭하여 확인하세요.</p>
              </div>
              <div>
                <h4 className="font-bold text-white mb-2">Q: API 키가 유출되면 어떻게 하나요?</h4>
                <p className="text-neutral-300 text-sm">A: 각 서비스(AI Studio 또는 Cloud Console)에서 즉시 API 키를 재발급받고 기존 키를 삭제하세요.</p>
              </div>
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="flex justify-center pt-8">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-orange-600 to-orange-500 text-white font-bold rounded-lg hover:from-orange-500 hover:to-orange-400 transition-all"
            >
              <FiHome size={20} />
              메인으로 돌아가기
            </a>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ApiGuidePage;
