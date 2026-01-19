'use client';

import { useState, useCallback } from 'react';
import { PaymentData } from '@/types/payment';
import {
  requestPayment,
  generateOrderId,
  generateCustomerKey,
  translateErrorCode,
} from '@/lib/toss-payments';

export const usePayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 결제 요청 함수
  const handleRequestPayment = useCallback(async (data: PaymentData) => {
    setLoading(true);
    setError(null);

    try {
      // 주문번호가 없으면 생성
      const paymentData = {
        ...data,
        orderId: data.orderId || generateOrderId(),
      };

      // 고객 키 생성 (실제로는 로그인한 사용자 ID 등을 사용해야 함)
      const customerKey = generateCustomerKey();

      // 토스페이먼츠 통합결제창 호출
      await requestPayment(paymentData, customerKey);

      // 성공 시 successUrl로 리다이렉트되므로 여기는 실행되지 않음
    } catch (err: unknown) {
      console.error('결제 요청 실패:', err);

      let errorMessage = '결제 요청 중 오류가 발생했습니다.';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'code' in err) {
        const errorCode = (err as { code: string }).code;
        errorMessage = translateErrorCode(errorCode);
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // 에러 초기화
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    requestPayment: handleRequestPayment,
    loading,
    error,
    clearError,
  };
};
