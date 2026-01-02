import React, { useState, useEffect } from 'react';
import { FiHome, FiEye, FiSave, FiCode } from 'react-icons/fi';
import Editor from '@monaco-editor/react';

const ADMIN_USERNAME = 'akb0811';
const ADMIN_PASSWORD = 'rlqja0985!';

interface PageContent {
  [key: string]: string;
}

const pages = [
  { id: 'guide', name: '사용 방법', file: 'GuidePage.tsx' },
  { id: 'api-guide', name: 'API 발급 방법', file: 'ApiGuidePage.tsx' },
];

const AdminPage: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPage, setSelectedPage] = useState('guide');
  const [editorMode, setEditorMode] = useState<'basic' | 'html'>('basic');
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState<PageContent>({});
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    // 로그인 상태 체크 (세션 스토리지)
    const loginStatus = sessionStorage.getItem('admin_logged_in');
    if (loginStatus === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && selectedPage) {
      loadPageContent(selectedPage);
    }
  }, [isLoggedIn, selectedPage]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      sessionStorage.setItem('admin_logged_in', 'true');
      setError('');
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('admin_logged_in');
    setUsername('');
    setPassword('');
  };

  const loadPageContent = (pageId: string) => {
    // 실제로는 파일에서 불러와야 하지만, 브라우저에서는 불가능
    // 대신 localStorage에 저장된 내용을 불러옴
    const saved = localStorage.getItem(`page_content_${pageId}`);
    if (saved) {
      setContent(saved);
      if (!originalContent[pageId]) {
        setOriginalContent({ ...originalContent, [pageId]: saved });
      }
    } else {
      setContent('// 페이지 내용을 여기에 입력하세요.\n// 이 관리자 페이지는 데모용입니다.');
    }
  };

  const handleSave = () => {
    localStorage.setItem(`page_content_${selectedPage}`, content);
    setSaveMessage('저장되었습니다!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handlePreview = () => {
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>미리보기</title>
            <meta charset="UTF-8">
            <style>
              body { 
                font-family: system-ui, -apple-system, sans-serif; 
                padding: 20px; 
                background: #121212; 
                color: white;
                max-width: 800px;
                margin: 0 auto;
              }
            </style>
          </head>
          <body>
            ${editorMode === 'html' ? content : `<pre>${content}</pre>`}
          </body>
        </html>
      `);
      previewWindow.document.close();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        // 이미지를 마크다운 형식으로 에디터에 삽입
        const imageMarkdown = `\n![이미지](${imageUrl})\n`;
        setContent(content + imageMarkdown);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center p-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-[#FF0000] to-[#FF2B2B] bg-clip-text text-transparent">
            관리자 로그인
          </h1>
          
          {error && (
            <div className="bg-red-900/20 border border-red-700 text-red-300 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">아이디</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-[#121212] border border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="아이디를 입력하세요"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-[#121212] border border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-br from-[#D90000] to-[#FF2B2B] text-white font-bold py-3 rounded-lg hover:from-[#D90000]/90 hover:to-[#FF2B2B]/90 transition-all"
            >
              로그인
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-blue-400 hover:text-blue-300 text-sm underline">
              메인 페이지로 돌아가기
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FF0000] to-[#FF2B2B] bg-clip-text text-transparent">
              관리자 페이지
            </h1>
            <p className="text-neutral-400 text-sm mt-1">페이지 내용을 편집할 수 있습니다</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiHome size={18} />
              <span>홈</span>
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              로그아웃
            </button>
          </div>
        </header>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium mb-2">페이지 선택</label>
              <select
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value)}
                className="px-4 py-2 bg-[#121212] border border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">편집 모드</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditorMode('basic')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    editorMode === 'basic'
                      ? 'bg-red-600 text-white'
                      : 'bg-[#2A2A2A] hover:bg-[#3A3A3A]'
                  }`}
                >
                  기본 모드
                </button>
                <button
                  onClick={() => setEditorMode('html')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    editorMode === 'html'
                      ? 'bg-red-600 text-white'
                      : 'bg-[#2A2A2A] hover:bg-[#3A3A3A]'
                  }`}
                >
                  <FiCode size={16} />
                  HTML 모드
                </button>
              </div>
            </div>

            <div className="flex-1"></div>

            <div className="flex gap-2">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors">
                <span>이미지 첨부</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={handlePreview}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                <FiEye size={18} />
                미리보기
              </button>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <FiSave size={18} />
                저장
              </button>
            </div>
          </div>

          {saveMessage && (
            <div className="mt-4 bg-green-900/20 border border-green-700 text-green-300 p-3 rounded-lg">
              {saveMessage}
            </div>
          )}
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
          {editorMode === 'html' ? (
            <Editor
              height="70vh"
              defaultLanguage="html"
              theme="vs-dark"
              value={content}
              onChange={(value) => setContent(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true,
              }}
            />
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-[70vh] p-6 bg-[#121212] text-white font-mono text-sm focus:outline-none resize-none"
              placeholder="내용을 입력하세요..."
            />
          )}
        </div>

        <div className="mt-6 text-center text-neutral-400 text-sm">
          <p>💡 이 관리자 페이지는 데모용입니다. 실제 파일 저장은 서버 구현이 필요합니다.</p>
          <p className="mt-1">현재는 브라우저의 localStorage에 임시 저장됩니다.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
