import { GoogleGenAI } from "@google/genai";

// 재시도 로직이 포함된 API 호출
const retryApiCall = async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            const isLastAttempt = attempt === maxRetries - 1;
            const errorMessage = error?.message || String(error);
            
            // 503 (서버 과부하), 429 (Rate limit) 등 일시적 오류만 재시도
            const isRetryableError =
                errorMessage.includes("503") ||
                errorMessage.includes("UNAVAILABLE") ||
                errorMessage.includes("overloaded") ||
                errorMessage.includes("429") ||
                errorMessage.includes("RATE_LIMIT") ||
                errorMessage.includes("RESOURCE_EXHAUSTED");

            if (!isRetryableError || isLastAttempt) {
                throw error;
            }

            // Exponential backoff
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`⏳ 재시도 ${attempt + 1}/${maxRetries} (${delay}ms 대기 중...)`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw new Error("최대 재시도 횟수 초과");
};

// API 키 테스트 함수
export const testApiKey = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
    try {
        console.log("🧪 Testing API key...");
        const ai = new GoogleGenAI({ apiKey });
        
        const response = await retryApiCall(
            () => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: '간단한 인사말을 해주세요.',
            }),
            3, // 최대 3번 재시도
            1000 // 1초부터 시작
        );
        
        const text = response.text;
        console.log("✅ API key test successful:", text);
        
        return {
            success: true,
            message: `API 키가 정상적으로 작동합니다: ${text.substring(0, 50)}...`
        };
    } catch (error) {
        console.error("❌ API key test failed:", error);
        
        let errorMessage = "API 키 테스트 실패";
        if (error instanceof Error) {
            const msg = error.message.toLowerCase();
            
            if (msg.includes('api_key_invalid') || msg.includes('invalid api key') || msg.includes('401')) {
                errorMessage = "올바르지 않은 API 키입니다. API 키를 다시 확인해주세요.";
            } else if (msg.includes('permission_denied') || msg.includes('permission')) {
                errorMessage = "API 키에 필요한 권한이 없습니다. Google AI Studio에서 권한을 확인해주세요.";
            } else if (msg.includes('quota_exceeded') || msg.includes('quota')) {
                errorMessage = "API 사용량이 초과되었습니다. 잠시 후 다시 시도하거나 할당량을 확인해주세요.";
            } else if (msg.includes('503') || msg.includes('unavailable') || msg.includes('overloaded')) {
                errorMessage = "⚠️ Google AI 서버가 일시적으로 과부하 상태입니다.\n\n이는 API 키 문제가 아닙니다. 1-2분 후 다시 시도해주세요.\n\n💡 팁: 이미 저장된 API 키는 정상이니, 다음에는 바로 '페르소나 생성'을 시도하셔도 됩니다.";
            } else if (msg.includes('429') || msg.includes('rate_limit')) {
                errorMessage = "⚠️ 요청이 너무 많습니다.\n\n1-2분 후 다시 시도해주세요. API 키는 정상입니다.";
            } else {
                errorMessage = `오류가 발생했습니다: ${error.message}`;
            }
        }
        
        return {
            success: false,
            message: errorMessage
        };
    }
};