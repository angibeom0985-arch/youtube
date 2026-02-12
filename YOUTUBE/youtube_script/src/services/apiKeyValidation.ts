/**
 * API 키 검증 서비스
 * Gemini API와 Google Cloud API 키의 유효성을 검증합니다.
 */

/**
 * Gemini API 키 검증
 * Google AI Studio에서 발급받은 Gemini API 키가 유효한지 확인
 */
export async function validateGeminiApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'API 키를 입력해주세요.' };
  }

  // API 키 형식 확인 (AIzaSy로 시작하는 39자)
  if (!apiKey.startsWith('AIzaSy') || apiKey.length !== 39) {
    return { valid: false, error: 'API 키 형식이 올바르지 않습니다. (AIzaSy로 시작하는 39자)' };
  }

  try {
    // Gemini API 테스트 요청
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Hello' }]
          }]
        }),
      }
    );

    if (response.ok) {
      return { valid: true };
    } else if (response.status === 400) {
      const data = await response.json();
      return { valid: false, error: `API 키가 유효하지 않습니다: ${data.error?.message || '알 수 없는 오류'}` };
    } else if (response.status === 403) {
      return { valid: false, error: 'API 키가 비활성화되었거나 권한이 없습니다.' };
    } else {
      return { valid: false, error: `API 요청 실패 (상태 코드: ${response.status})` };
    }
  } catch (error) {
    return { valid: false, error: `네트워크 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}` };
  }
}

/**
 * Google Cloud API 키 검증
 * YouTube Data API v3 사용 가능 여부로 확인
 */
export async function validateGoogleCloudApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'API 키를 입력해주세요.' };
  }

  // API 키 형식 확인
  if (!apiKey.startsWith('AIzaSy') || apiKey.length !== 39) {
    return { valid: false, error: 'API 키 형식이 올바르지 않습니다. (AIzaSy로 시작하는 39자)' };
  }

  try {
    // YouTube Data API v3 테스트 요청 (가장 간단한 검색 쿼리)
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=test&key=${apiKey}`
    );

    if (response.ok) {
      return { valid: true };
    } else if (response.status === 400) {
      const data = await response.json();
      return { valid: false, error: `API 키가 유효하지 않습니다: ${data.error?.message || '알 수 없는 오류'}` };
    } else if (response.status === 403) {
      const data = await response.json();
      if (data.error?.errors?.[0]?.reason === 'quotaExceeded') {
        // 할당량 초과는 키가 유효하다는 의미
        return { valid: true };
      }
      return { valid: false, error: 'YouTube Data API가 활성화되지 않았거나 권한이 없습니다.' };
    } else {
      return { valid: false, error: `API 요청 실패 (상태 코드: ${response.status})` };
    }
  } catch (error) {
    return { valid: false, error: `네트워크 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}` };
  }
}

/**
 * localStorage에서 API 키 가져오기
 */
export function getStoredApiKey(keyType: 'gemini' | 'googleCloud'): string | null {
  const storageKey = keyType === 'gemini' ? 'geminiApiKey' : 'googleCloudApiKey';
  return localStorage.getItem(storageKey);
}

/**
 * localStorage에 API 키 저장
 */
export function saveApiKey(keyType: 'gemini' | 'googleCloud', apiKey: string): void {
  const storageKey = keyType === 'gemini' ? 'geminiApiKey' : 'googleCloudApiKey';
  localStorage.setItem(storageKey, apiKey);
}

/**
 * localStorage에서 API 키 삭제
 */
export function removeApiKey(keyType: 'gemini' | 'googleCloud'): void {
  const storageKey = keyType === 'gemini' ? 'geminiApiKey' : 'googleCloudApiKey';
  localStorage.removeItem(storageKey);
}
