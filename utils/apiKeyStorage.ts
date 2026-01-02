// LocalStorage에서 API 키 관리를 위한 유틸리티 함수들

const API_KEY_STORAGE_KEY = 'gemini_api_key';

export const getStoredApiKey = (): string | null => {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('API 키를 불러오는데 실패했습니다:', error);
    return null;
  }
};

export const saveApiKey = (apiKey: string): boolean => {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    return true;
  } catch (error) {
    console.error('API 키를 저장하는데 실패했습니다:', error);
    return false;
  }
};

export const removeApiKey = (): void => {
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('API 키를 삭제하는데 실패했습니다:', error);
  }
};
