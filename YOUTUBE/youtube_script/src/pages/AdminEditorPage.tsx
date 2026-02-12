import React, { useState, useEffect } from 'react';
import GuideEditor from '../components/GuideEditor';

const AdminEditorPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  // 편집 가능한 페이지 목록
  const pages = [
    { name: 'AI 스튜디오 API 발급방법', path: '/api-guide-aistudio' },
    { name: '클라우드 콘솔 API 발급방법', path: '/api-guide-cloudconsole' },
  ];

  // 로그인 확인
  useEffect(() => {
    const auth = sessionStorage.getItem('adminEditorAuth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // 로그인 처리
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'akb0811' && password === 'rlqja0985!') {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminEditorAuth', 'true');
      setLoginError('');
    } else {
      setLoginError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  // 로그아웃
  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminEditorAuth');
    setUsername('');
    setPassword('');
  };

  // 페이지 선택 시 내용 로드
  const handlePageSelect = (pagePath: string) => {
    setSelectedPage(pagePath);
    setSaveMessage('✅ 저장된 내용을 불러왔습니다.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // 로그인하지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-gray-900/80 border border-red-500/30 rounded-xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(239,68,68,0.25)] backdrop-blur-sm">
          <h1 className="text-3xl font-black bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 bg-clip-text text-transparent mb-6 text-center">콘텐츠 관리자 로그인</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                아이디
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black border border-red-500/40 rounded-lg p-3 text-white focus:ring-2 focus:ring-red-500/60 focus:border-red-500 hover:border-red-500/60 transition-colors"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-red-500/40 rounded-lg p-3 text-white focus:ring-2 focus:ring-red-500/60 focus:border-red-500 hover:border-red-500/60 transition-colors"
                required
              />
            </div>
            {loginError && (
              <div className="bg-red-900/20 border border-red-700 text-red-300 p-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white font-black py-3 rounded-lg hover:from-red-500 hover:via-red-400 hover:to-orange-400 transition-all shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,0.6)] transform hover:-translate-y-1 active:scale-95"
            >
              로그인
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 로그인 후 관리자 페이지
  return (
    <div className="min-h-screen bg-black text-white">
      {/* 헤더 */}
      <header className="bg-black border-b border-red-500/20 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(249,115,22,0.35)]">
            🛠️ 콘텐츠 관리자
          </h1>
          <button
            onClick={handleLogout}
            className="px-6 py-2 text-sm font-bold text-red-100 border-2 border-red-500/40 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-all active:scale-95"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* 페이지 선택 */}
        <div className="bg-gray-900/50 border border-red-500/20 rounded-xl p-6 backdrop-blur-sm">
          <div>
            <label className="block text-sm font-medium mb-2">수정할 페이지:</label>
            <select
              value={selectedPage}
              onChange={(e) => handlePageSelect(e.target.value)}
              className="w-full bg-black border border-red-500/40 rounded-lg p-3 text-white focus:ring-2 focus:ring-red-500/60 hover:border-red-500/60 transition-colors"
            >
              <option value="">-- 페이지 선택 --</option>
              {pages.map((page) => (
                <option key={page.path} value={page.path}>
                  {page.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 메시지 표시 */}
        {saveMessage && (
          <div className={`p-4 rounded-xl ${
            saveMessage.includes('✅') 
              ? 'bg-green-900/20 border border-green-700 text-green-300' 
              : 'bg-red-900/20 border border-red-700 text-red-300'
          }`}>
            {saveMessage}
          </div>
        )}

        {/* 에디터 영역 */}
        {selectedPage && (
          <div className="bg-gray-900/50 border border-red-500/20 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {selectedPage === '/api-guide-aistudio' ? 'AI 스튜디오 API 발급방법 편집' : '클라우드 콘솔 API 발급방법 편집'}
              </h2>
              <a
                href={selectedPage}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 hover:border-blue-500/60 text-blue-100 rounded-lg transition font-bold"
              >
                👁️ 페이지 보기
              </a>
            </div>

            {/* 가이드 에디터 */}
            <GuideEditor 
              pageType={selectedPage === '/api-guide-aistudio' ? 'aistudio' : 'cloudconsole'} 
            />
          </div>
        )}

        {!selectedPage && (
          <div className="bg-gray-900/30 border-2 border-dashed border-red-500/20 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-lg font-semibold">
              편집할 페이지를 선택해주세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEditorPage;
