import React, { useEffect } from 'react';
import { FiHome } from 'react-icons/fi';
import AdSense from '../components/AdSense';

const GuidePage: React.FC = () => {
  useEffect(() => {
    // 페이지 제목 설정
    document.title = '사용 방법 가이드 - 유튜브 영상 분석 AI';
    
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
    
    updateMetaTag('og:title', '사용 방법 가이드 - 유튜브 영상 분석 AI');
    updateMetaTag('og:description', '30초 만에 시작하는 영상 분석! 유튜브 영상 분석 AI의 모든 기능을 단계별로 알려드립니다.');
    updateMetaTag('og:image', 'https://youtube.money-hotissue.com/og-image-guide.png');
    updateMetaTag('og:url', 'https://youtube.money-hotissue.com/guide');
  }, []);

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <a href="/" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4">
            <FiHome size={20} />
            <span>홈으로 돌아가기</span>
          </a>
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-[#FF0000] to-[#FF2B2B] bg-clip-text text-transparent mb-4">
            사용 방법
          </h1>
          <p className="text-neutral-300">유튜브 영상 분석 AI 사용 가이드입니다.</p>
        </header>

        <main className="space-y-8">
          <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <h2 className="text-2xl font-bold text-red-500 mb-4">1. API 키 설정</h2>
            <div className="space-y-3 text-neutral-300">
              <p>서비스를 사용하려면 Google Gemini API 키가 필요합니다.</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>우측 상단의 "API 키" 버튼을 클릭합니다.</li>
                <li>발급받은 API 키를 입력하고 "저장하기"를 클릭합니다.</li>
                <li>API 키는 브라우저에만 저장되며 서버로 전송되지 않습니다.</li>
              </ol>
              <p className="mt-4">
                <a href="/api-guide" className="text-blue-400 hover:text-blue-300 underline">
                  API 키 발급 방법 자세히 보기 →
                </a>
              </p>
            </div>
          </section>

          <AdSense />

          <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <h2 className="text-2xl font-bold text-red-500 mb-4">2. 영상 분석하기</h2>
            <div className="space-y-3 text-neutral-300">
              <h3 className="font-semibold text-white">유튜브 URL 입력 (선택사항)</h3>
              <p>분석하고 싶은 유튜브 영상의 URL을 입력하면 썸네일과 제목을 자동으로 가져옵니다.</p>
              
              <h3 className="font-semibold text-white mt-4">카테고리 선택</h3>
              <p>분석할 영상의 카테고리를 선택합니다. 카테고리에 따라 분석 방식이 달라집니다.</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>정보 전달:</strong> 교육, 설명 중심의 영상</li>
                <li><strong>썰 채널:</strong> 스토리텔링, 에피소드 중심</li>
                <li><strong>쇼핑 리뷰:</strong> 제품 리뷰, 언박싱</li>
                <li><strong>IT/테크:</strong> 기술 리뷰, 설명</li>
                <li><strong>요리/쿡방:</strong> 요리 레시피, 먹방</li>
                <li><strong>뷰티:</strong> 화장품 리뷰, 메이크업 튜토리얼</li>
                <li><strong>게임:</strong> 게임 플레이, 공략</li>
              </ul>

              <h3 className="font-semibold text-white mt-4">대본 입력</h3>
              <p>분석할 영상의 대본을 입력합니다. 유튜브 자막을 복사하여 붙여넣으면 됩니다.</p>
              
              <h3 className="font-semibold text-white mt-4">분석 시작</h3>
              <p>"떡상 이유 분석하기" 버튼을 클릭하면 AI가 영상을 분석합니다.</p>
            </div>
          </section>

          <AdSense />

          <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <h2 className="text-2xl font-bold text-red-500 mb-4">3. 분석 결과 확인</h2>
            <div className="space-y-3 text-neutral-300">
              <p>AI가 다음 항목들을 분석하여 제공합니다:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>핵심 키워드:</strong> 영상의 주요 키워드 추출</li>
                <li><strong>기획 의도:</strong> 영상의 목적과 전략 분석 (중요 키워드 <span className="underline decoration-orange-400">오렌지색 밑줄</span> 강조)</li>
                <li><strong>조회수 예측 분석:</strong> 성공 요인 분석 (핵심 내용 자동 강조)</li>
                <li><strong>대본 구조 분석:</strong> 단계별 구성 분석 및 타임스탬프 표시 (썰 채널만)</li>
              </ul>
              
              <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <h3 className="text-blue-300 font-bold mb-2">📥 다운로드 기능</h3>
                <p>각 결과 카드에서 "다운로드" 버튼을 클릭하면:</p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-sm">
                  <li>파일 형식을 선택할 수 있습니다 (TXT, Markdown, PDF)</li>
                  <li>메타데이터 및 타임스탬프 포함 여부를 선택할 수 있습니다</li>
                  <li>분석 결과가 선택한 형식으로 다운로드됩니다</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <h2 className="text-2xl font-bold text-red-500 mb-4">4. 새로운 영상 기획</h2>
            <div className="space-y-3 text-neutral-300">
              <h3 className="font-semibold text-white">콘텐츠 타입 선택</h3>
              <p><strong>숏폼</strong> 또는 <strong>롱폼</strong>을 선택하여 영상 형식을 결정합니다.</p>
              
              <h3 className="font-semibold text-white mt-4">예상 영상 길이 설정</h3>
              <p>생성할 영상의 목표 길이를 선택하거나 직접 입력합니다 (예: 8분, 30분, 1시간).</p>
              
              <h3 className="font-semibold text-white mt-4">키워드 선택</h3>
              <p>AI가 제안한 아이디어 중 하나를 선택하거나 직접 키워드를 입력합니다.</p>
              
              <h3 className="font-semibold text-white mt-4">기획안 생성</h3>
              <p>"기획안 생성" 버튼을 클릭하면 새로운 영상 기획안과 대본이 생성됩니다.</p>
              
              <div className="mt-4 p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                <h3 className="text-purple-300 font-bold mb-2">✨ 썰 채널 특별 기능</h3>
                <ul className="list-disc list-inside ml-4 space-y-2 text-sm">
                  <li><strong>다양한 배역:</strong> 나레이터뿐만 아니라 주인공, 친구, 가족 등 여러 캐릭터가 등장하는 대본 생성</li>
                  <li><strong>타임라인:</strong> 각 대사마다 예상 시간 표시 (예: [00:15], [01:30])</li>
                  <li><strong>이미지 프롬프트:</strong> 각 장면마다 DALL-E, Midjourney 등에서 사용 가능한 영문 프롬프트 제공</li>
                  <li><strong>대화형 구성:</strong> 캐릭터 간의 자연스러운 대화와 상호작용으로 몰입감 향상</li>
                </ul>
              </div>
            </div>
          </section>

          <AdSense />

          <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <h2 className="text-2xl font-bold text-red-500 mb-4">5. 추가 도구 활용</h2>
            <div className="space-y-3 text-neutral-300">
              <p>생성된 대본을 바탕으로 영상 제작을 완성하세요!</p>
              
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                  <div className="text-2xl mb-2">📸</div>
                  <h3 className="font-bold text-green-300 mb-2">숏폼/롱폼 이미지 생성</h3>
                  <p className="text-sm">AI로 영상에 필요한 이미지를 1분 안에 생성</p>
                </div>
                <div className="bg-pink-900/20 border border-pink-700/50 rounded-lg p-4">
                  <div className="text-2xl mb-2">🎵</div>
                  <h3 className="font-bold text-pink-300 mb-2">AI 음악 가사 완성</h3>
                  <p className="text-sm">배경음악 가사를 AI가 1초 만에 작성</p>
                </div>
                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                  <div className="text-2xl mb-2">🎨</div>
                  <h3 className="font-bold text-blue-300 mb-2">AI 음악 썸네일 제작</h3>
                  <p className="text-sm">클릭을 부르는 썸네일을 AI로 제작</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-purple-300">💡 대본 생성 후 하단에 표시되는 링크를 통해 바로 이동할 수 있습니다!</p>
            </div>
          </section>

          <AdSense />

          <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <h2 className="text-2xl font-bold text-red-500 mb-4">6. 팁과 주의사항</h2>
            <div className="space-y-3 text-neutral-300">
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>정확한 대본 입력:</strong> 가능한 한 전체 대본을 입력하면 더 정확한 분석이 가능합니다.</li>
                <li><strong>카테고리 선택:</strong> 영상의 성격에 맞는 카테고리를 선택하는 것이 중요합니다.</li>
                <li><strong>창의적 활용:</strong> 생성된 기획안은 참고용이며, 자신만의 아이디어를 추가하여 사용하세요.</li>
                <li><strong>API 사용량:</strong> Google Gemini API 무료 등급은 분당 15회 제한이 있습니다.</li>
                <li><strong>결과 저장:</strong> 다운로드 기능으로 분석 결과를 원하는 형식으로 보관할 수 있습니다.</li>
                <li><strong>브라우저 저장:</strong> API 키는 브라우저에만 저장되며 외부로 전송되지 않습니다.</li>
              </ul>
            </div>
          </section>

          <div className="text-center py-8">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#D90000] to-[#FF2B2B] text-white font-bold rounded-lg hover:from-[#D90000]/90 hover:to-[#FF2B2B]/90 transition-all"
            >
              <FiHome size={20} />
              지금 시작하기
            </a>
          </div>
        </main>
      </div>
    </div>
  );
};

export default GuidePage;
