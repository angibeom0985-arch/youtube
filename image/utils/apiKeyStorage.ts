// API 키 암호화/복호화를 위한 간단한 유틸리티
// ⚠️ 경고: 클라이언트 사이드 암호화는 실제 보안을 제공하지 않습니다.
// 이는 단순 난독화이며, localStorage는 브라우저 콘솔에서 접근 가능합니다.
// 프로덕션 환경에서는 서버 사이드 API 키 관리를 권장합니다.
const STORAGE_KEY = 'yt_img_api_key';
const SECRET_KEY = 'youtube-image-generator-2025'; // 실제로는 더 복잡한 키 사용

// 간단한 XOR 암호화 (기본적인 난독화)
const simpleEncrypt = (text: string, key: string): string => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result); // Base64 인코딩
};

const simpleDecrypt = (encryptedText: string, key: string): string => {
  try {
    const decoded = atob(encryptedText); // Base64 디코딩
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (error) {
    console.error('Failed to decrypt API key:', error);
    return '';
  }
};

export const saveApiKey = (apiKey: string, rememberMe: boolean = true): void => {
  if (!apiKey.trim()) return;

  if (rememberMe) {
    // 암호화해서 localStorage에 저장
    const encrypted = simpleEncrypt(apiKey, SECRET_KEY);
    localStorage.setItem(STORAGE_KEY, encrypted);
    localStorage.setItem(STORAGE_KEY + '_remember', 'true');
  } else {
    // sessionStorage에만 저장 (탭 닫으면 삭제)
    sessionStorage.setItem(STORAGE_KEY, apiKey);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY + '_remember', 'false');
  }
};

export const loadApiKey = (): string => {
  const rememberMe = localStorage.getItem(STORAGE_KEY + '_remember') === 'true';
  
  if (rememberMe) {
    // localStorage에서 암호화된 키 복호화
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (encrypted) {
      const decrypted = simpleDecrypt(encrypted, SECRET_KEY);
      if (decrypted && decrypted.length > 10) { // 최소 길이 검증
        return decrypted;
      }
    }
  }
  
  // sessionStorage에서 확인
  return sessionStorage.getItem(STORAGE_KEY) || '';
};

export const clearApiKey = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY + '_remember');
  sessionStorage.removeItem(STORAGE_KEY);
};

export const isRememberMeEnabled = (): boolean => {
  return localStorage.getItem(STORAGE_KEY + '_remember') === 'true';
};