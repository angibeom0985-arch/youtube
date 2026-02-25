import React, { useEffect, useState } from 'react';
import GuideEditor from '@/components/GuideEditor';

type PagePath = '/api-guide-aistudio' | '/api-guide-cloudconsole';

const PAGES: Array<{ name: string; path: PagePath }> = [
  { name: 'AI Studio API 가이드', path: '/api-guide-aistudio' },
  { name: 'Cloud Console API 가이드', path: '/api-guide-cloudconsole' },
];

const AdminEditorPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedPage, setSelectedPage] = useState<PagePath | ''>('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const auth = sessionStorage.getItem('adminEditorAuth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'login',
          username,
          password,
        }),
      });

      if (!response.ok) {
        setLoginError('아이디 또는 비밀번호가 올바르지 않습니다.');
        return;
      }

      setIsAuthenticated(true);
      sessionStorage.setItem('adminEditorAuth', 'true');
    } catch (error) {
      setLoginError('로그인 요청 중 오류가 발생했습니다.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // ignore
    }

    setIsAuthenticated(false);
    sessionStorage.removeItem('adminEditorAuth');
    setUsername('');
    setPassword('');
  };

  const handlePageSelect = (pagePath: string) => {
    setSelectedPage(pagePath as PagePath);
    setSaveMessage('페이지를 불러왔습니다.');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-gray-900/80 border border-red-500/30 rounded-xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(239,68,68,0.25)] backdrop-blur-sm">
          <h1 className="text-3xl font-black bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 bg-clip-text text-transparent mb-6 text-center">
            콘텐츠 관리자 로그인
          </h1>
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
                className="w-full bg-black border border-red-500/40 rounded-lg p-3 text-white focus:ring-2 focus:ring-red-500/60 focus:border-red-500"
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
                className="w-full bg-black border border-red-500/40 rounded-lg p-3 text-white focus:ring-2 focus:ring-red-500/60 focus:border-red-500"
                required
              />
            </div>
            {loginError ? (
              <div className="bg-red-900/20 border border-red-700 text-red-300 p-3 rounded-lg text-sm">{loginError}</div>
            ) : null}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white font-black py-3 rounded-lg hover:from-red-500 hover:via-red-400 hover:to-orange-400 transition-all"
            >
              로그인
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-black border-b border-red-500/20 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 bg-clip-text text-transparent">
            콘텐츠 관리자
          </h1>
          <button
            onClick={handleLogout}
            className="px-6 py-2 text-sm font-bold text-red-100 border-2 border-red-500/40 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-all"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="bg-gray-900/50 border border-red-500/20 rounded-xl p-6 backdrop-blur-sm">
          <label className="block text-sm font-medium mb-2">수정할 페이지</label>
          <select
            value={selectedPage}
            onChange={(e) => handlePageSelect(e.target.value)}
            className="w-full bg-black border border-red-500/40 rounded-lg p-3 text-white focus:ring-2 focus:ring-red-500/60"
          >
            <option value="">-- 페이지 선택 --</option>
            {PAGES.map((page) => (
              <option key={page.path} value={page.path}>
                {page.name}
              </option>
            ))}
          </select>
        </div>

        {saveMessage ? (
          <div className="p-4 rounded-xl bg-green-900/20 border border-green-700 text-green-300">{saveMessage}</div>
        ) : null}

        {selectedPage ? (
          <div className="bg-gray-900/50 border border-red-500/20 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {selectedPage === '/api-guide-aistudio' ? 'AI Studio API 가이드 편집' : 'Cloud Console API 가이드 편집'}
              </h2>
              <a
                href={selectedPage}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-100 rounded-lg transition font-bold"
              >
                페이지 보기
              </a>
            </div>
            <GuideEditor pageType={selectedPage === '/api-guide-aistudio' ? 'aistudio' : 'cloudconsole'} />
          </div>
        ) : (
          <div className="bg-gray-900/30 border-2 border-dashed border-red-500/20 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-lg font-semibold">편집할 페이지를 선택해 주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEditorPage;
