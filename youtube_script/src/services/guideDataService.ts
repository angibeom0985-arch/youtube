// API 가이드 페이지 데이터 관리
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

const STORAGE_KEY_PREFIX = 'api_guide_data_';

// 기본 AI Studio 가이드 데이터
export const defaultAiStudioData: GuidePageData = {
  title: 'Google AI Studio API 키 발급 가이드',
  subtitle: '대본 분석 및 이미지 생성에 사용되는 Gemini API 키를 발급받는 방법을 안내합니다.',
  features: [
    '유튜브 대본 분석 및 기획안 생성',
    'AI 이미지 생성'
  ],
  steps: [
    {
      id: 1,
      title: 'Google AI Studio 접속',
      description: [
        'Google AI Studio 웹사이트에 접속합니다.',
        '접속 주소: https://aistudio.google.com'
      ],
      imageSrc: '/images/api 1.png',
      tips: ['Google 계정으로 로그인하면 됩니다. 별도 계정 생성 불필요.']
    },
    {
      id: 2,
      title: 'Get API key 클릭',
      description: ['왼쪽 사이드바에서 "Get API key" 클릭'],
      imageSrc: '/images/api 2.png'
    },
    {
      id: 3,
      title: '프로젝트 생성',
      description: ['프로젝트 이름을 입력하고 생성합니다.'],
      imageSrc: '/images/api 3.png',
      tips: ['프로젝트 이름은 구별하기 쉬운 이름으로 작성']
    },
    {
      id: 4,
      title: 'API 키 생성',
      description: ['키 이름을 입력하고 프로젝트를 선택합니다.'],
      imageSrc: '/images/api 4.png',
      tips: ['키 이름을 입력하고 프로젝트 선택']
    },
    {
      id: 5,
      title: 'API 키 복사 및 등록',
      description: [
        '생성된 API 키를 복사합니다.',
        'API 키 형태: AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
      ],
      imageSrc: '/images/api 5.png'
    }
  ],
  faqs: [
    {
      question: 'API 키 비용이 발생하나요?',
      answer: '아니요. Gemini API는 무료 등급에서 충분히 사용 가능하며, 결제 정보 입력도 필요 없습니다.'
    },
    {
      question: 'API 키가 작동하지 않아요',
      answer: 'API 키를 정확히 복사했는지 확인하고, 위의 \'API 키 등록\' 버튼으로 검증해보세요.'
    },
    {
      question: 'Cloud Console API와 다른가요?',
      answer: '네, Gemini API는 AI Studio에서, YouTube/TTS API는 Cloud Console에서 각각 발급받아야 합니다.'
    }
  ]
};

// 기본 Cloud Console 가이드 데이터
export const defaultCloudConsoleData: GuidePageData = {
  title: 'Google Cloud Console API 키 발급 가이드',
  subtitle: '벤치마킹과 음성 변환에 사용되는 YouTube Data API 및 TTS API 키를 발급받는 방법을 안내합니다.',
  features: [
    'YouTube 영상 벤치마킹',
    '텍스트 음성 변환 (TTS)',
    '음성 텍스트 변환 (STT)'
  ],
  steps: [],
  faqs: []
};

// 데이터 저장
export const saveGuideData = (pageType: 'aistudio' | 'cloudconsole', data: GuidePageData): void => {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${pageType}`, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save guide data:', error);
  }
};

// 데이터 불러오기
export const loadGuideData = (pageType: 'aistudio' | 'cloudconsole'): GuidePageData => {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${pageType}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load guide data:', error);
  }
  
  // 기본 데이터 반환
  return pageType === 'aistudio' ? defaultAiStudioData : defaultCloudConsoleData;
};

// 데이터 초기화
export const resetGuideData = (pageType: 'aistudio' | 'cloudconsole'): void => {
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${pageType}`);
};
