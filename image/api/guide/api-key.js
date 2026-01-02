const fs = require('fs').promises;
const path = require('path');

// GitHub API를 사용하여 파일 업데이트
async function updateGitHubFile(filePath, content, message) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = 'angibeom0985-arch';
  const REPO_NAME = 'youtube-image';
  
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN이 설정되지 않았습니다.');
  }

  try {
    // 1. 현재 파일 정보 가져오기 (SHA 필요)
    const getFileUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
    const getFileResponse = await fetch(getFileUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let sha = null;
    if (getFileResponse.ok) {
      const fileData = await getFileResponse.json();
      sha = fileData.sha;
    }

    // 2. 파일 업데이트
    const updateFileUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
    const updateFileResponse = await fetch(updateFileUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        content: Buffer.from(content).toString('base64'),
        sha: sha,
        branch: 'main'
      })
    });

    if (!updateFileResponse.ok) {
      const errorData = await updateFileResponse.json();
      throw new Error(`GitHub API 오류: ${errorData.message}`);
    }

    const result = await updateFileResponse.json();
    return result;
  } catch (error) {
    console.error('GitHub 파일 업데이트 오류:', error);
    throw error;
  }
}

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // 프로덕션에서는 GET 요청 비활성화 (GitHub API 사용)
    console.log('⚠️ GET 요청은 프로덕션에서 지원되지 않습니다. 로컬스토리지를 사용하세요.');
    res.status(200).json({ 
      content: '', 
      message: '프로덕션 환경에서는 로컬스토리지를 사용합니다.' 
    });
  } else if (req.method === 'POST') {
    try {
      const { content } = req.body;
      console.log('🔄 API 키 가이드 저장 요청 받음');
      console.log('📦 내용 길이:', content ? content.length : 0);
      
      if (!content) {
        console.error('❌ 내용이 없음');
        return res.status(400).json({ error: '내용이 제공되지 않았습니다.' });
      }

      // 프로덕션 환경 감지
      const isProduction = process.env.VERCEL || !process.env.GITHUB_TOKEN;
      console.log('🌍 환경:', isProduction ? '프로덕션(Vercel)' : '로컬');

      // GitHub API로 직접 파일 업데이트
      const componentFilePath = 'components/ApiKeyGuide.tsx';
      
      // GitHub API에서 현재 파일 내용 가져오기
      let componentContent = '';
      try {
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = 'angibeom0985-arch';
        const REPO_NAME = 'youtube-image';
        
        if (!GITHUB_TOKEN) {
          throw new Error('GITHUB_TOKEN이 설정되지 않았습니다.');
        }

        const getFileUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${componentFilePath}`;
        const getFileResponse = await fetch(getFileUrl, {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (!getFileResponse.ok) {
          throw new Error('GitHub에서 파일을 가져올 수 없습니다.');
        }

        const fileData = await getFileResponse.json();
        componentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        console.log('✅ GitHub에서 현재 파일 가져옴');
      } catch (err) {
        console.error('❌ GitHub 파일 읽기 실패:', err.message);
        return res.status(500).json({ error: 'GitHub에서 파일을 가져올 수 없습니다: ' + err.message });
      }
      
      // JSX return 문 안의 내용을 새로운 content로 교체
      const returnPattern = /(return\s*\(\s*[\s\S]*?<div className="min-h-screen bg-gray-50">\s*)([\s\S]*?)(\s*<\/div>\s*\)\s*;\s*}\s*;\s*export default ApiKeyGuide;)/;
      
      let updatedComponent;
      if (componentContent.match(returnPattern)) {
        updatedComponent = componentContent.replace(
          returnPattern,
          `$1${content}$3`
        );
      } else {
        // 패턴이 맞지 않으면 전체 컴포넌트 내용을 새로 생성
        updatedComponent = `import React from 'react';
import DisplayAd from './DisplayAd';

interface ApiKeyGuideProps {
    onBack?: () => void;
}

const ApiKeyGuide: React.FC<ApiKeyGuideProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-gray-50">
            ${content}
        </div>
    );
};

export default ApiKeyGuide;`;
      }
      
      // GitHub API를 통해 파일 커밋
      try {
        const commitMessage = `Update: API 키 발급 가이드 자동 업데이트 (Admin 페이지)`;
        await updateGitHubFile(componentFilePath, updatedComponent, commitMessage);
        
        console.log('✅ GitHub에 자동 커밋 완료!');
        
        res.status(200).json({ 
          success: true, 
          message: '✅ API 키 발급 가이드가 GitHub에 자동으로 커밋되었습니다!\n\n🚀 Vercel이 자동으로 재배포를 시작합니다. (1-2분 소요)\n페이지를 새로고침하면 변경사항을 확인할 수 있습니다.' 
        });
      } catch (githubError) {
        console.error('❌ GitHub 커밋 실패:', githubError.message);
        
        res.status(500).json({ 
          error: 'GitHub 커밋에 실패했습니다: ' + githubError.message,
          details: 'GITHUB_TOKEN이 올바르게 설정되었는지 확인하세요.'
        });
      }
    } catch (error) {
      console.error('❌ API guide 저장 오류:', error);
      res.status(500).json({ error: '파일을 저장할 수 없습니다: ' + error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
