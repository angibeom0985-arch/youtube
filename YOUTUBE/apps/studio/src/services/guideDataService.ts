export interface GuideStep {
  id: number;
  title: string;
  description: string[];
  imageSrc: string;
  tips?: string[];
}

export interface GuidePageData {
  title: string;
  subtitle: string;
  features: string[];
  steps: GuideStep[];
  faqs: { question: string; answer: string }[];
}

export const defaultAiStudioData: GuidePageData = {
  title: 'Google AI Studio API 키 발급 가이드',
  subtitle: '대본 분석과 이미지 생성에 필요한 Gemini API 키를 발급받는 방법입니다.',
  features: ['유튜브 대본 분석', 'AI 이미지 생성'],
  steps: [
    {
      id: 1,
      title: 'Google AI Studio 접속',
      description: [
        'Google AI Studio 사이트에 접속합니다.',
        'https://aistudio.google.com',
      ],
      imageSrc: '/api 1.png',
    },
    {
      id: 2,
      title: 'API 키 생성',
      description: ['Get API key 메뉴에서 새 API 키를 생성합니다.'],
      imageSrc: '/api 2.png',
    },
    {
      id: 3,
      title: '사이트에 API 키 등록',
      description: ['발급한 키를 복사해서 사이트 API 키 입력란에 등록합니다.'],
      imageSrc: '/api 6.png',
    },
  ],
  faqs: [
    {
      question: 'API 키 비용이 발생하나요?',
      answer: '무료 등급 범위에서는 추가 과금 없이 사용할 수 있습니다.',
    },
    {
      question: '키가 동작하지 않아요.',
      answer: '키를 다시 복사해 붙여넣고 권한/쿼터 상태를 확인하세요.',
    },
  ],
};

export const defaultCloudConsoleData: GuidePageData = {
  title: 'Google Cloud Console API 키 가이드',
  subtitle: 'YouTube/TTS 연동에 필요한 Cloud Console API 설정 방법입니다.',
  features: ['YouTube API', 'Text-to-Speech API', 'Speech-to-Text API'],
  steps: [],
  faqs: [],
};

const resolveAdminPageType = (pageType: 'aistudio' | 'cloudconsole') =>
  pageType === 'aistudio' ? 'api-guide-aistudio' : 'api-guide-cloudconsole';

export const saveGuideData = async (pageType: 'aistudio' | 'cloudconsole', data: GuidePageData): Promise<void> => {
  const apiPageType = resolveAdminPageType(pageType);
  const response = await fetch(`/api/admin/page-content?pageType=${encodeURIComponent(apiPageType)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      content: JSON.stringify(data),
      mode: 'structured_json',
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || 'Failed to save guide data');
  }
};

export const loadGuideData = async (pageType: 'aistudio' | 'cloudconsole'): Promise<GuidePageData> => {
  const apiPageType = resolveAdminPageType(pageType);

  try {
    const response = await fetch(`/api/admin/page-content?pageType=${encodeURIComponent(apiPageType)}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (response.ok) {
      const payload = await response.json();
      const content = payload?.content;
      if (typeof content === 'string' && content.trim()) {
        return JSON.parse(content) as GuidePageData;
      }
    }
  } catch (error) {
    console.error('Failed to load guide data from admin API:', error);
  }

  return pageType === 'aistudio' ? defaultAiStudioData : defaultCloudConsoleData;
};

export const resetGuideData = async (pageType: 'aistudio' | 'cloudconsole'): Promise<void> => {
  const defaults = pageType === 'aistudio' ? defaultAiStudioData : defaultCloudConsoleData;
  await saveGuideData(pageType, defaults);
};
