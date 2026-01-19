// 결제 요청 데이터 타입
export interface PaymentData {
  amount: number;
  orderId: string;
  orderName: string;
  customerName?: string;
  customerEmail?: string;
  customerMobilePhone?: string;
  successUrl?: string;
  failUrl?: string;
}

// 결제 완료 데이터 타입 (토스페이먼츠에서 받는 데이터)
export interface PaymentSuccessData {
  paymentKey: string;
  orderId: string;
  amount: number;
}

// 결제 승인 요청 타입
export interface PaymentApprovalRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

// 결제 승인 응답 타입
export interface PaymentApprovalResponse {
  version: string;
  paymentKey: string;
  type: string;
  orderId: string;
  orderName: string;
  mId: string;
  currency: string;
  method: string;
  totalAmount: number;
  balanceAmount: number;
  status: 'WAITING_FOR_DEPOSIT' | 'DONE' | 'CANCELED' | 'PARTIAL_CANCELED' | 'ABORTED' | 'EXPIRED';
  requestedAt: string;
  approvedAt: string;
  useEscrow: boolean;
  lastTransactionKey: string | null;
  suppliedAmount: number;
  vat: number;
  cultureExpense: boolean;
  taxFreeAmount: number;
  taxExemptionAmount: number;
  cancels: PaymentCancel[] | null;
  isPartialCancelable: boolean;
  card: PaymentCard | null;
  virtualAccount: PaymentVirtualAccount | null;
  secret: string | null;
  mobilePhone: PaymentMobilePhone | null;
  giftCertificate: PaymentGiftCertificate | null;
  transfer: PaymentTransfer | null;
  receipt: PaymentReceipt | null;
  checkout: PaymentCheckout | null;
  easyPay: PaymentEasyPay | null;
  country: string;
  failure: PaymentFailure | null;
  cashReceipt: PaymentCashReceipt | null;
  cashReceipts: PaymentCashReceipt[] | null;
  discount: PaymentDiscount | null;
}

// 결제 취소 정보
export interface PaymentCancel {
  cancelAmount: number;
  cancelReason: string;
  taxFreeAmount: number;
  taxExemptionAmount: number;
  refundableAmount: number;
  easyPayDiscountAmount: number;
  canceledAt: string;
  transactionKey: string;
  receiptKey: string | null;
}

// 카드 결제 정보
export interface PaymentCard {
  amount: number;
  issuerCode: string;
  acquirerCode: string | null;
  number: string;
  installmentPlanMonths: number;
  approveNo: string;
  useCardPoint: boolean;
  cardType: string;
  ownerType: string;
  acquireStatus: string;
  isInterestFree: boolean;
  interestPayer: string | null;
}

// 가상계좌 정보
export interface PaymentVirtualAccount {
  accountType: string;
  accountNumber: string;
  bankCode: string;
  customerName: string;
  dueDate: string;
  refundStatus: string;
  expired: boolean;
  settlementStatus: string;
  refundReceiveAccount: PaymentRefundReceiveAccount | null;
}

// 환불 계좌 정보
export interface PaymentRefundReceiveAccount {
  bankCode: string;
  accountNumber: string;
  holderName: string;
}

// 휴대폰 결제 정보
export interface PaymentMobilePhone {
  customerMobilePhone: string;
  settlementStatus: string;
  receiptUrl: string;
}

// 상품권 결제 정보
export interface PaymentGiftCertificate {
  approveNo: string;
  settlementStatus: string;
}

// 계좌이체 정보
export interface PaymentTransfer {
  bankCode: string;
  settlementStatus: string;
}

// 영수증 정보
export interface PaymentReceipt {
  url: string;
}

// 결제창 정보
export interface PaymentCheckout {
  url: string;
}

// 간편결제 정보
export interface PaymentEasyPay {
  provider: string;
  amount: number;
  discountAmount: number;
}

// 결제 실패 정보
export interface PaymentFailure {
  code: string;
  message: string;
}

// 현금영수증 정보
export interface PaymentCashReceipt {
  type: string;
  receiptKey: string;
  issueNumber: string;
  receiptUrl: string;
  amount: number;
  taxFreeAmount: number;
}

// 할인 정보
export interface PaymentDiscount {
  amount: number;
}

// 결제 훅 리턴 타입
export interface UsePaymentReturn {
  requestPayment: (data: PaymentData) => Promise<void>;
  loading: boolean;
  error: string | null;
}

// 결제 컨텍스트 타입
export interface PaymentContextType {
  isLoading: boolean;
  error: string | null;
  requestPayment: (data: PaymentData) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

// 결제수단 타입
export type PaymentMethodType =
  | '카드'
  | '가상계좌'
  | '간편결제'
  | '계좌이체'
  | '휴대폰'
  | '상품권'
  | '도서문화상품권'
  | '게임문화상품권'
  | '기타';

// 결제 상태 타입 (토스페이먼츠 API 응답)
export type PaymentStatus =
  | 'READY'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_DEPOSIT'
  | 'DONE'
  | 'CANCELED'
  | 'PARTIAL_CANCELED'
  | 'ABORTED'
  | 'EXPIRED';

// 결제 에러 타입
export interface PaymentError {
  code: string;
  message: string;
  details?: unknown;
}
