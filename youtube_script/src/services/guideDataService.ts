import { supabase } from './supabase';

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
        '<strong>Google AI Studio</strong> 웹사이트에 접속합니다.',
        '접속 주소: <a href="https://aistudio.google.com" target="_blank" rel="noopener" class="text-orange-400 hover:underline">https://aistudio.google.com</a>'
      ],
      imageSrc: '/api 1.png',
      tips: ['Google 계정으로 로그인하면 됩니다. 별도 계정 생성 불필요.']
    },
    {
      id: 2,
      title: 'Get API key 클릭',
      description: ['왼쪽 사이드바에서 <strong>"Get API key"</strong> 메뉴를 찾아 클릭합니다.'],
      imageSrc: '/api 2.png'
    },
    {
      id: 3,
      title: 'Create API key 선택',
      description: [
        '<strong>"Create API key"</strong> 버튼을 클릭합니다.',
        '이미 프로젝트가 있다면 해당 프로젝트를 선택하고, 없다면 새 프로젝트를 생성합니다.'
      ],
      imageSrc: '/api 3.png',
      tips: ['처음 사용하는 경우 "Create API key in new project"를 선택하세요.']
    },
    {
      id: 4,
      title: '프로젝트 이름 입력',
      description: [
        '새 프로젝트를 만드는 경우 프로젝트 이름을 입력합니다.',
        '예시: "youtube-content-creator", "my-ai-project" 등'
      ],
      imageSrc: '/api 4.png',
      tips: ['프로젝트 이름은 나중에 구별하기 쉬운 이름으로 작성하세요.']
    },
    {
      id: 5,
      title: 'API 키 생성 완료',
      description: [
        'API 키가 생성되었습니다! <strong>복사</strong> 버튼을 클릭하여 API 키를 복사합니다.',
        'API 키 형태: <code>AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX</code>'
      ],
      imageSrc: '/api 5.png',
      tips: ['API 키는 안전한 곳에 보관하세요. 유출 시 즉시 재발급 받으세요.']
    },
    {
      id: 6,
      title: 'API 키 등록하기',
      description: [
        '복사한 API 키를 사이트 상단의 <strong>"Gemini API 키"</strong> 입력란에 붙여넣습니다.',
        '<strong>"저장·테스트"</strong> 버튼을 클릭하여 API 키가 정상 작동하는지 확인합니다.'
      ],
      imageSrc: '/api 6.png',
      tips: [
        '✓ 저장됨 표시가 나타나면 API 키가 정상적으로 저장된 것입니다.',
        'API 키는 브라우저에만 저장되며, 외부 서버로 전송되지 않습니다.'
      ]
    }
  ],
  faqs: [
    {
      question: 'API 키 비용이 발생하나요?',
      answer: '아니요. Gemini API는 무료 등급에서 충분히 사용 가능하며, 신용카드 등록이나 결제 정보 입력도 필요 없습니다. 분당 15회 요청 제한이 있지만 일반 사용에는 충분합니다.'
    },
    {
      question: 'API 키가 작동하지 않아요',
      answer: 'API 키를 정확히 복사했는지 확인하고, "저장·테스트" 버튼으로 검증해보세요. 그래도 안 되면 Google AI Studio에서 새 키를 발급받아 보세요.'
    },
    {
      question: 'Cloud Console API와 다른가요?',
      answer: '네, Gemini API는 AI Studio에서, YouTube/TTS API는 Cloud Console에서 각각 발급받아야 합니다. 용도가 다른 별도의 API입니다.'
    },
    {
      question: 'API 키를 잃어버렸어요',
      answer: 'Google AI Studio에서 기존 키를 확인하거나 새 키를 발급받을 수 있습니다. 보안상 키는 재확인이 불가능하므로 새로 발급받는 것을 권장합니다.'
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
export const saveGuideData = async (pageType: 'aistudio' | 'cloudconsole', data: GuidePageData): Promise<void> => {
  try {
    const { error } = await supabase
      .from('guides')
      .upsert({
        page_type: pageType,
        data: data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'page_type' });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to save guide data:', error);
    throw error;
  }
};

// 데이터 불러오기
export const loadGuideData = async (pageType: 'aistudio' | 'cloudconsole'): Promise<GuidePageData> => {
  try {
    const { data, error } = await supabase
      .from('guides')
      .select('data')
      .eq('page_type', pageType)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        console.log(`No existing data found for ${pageType}, using defaults.`);
      } else {
        throw error;
      }
    }

    if (data?.data) {
      return data.data as GuidePageData;
    }
  } catch (error) {
    console.error('Failed to load guide data:', error);
  }

  // 기본 데이터 반환
  return pageType === 'aistudio' ? defaultAiStudioData : defaultCloudConsoleData;
};

// 데이터 초기화
export const resetGuideData = async (pageType: 'aistudio' | 'cloudconsole'): Promise<void> => {
  try {
    await supabase.from('guides').delete().eq('page_type', pageType);
  } catch (error) {
    console.error('Failed to reset guide data:', error);
  }
};
