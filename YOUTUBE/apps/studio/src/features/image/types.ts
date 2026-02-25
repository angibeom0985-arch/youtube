export interface Character {
  id: string;
  name: string;
  description: string;
  image: string; // base64 encoded string
}

export interface StoryboardImage {
  id: string;
  image: string; // base64 encoded string
  sceneDescription: string;
}

// 영상 소스 이미지 타입 (StoryboardImage와 동일)
export type VideoSourceImage = StoryboardImage;

// 이미지 비율 타입
export type AspectRatio = '9:16' | '16:9' | '1:1';

// 이미지 스타일 타입 (기존 호환성 유지)
export type ImageStyle = 
  | '감성 멜로' 
  | '서부극' 
  | '공포 스릴러' 
  | '1980년대' 
  | '2000년대' 
  | '사이버펑크' 
  | '판타지' 
  | '미니멀' 
  | '빈티지' 
  | '모던'
  | '동물'
  | '실사 극대화'
  | '애니메이션' 
  | 'custom';

// 인물 스타일 타입
export type CharacterStyle = 
  | '실사 극대화'
  | '애니메이션'
  | '동물'
  | '웹툰'
  | '졸라맨'
  | 'custom';

// 배경/분위기 스타일 타입
export type BackgroundStyle = 
  | '감성 멜로'
  | '서부극'
  | '공포 스릴러'
  | '사이버펑크'
  | '판타지'
  | '미니멀'
  | '빈티지'
  | '모던'
  | '1980년대'
  | '2000년대'
  | '먹방'
  | '귀여움'
  | 'AI'
  | '괴이함'
  | '창의적인'
  | '조선시대'
  | 'custom';

// 사진 구도 타입
export type PhotoComposition = 
  | '정면' 
  | '측면' 
  | '반측면' 
  | '위에서' 
  | '아래에서' 
  | '전신' 
  | '상반신' 
  | '클로즈업';

// 6가지 기본 카메라 앵글 타입
export type CameraAngle = 
  | 'Front View'            // 정면
  | 'Right Side View'       // 오른쪽 측면
  | 'Left Side View'        // 왼쪽 측면
  | 'Back View'             // 뒷모습
  | 'Full Body'             // 전신 (머리부터 발끝까지)
  | 'Close-up Face';        // 얼굴 근접

// 카메라 앵글 이미지 결과
export interface CameraAngleImage {
  id: string;
  angle: CameraAngle;
  image: string; // base64 encoded string
  angleName: string; // 한글 이름
  description: string; // 앵글 설명
}

// Gemini specific types
export interface RawCharacterData {
  name: string;
  description: string;
}
