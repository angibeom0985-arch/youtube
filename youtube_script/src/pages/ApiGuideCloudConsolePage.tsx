import React, { useEffect, useState } from 'react';
import { FiExternalLink, FiHome } from 'react-icons/fi';
import AdSense from '../components/AdSense';
import { supabase } from '../services/supabase';
import type { User } from '@supabase/supabase-js';
import UserCreditToolbar from '../components/UserCreditToolbar';
import HomeBackButton from "../components/HomeBackButton";
import { getStoredApiKey } from '../services/apiKeyValidation';

const ApiGuideCloudConsolePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

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

    // API 키 확인
    const apiKey = getStoredApiKey('googleCloud');
    setHasApiKey(!!apiKey);

    // 페이지 제목 설정
    document.title = 'Google Cloud Console API 키 발급 가이드 - 벤치마킹/TTS';
    
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
    
    updateMetaTag('og:title', 'Google Cloud Console API 키 발급 가이드');
    updateMetaTag('og:description', '벤치마킹 및 TTS 기능에 필요한 Google Cloud API 키 발급 방법을 안내합니다.');
    updateMetaTag('og:image', 'https://youtube.money-hotissue.com/og-image-api-guide.png');
    updateMetaTag('og:url', 'https://youtube.money-hotissue.com/api-guide-cloudconsole');

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
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent mb-4">
            Google Cloud Console API 키 발급 가이드
          </h1>
          <p className="text-neutral-300">벤치마킹 및 TTS 기능에 사용되는 Google Cloud API 키를 발급받는 방법을 안내합니다.</p>
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
            <p className="text-blue-300 text-sm font-semibold mb-2">📌 이 API 키가 필요한 기능:</p>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• YouTube 영상 벤치마킹 (YouTube Data API v3)</li>
              <li>• 텍스트 음성 변환 (Cloud Text-to-Speech API)</li>
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
                  {hasApiKey ? 'API 키가 브라우저에 저장되어 있습니다. 각 기능 페이지에서 수정할 수 있습니다.' : '아래 가이드를 따라 API 키를 발급받고, 각 기능 페이지에서 등록해주세요.'}
                </p>
              </div>
            </div>
          </div>

          <AdSense />

          {/* 1단계: Google Cloud Console 접속 */}
          <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg">1</span>
              <h2 className="text-2xl font-bold text-white">Google Cloud Console 접속</h2>
            </div>
            <div className="space-y-3 text-neutral-300">
              <p>Google Cloud Console에 접속합니다.</p>
              <p className="font-semibold">접속 주소:</p>
              <a
                href="https://console.cloud.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <span>https://console.cloud.google.com</span>
                <FiExternalLink size={16} />
              </a>
              <img 
                src="/images/api-guide-cloudconsole/api-guide-cloudeconsole 1.png" 
                alt="Google Cloud Console 메인 화면" 
                className="w-full rounded-lg border border-[#2A2A2A] mt-4"
              />
            </div>
          </section>

          {/* 2단계: 프로젝트 생성 */}
          <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg">2</span>
              <h2 className="text-2xl font-bold text-white">새 프로젝트 생성</h2>
            </div>
            <div className="space-y-3 text-neutral-300">
              <p>상단의 프로젝트 선택 드롭다운에서 <strong>"새 프로젝트"</strong> 클릭</p>
              <img 
                src="/images/api-guide-cloudconsole/api-guide-cloudeconsole 2.png" 
                alt="프로젝트 선택 드롭다운" 
                className="w-full rounded-lg border border-[#2A2A2A]"
              />
              <p className="mt-4">프로젝트 이름을 입력하고 "만들기" 버튼을 클릭합니다.</p>
              <img 
                src="/images/api-guide-cloudconsole/api-guide-cloudeconsole 3.png" 
                alt="새 프로젝트 만들기 화면" 
                className="w-full rounded-lg border border-[#2A2A2A]"
              />
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3 mt-3">
                <p className="text-green-300 text-sm">✅ 프로젝트가 생성되면 자동으로 선택됩니다</p>
              </div>
            </div>
          </section>

          <AdSense />

          {/* 3단계: API 활성화 */}
          <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg">3</span>
              <h2 className="text-2xl font-bold text-white">필요한 API 활성화</h2>
            </div>
            <div className="space-y-3 text-neutral-300">
              <p>좌측 메뉴에서 <strong>"API 및 서비스" → "라이브러리"</strong> 선택</p>
              <img 
                src="/images/api-guide-cloudconsole/api-guide-cloudeconsole 4.png" 
                alt="API 및 서비스 메뉴" 
                className="w-full rounded-lg border border-[#2A2A2A]"
              />
              <p className="font-semibold">활성화할 API:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>YouTube Data API v3</strong> (벤치마킹용)</li>
                <li><strong>Cloud Text-to-Speech API</strong> (TTS용)</li>
              </ul>
              <p className="mt-4">API 라이브러리에서 "YouTube"를 검색합니다.</p>
              <img 
                src="/images/api-guide-cloudconsole/api-guide-cloudeconsole 5.png" 
                alt="YouTube Data API v3 검색" 
                className="w-full rounded-lg border border-[#2A2A2A]"
              />
              <p className="mt-4"><strong>YouTube Data API v3</strong>를 선택합니다.</p>
              <img 
                src="/images/api-guide-cloudconsole/api-guide-cloudeconsole 6.png" 
                alt="YouTube Data API v3 선택" 
                className="w-full rounded-lg border border-[#2A2A2A]"
              />
              <p className="mt-4">"사용" 버튼을 클릭하여 API를 활성화합니다.</p>
              <img 
                src="/images/api-guide-cloudconsole/api-guide-cloudeconsole 7.png" 
                alt="YouTube Data API v3 활성화" 
                className="w-full rounded-lg border border-[#2A2A2A]"
              />
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 mt-4">
                <p className="text-yellow-300 text-sm">⚠️ Cloud Text-to-Speech API도 같은 방법으로 활성화해주세요</p>
              </div>
            </div>
          </section>

          {/* 4단계: API 키 생성 */}
          <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg">4</span>
              <h2 className="text-2xl font-bold text-white">API 키 생성</h2>
            </div>
            <div className="space-y-3 text-neutral-300">
              <p>좌측 메뉴에서 <strong>"API 및 서비스" → "사용자 인증 정보"</strong> 선택</p>
              <img 
                src="/images/api-guide-cloudconsole/api-guide-cloudeconsole 8.png" 
                alt="사용자 인증 정보 메뉴" 
                className="w-full rounded-lg border border-[#2A2A2A]"
              />
              <p className="mt-4">상단의 <strong>"+ 사용자 인증 정보 만들기"</strong> 버튼을 클릭합니다.</p>
              <img 
                src="/images/api-guide-cloudconsole/api-guide-cloudeconsole 9.png" 
                alt="사용자 인증 정보 만들기 버튼" 
                className="w-full rounded-lg border border-[#2A2A2A]"
              />
              <p className="mt-4"><strong>"API 키"</strong> 옵션을 선택합니다.</p>
              <img 
                src="/images/api-guide-cloudconsole/api-guide-cloudeconsole 10.png" 
                alt="API 키 옵션 선택" 
                className="w-full rounded-lg border border-[#2A2A2A]"
              />
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3 mt-3">
                <p className="text-green-300 text-sm">✅ API 키가 자동으로 생성됩니다</p>
              </div>
              <img 
                src="/images/api-guide-cloudconsole/api-guide-cloudeconsole 11.png" 
                alt="API 키 생성 완료" 
                className="w-full rounded-lg border border-[#2A2A2A] mt-3"
              />
            </div>
          </section>

          {/* 5단계: API 키 제한 설정 (선택사항) */}
          <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg">5</span>
              <h2 className="text-2xl font-bold text-white">API 키 제한 설정 (권장)</h2>
            </div>
            <div className="space-y-3 text-neutral-300">
              <p>보안을 위해 API 키 사용 범위를 제한할 수 있습니다.</p>
              <p className="mt-4">"API 키 제한" 버튼을 클릭합니다.</p>
              <img 
                src="/images/api-guide-cloudconsole/api-guide-cloudeconsole 12.png" 
                alt="API 키 제한 버튼" 
                className="w-full rounded-lg border border-[#2A2A2A]"
              />
              <p className="mt-4">API 키 이름을 설정하고, API 제한에서 사용할 API들을 선택합니다.</p>
              <img 
                src="/images/api-guide-cloudconsole/api-guide-cloudeconsole 13.png" 
                alt="API 키 제한 설정 화면" 
                className="w-full rounded-lg border border-[#2A2A2A]"
              />
              <ul className="list-disc list-inside space-y-1 ml-4 mt-4">
                <li>애플리케이션 제한: HTTP 리퍼러 제한 (선택사항)</li>
                <li>API 제한: YouTube Data API v3, Cloud TTS, Cloud STT 선택</li>
              </ul>
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 mt-3">
                <p className="text-blue-300 text-sm">💡 선택사항이지만 보안을 위해 권장됩니다</p>
              </div>
            </div>
          </section>

          <AdSense />

          {/* 6단계: API 키 복사 및 등록 */}
          <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg">6</span>
              <h2 className="text-2xl font-bold text-white">API 키 복사 및 등록</h2>
            </div>
            <div className="space-y-3 text-neutral-300">
              <p>생성된 API 키를 복사합니다.</p>
              <img 
                src="/images/api-guide-cloudconsole/api-guide-cloudeconsole 14.png" 
                alt="API 키 복사" 
                className="w-full rounded-lg border border-[#2A2A2A]"
              />
              <p className="mt-4 font-semibold">API 키 형태:</p>
              <code className="block bg-zinc-900 p-3 rounded-lg text-sm font-mono">
                AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
              </code>
              <div className="mt-4 text-center text-sm text-neutral-400">
                <p>🔑 발급받은 API 키는 각 기능 페이지에서 직접 입력하실 수 있습니다.</p>
              </div>
            </div>
          </section>

          {/* 7단계: 결제 정보 등록 (TTS 사용 시) */}
          <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-600 text-white font-bold text-lg">7</span>
              <h2 className="text-2xl font-bold text-white">결제 정보 등록 (TTS 사용 시 필수)</h2>
            </div>
            <div className="space-y-3 text-neutral-300">
              <p>TTS(텍스트 음성 변환) 기능을 사용하려면 결제 정보를 등록해야 합니다.</p>
              <p className="mt-4">좌측 메뉴에서 <strong>"결제"</strong>를 선택합니다.</p>
              <img 
                src="/images/api-guide-cloudconsole/api-guide-cloudeconsole 15.png" 
                alt="결제 메뉴" 
                className="w-full rounded-lg border border-[#2A2A2A]"
              />
              <p className="mt-4"><strong>"결제 계정 만들기"</strong>를 클릭하고 안내에 따라 결제 정보를 입력합니다.</p>
              <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3 mt-3">
                <p className="text-amber-300 text-sm">💳 신용카드 정보 입력 필요 (사용량 기반 과금)</p>
              </div>
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3 mt-3">
                <p className="text-green-300 text-sm">✅ YouTube API는 결제 정보 없이 무료 사용 가능</p>
              </div>
            </div>
          </section>

          <AdSense />

          {/* 보안 및 비용 안내 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
              <h3 className="text-blue-300 font-bold mb-2">🔒 보안 안내</h3>
              <ul className="text-sm space-y-1 text-neutral-300">
                <li>• API 키는 브라우저에만 저장</li>
                <li>• 공용 컴퓨터에서는 '기억하기' 체크 해제</li>
                <li>• 유출 시 Cloud Console에서 즉시 재발급</li>
              </ul>
            </div>
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4">
              <h3 className="text-amber-300 font-bold mb-2">💰 비용 안내</h3>
              <ul className="text-sm space-y-1 text-neutral-300">
                <li>• YouTube API: 일일 10,000 할당량 무료</li>
                <li>• TTS API: 결제 정보 필요 (사용량 기반)</li>
              </ul>
            </div>
          </div>

          {/* FAQ */}
          <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <h2 className="text-2xl font-bold text-blue-500 mb-6">자주 묻는 질문</h2>
            <div className="space-y-4">
              <div className="border-b border-[#2A2A2A] pb-4">
                <h3 className="font-bold text-white mb-2">Q: YouTube API만 사용하면 비용이 발생하나요?</h3>
                <p className="text-neutral-300 text-sm">A: 아니요. YouTube Data API v3는 일일 10,000 할당량까지 완전 무료입니다.</p>
              </div>
              <div className="border-b border-[#2A2A2A] pb-4">
                <h3 className="font-bold text-white mb-2">Q: TTS는 반드시 결제 정보를 등록해야 하나요?</h3>
                <p className="text-neutral-300 text-sm">A: 네, Cloud TTS API는 결제 정보 등록이 필수이지만, 사용량에 따라 과금됩니다.</p>
              </div>
              <div>
                <h3 className="font-bold text-white mb-2">Q: AI Studio API와 다른가요?</h3>
                <p className="text-neutral-300 text-sm">A: 네, Gemini API는 AI Studio에서, YouTube/TTS API는 Cloud Console에서 각각 발급받아야 합니다.</p>
              </div>
            </div>
          </section>

          {/* 다른 가이드 링크 */}
          <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">🔗 다른 API 가이드</h3>
            <a
              href="/api-guide-aistudio"
              className="block p-4 bg-[#1A1A1A] hover:bg-[#252525] border border-[#2A2A2A] rounded-lg transition-colors"
            >
              <h4 className="font-bold text-orange-400 mb-2">Google AI Studio API 키 발급</h4>
              <p className="text-sm text-neutral-400">대본 분석, 이미지 생성에 필요한 API 키 →</p>
            </a>
          </div>

          {/* 하단 버튼 */}
          <div className="flex justify-center pt-8">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold rounded-lg hover:from-blue-500 hover:to-blue-400 transition-all"
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

export default ApiGuideCloudConsolePage;
