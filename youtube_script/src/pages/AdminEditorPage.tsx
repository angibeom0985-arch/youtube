import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import ApiGuideCloudConsolePage from './ApiGuideCloudConsolePage';
import ApiGuideAiStudioPage from './ApiGuideAiStudioPage';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface PageContent {
  name: string;
  path: string;
  content: string;
}

const AdminEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [selectedPage, setSelectedPage] = useState('');
  const [editMode, setEditMode] = useState<'basic' | 'html'>('basic');
  const [content, setContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const editorRef = useRef<HTMLDivElement>(null);

  // 편집 가능한 페이지 목록
  const pages: PageContent[] = [
    { name: '클라우드 콘솔 API 발급방법', path: '/api-guide-cloudconsole', content: '' },
    { name: 'AI 스튜디오 API 발급방법', path: '/api-guide-aistudio', content: '' },
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
  const handlePageSelect = async (pagePath: string) => {
    setSelectedPage(pagePath);
    setSaveMessage('');
    try {
      let markup = '';
      if (pagePath === '/api-guide-cloudconsole') {
        markup = renderToStaticMarkup(<ApiGuideCloudConsolePage />);
      } else if (pagePath === '/api-guide-aistudio') {
        markup = renderToStaticMarkup(<ApiGuideAiStudioPage />);
      }
      if (!markup) {
        throw new Error('지원하지 않는 페이지입니다.');
      }
      setContent(markup);
      setHtmlContent(markup);
    } catch (error) {
      setContent('<p>페이지 렌더링에 실패했습니다.</p>');
      setHtmlContent('<p>페이지 렌더링에 실패했습니다.</p>');
      setSaveMessage('❌ 실제 페이지를 불러오는 데 실패했습니다.');
    }
  };

  // 모드 전환 시 내용 동기화
  useEffect(() => {
    if (editMode === 'html') {
      setHtmlContent(content);
    } else {
      setContent(htmlContent);
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlContent;
      }
    }
  }, [editMode]);

  const handleContentSync = () => {
    const html = editorRef.current?.innerHTML ?? '';
    setContent(html);
    setHtmlContent(html);
  };

  const handleAction = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleContentSync();
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          if (editMode === 'basic') {
            document.execCommand('insertImage', false, imageUrl);
            handleContentSync();
          } else {
            const imgTag = `<img src="${imageUrl}" alt="Uploaded image" style="max-width: 100%;" />`;
            setHtmlContent((prev) => prev + imgTag);
          }
        };
        reader.readAsDataURL(file);
      }
    };
  };

  // 미리보기
  const handlePreview = () => {
    const previewContent = editMode === 'basic'
      ? editorRef.current?.innerHTML ?? ''
      : htmlContent;
    
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>미리보기</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 20px;
              background: #121212;
              color: white;
            }
            img {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          ${previewContent}
        </body>
        </html>
      `);
      previewWindow.document.close();
    }
  };

  // 저장
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const contentToSave = editMode === 'basic'
        ? editorRef.current?.innerHTML ?? ''
        : htmlContent;

      // TODO: 실제 저장 API 구현 필요
      // 여기서는 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveMessage('✅ 저장되었습니다!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('❌ 저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  // Quill 에디터 설정
  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: handleImageUpload
      }
    }
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
        {/* 페이지 선택 및 모드 선택 */}
        <div className="bg-gray-900/50 border border-red-500/20 rounded-xl p-6 backdrop-blur-sm">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">편집할 페이지 선택</label>
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

            <div>
              <label className="block text-sm font-medium mb-2">편집 모드</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditMode('basic')}
                  className={`flex-1 py-3 rounded-lg font-bold transition ${
                    editMode === 'basic'
                      ? 'bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  기본모드
                </button>
                <button
                  onClick={() => setEditMode('html')}
                  className={`flex-1 py-3 rounded-lg font-bold transition ${
                    editMode === 'html'
                      ? 'bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  HTML모드
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 에디터 영역 */}
        {selectedPage && (
          <div className="bg-gray-900/50 border border-red-500/20 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">콘텐츠 편집</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleImageUpload}
                  className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 hover:border-blue-500/60 text-blue-100 rounded-lg transition font-bold"
                >
                  🖼️ 이미지 추가
                </button>
                <button
                  onClick={handlePreview}
                  className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/40 hover:border-green-500/60 text-green-100 rounded-lg transition font-bold"
                >
                  👁️ 미리보기
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 hover:from-red-500 hover:via-red-400 hover:to-orange-400 text-white rounded-lg transition font-bold shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? '저장 중...' : '💾 저장'}
                </button>
              </div>
            </div>

            {saveMessage && (
              <div className={`mb-4 p-3 rounded-lg ${
                saveMessage.includes('✅') ? 'bg-green-900/20 border border-green-700 text-green-300' : 'bg-red-900/20 border border-red-700 text-red-300'
              }`}>
                {saveMessage}
              </div>
            )}

            {/* 기본모드 (WYSIWYG) */}
            {editMode === 'basic' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAction('bold')}
                    className="px-3 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-500/30"
                  >
                    Bold
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction('italic')}
                    className="px-3 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-500/30"
                  >
                    Italic
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction('underline')}
                    className="px-3 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-500/30"
                  >
                    Underline
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction('formatBlock', '<h3>')}
                    className="px-3 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-500/30"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction('insertUnorderedList')}
                    className="px-3 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-500/30"
                  >
                    • List
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction('insertOrderedList')}
                    className="px-3 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-500/30"
                  >
                    1. List
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url = window.prompt('링크 URL을 입력하세요');
                      if (url) handleAction('createLink', url);
                    }}
                    className="px-3 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-500/30"
                  >
                    🔗 링크
                  </button>
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-[500px] bg-black border border-red-500/40 rounded-lg p-6 text-white text-sm leading-relaxed focus-visible:outline-none"
                  onInput={handleContentSync}
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            )}

            {/* HTML모드 */}
            {editMode === 'html' && (
              <div className="space-y-4">
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="w-full h-[500px] bg-black border border-red-500/40 rounded-lg p-4 text-white font-mono text-sm resize-none focus:ring-2 focus:ring-red-500/60 hover:border-red-500/60 transition-colors"
                  spellCheck={false}
                />
                <div className="bg-gray-950 border border-red-500/20 rounded-lg p-4 overflow-x-auto">
                  <p className="text-sm text-gray-400 mb-2">코드 미리보기:</p>
                  <SyntaxHighlighter language="html" style={vscDarkPlus} customStyle={{ margin: 0, background: 'transparent' }}>
                    {htmlContent}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}
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
