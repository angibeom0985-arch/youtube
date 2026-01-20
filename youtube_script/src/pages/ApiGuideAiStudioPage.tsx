import React, { useEffect, useState } from 'react';
import { FiExternalLink, FiHome } from 'react-icons/fi';
import AdSense from '../components/AdSense';
import { supabase } from '../services/supabase';
import type { User } from '@supabase/supabase-js';
import UserCreditToolbar from '../components/UserCreditToolbar';
import HomeBackButton from "../components/HomeBackButton";
import { getStoredApiKey } from '../services/apiKeyValidation';
import { loadGuideData, type GuidePageData } from '../services/guideDataService';

const ApiGuideAiStudioPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [guideData, setGuideData] = useState<GuidePageData | null>(null);

  useEffect(() => {
    // 가이드 데이터 로드
    const data = loadGuideData('aistudio');
    setGuideData(data);

    // 사용자 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // API 키 확인
    const apiKey = getStoredApiKey('gemini');
    setHasApiKey(!!apiKey);

    // 페이지 제목 설정
    document.title = 'Google AI Studio API 키 발급 가이드 - 대본/이미지 생성';
    
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
    
    updateMetaTag('og:title', 'Google AI Studio API 키 발급 가이드');
    updateMetaTag('og:description', '대본 분석 및 이미지 생성에 필요한 Gemini API 키 발급 방법을 안내합니다.');
    updateMetaTag('og:image', 'https://youtube.money-hotissue.com/og-image-api-guide.png');
    updateMetaTag('og:url', 'https://youtube.money-hotissue.com/api-guide-aistudio');

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!guideData) {
    return <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
      <p>로딩 중...</p>
    </div>;
  }

  return (
    <div className="api-guide-page min-h-screen bg-[#121212] text-white font-sans p-4 sm:p-8">
      <div className="absolute top-0 right-0 p-4 sm:p-6 flex gap-3 z-50 items-center">
        <UserCreditToolbar user={user} onLogout={handleLogout} tone="orange" />
      </div>

      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <HomeBackButton tone="orange" className="mb-4" />
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent mb-4">
            {guideData.title}
          </h1>
          <p className="text-neutral-300">{guideData.subtitle}</p>
          <div className="mt-4 p-4 bg-orange-900/20 border border-orange-700/50 rounded-lg">
            <p className="text-orange-300 text-sm font-semibold mb-2">📌 이 API 키가 필요한 기능:</p>
            <ul className="text-orange-200 text-sm space-y-1">
              {guideData.features.map((feature, index) => (
                <li key={index}>• {feature}</li>
              ))}
            </ul>
          </div>
        </header>

        <main className="space-y-8">
          {/* API 키 등록 상태 */}
          <div className={`p-4 rounded-lg border ${hasApiKey ? 'bg-green-900/20 border-green-700/50' : 'bg-yellow-900/20 border-yellow-700/50'}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className={`font-bold ${hasApiKey ? 'text-green-300' : 'text-yellow-300'}`}>
                  {hasApiKey ? '✅ API 키가 등록되어 있습니다' : '⚠️ API 키가 등록되지 않았습니다'}
                </p>
                <p className="text-sm text-neutral-400 mt-1">
                  {hasApiKey ? 'API 키가 브라우저에 저장되어 있습니다.' : '아래 가이드를 따라 API 키를 발급받고 등록해주세요.'}
                </p>
              </div>
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors"
              >
                {hasApiKey ? 'API 키 변경' : 'API 키 등록'}
              </button>
            </div>
          </div>

          {/* 보안 및 비용 안내 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
              <h3 className="text-blue-300 font-bold mb-2 flex items-center gap-2">
                🔒 보안 안내
              </h3>
              <ul className="text-sm space-y-1 text-neutral-300">
                <li>• API 키는 브라우저에만 저장되며, 외부 서버로 전송되지 않습니다.</li>
                <li>• 공용 컴퓨터를 사용하는 경우 '기억하기'를 체크하지 마세요.</li>
                <li>• API 키가 유출된 경우 즉시 Google AI Studio에서 재발급 받으세요.</li>
              </ul>
            </div>
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
              <h3 className="text-green-300 font-bold mb-2 flex items-center gap-2">
                💰 API 비용 안내
              </h3>
              <ul className="text-sm space-y-1 text-neutral-300">
                <li>• Gemini API 무료 등급에서 기능 제공</li>
                <li>• 분당 15회 요청 제한, 결제나 비용 발생 없음</li>
                <li>• 신용카드 등록 불필요, 완전 무료</li>
              </ul>
            </div>
          </div>

          <AdSense />

          {/* 동적 단계 렌더링 */}
          {guideData.steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-600 text-white font-bold text-lg">
                    {step.id}
                  </span>
                  <h2 className="text-2xl font-bold text-white">{step.title}</h2>
                </div>
                {step.imageSrc && (
                  <div className="mb-4">
                    <img 
                      src={step.imageSrc} 
                      alt={step.title} 
                      className="w-full rounded-lg border border-[#2A2A2A]" 
                    />
                  </div>
                )}
                <div className="space-y-3 text-neutral-300">
                  {step.description.map((desc, i) => (
                    <p key={i} dangerouslySetInnerHTML={{ __html: desc }} />
                  ))}
                  {step.tips && step.tips.length > 0 && (
                    <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 mt-3">
                      {step.tips.map((tip, i) => (
                        <p key={i} className="text-blue-300 text-sm">💡 {tip}</p>
                      ))}
                    </div>
                  )}
                </div>
              </section>
              {(index === 1 || index === 4) && <AdSense />}
            </React.Fragment>
          ))}

          {/* FAQ */}
          <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <h2 className="text-2xl font-bold text-orange-500 mb-6">자주 묻는 질문</h2>
            <div className="space-y-4">
              {guideData.faqs.map((faq, index) => (
                <div 
                  key={index} 
                  className={index < guideData.faqs.length - 1 ? "border-b border-[#2A2A2A] pb-4" : ""}
                >
                  <h3 className="font-bold text-white mb-2">Q: {faq.question}</h3>
                  <p className="text-neutral-300 text-sm">A: {faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 다른 가이드 링크 */}
          <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">🔗 다른 API 가이드</h3>
            <a
              href="/api-guide-cloudconsole"
              className="block p-4 bg-[#1A1A1A] hover:bg-[#252525] border border-[#2A2A2A] rounded-lg transition-colors"
            >
              <h4 className="font-bold text-orange-400 mb-2">Google Cloud Console API 키 발급</h4>
              <p className="text-sm text-neutral-400">벤치마킹, TTS 기능에 필요한 API 키 →</p>
            </a>
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

export default ApiGuideAiStudioPage;
