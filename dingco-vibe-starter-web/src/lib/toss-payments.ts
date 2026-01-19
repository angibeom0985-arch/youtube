'use client';

import {
  PaymentData,
  PaymentApprovalRequest,
  PaymentMethodType,
  PaymentStatus,
} from '@/types/payment';

// 환경변수 확인
const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
const API_BASE_URL = 'https://api.tosspayments.com/v1';

if (!CLIENT_KEY) {
  throw new Error('NEXT_PUBLIC_TOSS_CLIENT_KEY is required');
}

// TossPayments SDK 타입 정의
declare global {
  interface Window {
    TossPayments: (clientKey: string) => TossPaymentsInstance;
  }
}

interface TossPaymentsInstance {
  payment: (options: PaymentOptions) => PaymentInstance;
}

interface PaymentOptions {
  customerKey: string;
}

interface PaymentInstance {
  requestPayment: (request: PaymentRequest) => Promise<void>;
}

interface PaymentRequest {
  method: 'CARD' | 'VIRTUAL_ACCOUNT' | 'TRANSFER' | 'MOBILE_PHONE' | 'CULTURE_GIFT_CERTIFICATE';
  amount: {
    currency: string;
    value: number;
  };
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
  customerEmail?: string;
  customerName?: string;
  customerMobilePhone?: string;
  card?: {
    useEscrow?: boolean;
    flowMode?: 'DEFAULT' | 'DIRECT';
    useCardPoint?: boolean;
    useAppCardOnly?: boolean;
    useInternationalCardOnly?: boolean;
  };
  virtualAccount?: {
    cashReceipt?: {
      type: '소득공제' | '지출증빙' | '미발행';
    };
    useEscrow?: boolean;
    validHours?: number;
  };
  transfer?: {
    cashReceipt?: {
      type: '소득공제' | '지출증빙' | '미발행';
    };
    useEscrow?: boolean;
  };
}

// TossPayments SDK 초기화
let tossPaymentsInstance: TossPaymentsInstance | null = null;

export const initializeTossPayments = (): Promise<TossPaymentsInstance> => {
  return new Promise((resolve, reject) => {
    if (tossPaymentsInstance) {
      resolve(tossPaymentsInstance);
      return;
    }

    // SDK가 이미 로드되어 있는 경우
    if (typeof window !== 'undefined' && window.TossPayments) {
      tossPaymentsInstance = window.TossPayments(CLIENT_KEY);
      resolve(tossPaymentsInstance);
      return;
    }

    // SDK 동적 로드
    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v2/standard';
    script.onload = () => {
      if (window.TossPayments) {
        tossPaymentsInstance = window.TossPayments(CLIENT_KEY);
        resolve(tossPaymentsInstance);
      } else {
        reject(new Error('TossPayments SDK 로드 실패'));
      }
    };
    script.onerror = () => reject(new Error('TossPayments SDK 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
};

// 고객 키 생성 (UUID 기반)
export const generateCustomerKey = (): string => {
  return 'customer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
};

// 주문 ID 생성
export const generateOrderId = (): string => {
  return 'order_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
};

// 결제 요청 (통합결제창 방식)
export const requestPayment = async (
  paymentData: PaymentData,
  customerKey?: string,
): Promise<void> => {
  try {
    const tossPayments = await initializeTossPayments();
    const payment = tossPayments.payment({
      customerKey: customerKey || generateCustomerKey(),
    });

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const paymentRequest: PaymentRequest = {
      method: 'CARD', // 기본값으로 카드 결제 설정
      amount: {
        currency: 'KRW',
        value: paymentData.amount,
      },
      orderId: paymentData.orderId,
      orderName: paymentData.orderName,
      successUrl: `${baseUrl}/payment/success`,
      failUrl: `${baseUrl}/payment/fail`,
      customerEmail: paymentData.customerEmail,
      customerName: paymentData.customerName,
      customerMobilePhone: paymentData.customerMobilePhone,
      card: {
        useEscrow: false,
        flowMode: 'DEFAULT', // 통합결제창 사용
        useCardPoint: false,
        useAppCardOnly: false,
        useInternationalCardOnly: false,
      },
    };

    await payment.requestPayment(paymentRequest);
  } catch (error: unknown) {
    console.error('결제 요청 오류:', error);
    throw error;
  }
};

// 결제 승인 API 호출
export const confirmPayment = async (request: PaymentApprovalRequest): Promise<unknown> => {
  try {
    const SECRET_KEY = process.env.TOSS_SECRET_KEY;
    if (!SECRET_KEY) {
      throw new Error('TOSS_SECRET_KEY is required for payment confirmation');
    }

    const response = await fetch(`${API_BASE_URL}/payments/confirm`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(SECRET_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '결제 승인 실패');
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('결제 승인 오류:', error);
    throw error;
  }
};

// 금액 포맷팅
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
};

// 결제수단 번역
export const translatePaymentMethod = (method: PaymentMethodType): string => {
  const translations: Record<PaymentMethodType, string> = {
    카드: '신용/체크카드',
    가상계좌: '가상계좌',
    간편결제: '간편결제',
    계좌이체: '계좌이체',
    휴대폰: '휴대폰 결제',
    상품권: '상품권 결제',
    도서문화상품권: '도서문화상품권',
    게임문화상품권: '게임문화상품권',
    기타: '기타',
  };

  return translations[method] || method;
};

// 결제 상태 번역
export const translatePaymentStatus = (status: PaymentStatus): string => {
  const translations: Record<PaymentStatus, string> = {
    READY: '결제 대기',
    IN_PROGRESS: '결제 진행중',
    WAITING_FOR_DEPOSIT: '입금 대기',
    DONE: '결제 완료',
    CANCELED: '결제 취소',
    PARTIAL_CANCELED: '부분 취소',
    ABORTED: '결제 중단',
    EXPIRED: '결제 만료',
  };

  return translations[status] || status;
};

// 에러 메시지 번역
export const translateErrorCode = (code: string): string => {
  const errorMessages: Record<string, string> = {
    PAY_PROCESS_CANCELED: '사용자가 결제를 취소했습니다.',
    PAY_PROCESS_ABORTED: '결제가 중단되었습니다. 다시 시도해주세요.',
    REJECT_CARD_COMPANY: '카드사에서 결제를 거절했습니다. 카드 정보를 확인해주세요.',
    INVALID_CARD_COMPANY: '유효하지 않은 카드사입니다.',
    INVALID_CARD_NUMBER: '유효하지 않은 카드번호입니다.',
    INVALID_UNREGISTERED_SUBMALL: '등록되지 않은 서브몰입니다.',
    NOT_SUPPORTED_METHOD: '지원하지 않는 결제수단입니다.',
    INVALID_PAYMENT_METHOD: '유효하지 않은 결제수단입니다.',
    EXCEED_MAX_DAILY_PAYMENT_COUNT: '일일 최대 결제 횟수를 초과했습니다.',
    NOT_ENOUGH_BALANCE: '잔액이 부족합니다.',
    UNAUTHORIZED_KEY: 'API 키가 유효하지 않습니다.',
    INVALID_REQUEST: '잘못된 요청입니다.',
    NOT_FOUND_PAYMENT: '결제 정보를 찾을 수 없습니다.',
    FORBIDDEN_REQUEST: '허용되지 않은 요청입니다.',
    ALREADY_PROCESSED_PAYMENT: '이미 처리된 결제입니다.',
    PROVIDER_ERROR: '결제서비스 제공업체 오류입니다.',
    INVALID_ACCOUNT_INFO: '계좌 정보가 올바르지 않습니다.',
    EXCEED_MAX_AMOUNT: '최대 결제 금액을 초과했습니다.',
    MINIMUM_AMOUNT_REQUIRED: '최소 결제 금액 미달입니다.',
  };

  return errorMessages[code] || '알 수 없는 오류가 발생했습니다.';
};

// URL에서 결제 결과 파라미터 파싱
export const parsePaymentResult = () => {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const paymentKey = urlParams.get('paymentKey');
  const orderId = urlParams.get('orderId');
  const amount = urlParams.get('amount');

  if (paymentKey && orderId && amount) {
    return {
      paymentKey,
      orderId,
      amount: parseInt(amount, 10),
    };
  }

  return null;
};

// 결제 실패 파라미터 파싱
export const parsePaymentFailure = () => {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const message = urlParams.get('message');
  const orderId = urlParams.get('orderId');

  if (code) {
    return {
      code,
      message: message || translateErrorCode(code),
      orderId,
    };
  }

  return null;
};
