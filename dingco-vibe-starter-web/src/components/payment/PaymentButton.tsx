'use client';

import React, { useState } from 'react';
import { usePayment } from '@/hooks/usePayment';
import { PaymentData } from '@/types/payment';
import { formatAmount, generateOrderId } from '@/lib/toss-payments';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface PaymentButtonProps {
  amount: number;
  orderName: string;
  customerName?: string;
  customerEmail?: string;
  orderId?: string;
  onSuccess?: (orderId: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const PaymentButton = ({
  amount,
  orderName,
  customerName,
  customerEmail,
  orderId,
  onSuccess,
  onError,
  disabled = false,
  className = '',
  children,
}: PaymentButtonProps) => {
  const { requestPayment, loading, error } = usePayment();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    try {
      setIsProcessing(true);

      const paymentData: PaymentData = {
        amount,
        orderId: orderId || generateOrderId(),
        orderName,
        customerName,
        customerEmail,
      };

      await requestPayment(paymentData);

      // 결제 성공 시 콜백 호출
      if (onSuccess) {
        onSuccess(paymentData.orderId);
      }
    } catch (err: unknown) {
      console.error('결제 처리 오류:', err);
      const error = err as { message?: string };
      if (onError) {
        onError(error.message || '결제 처리 중 오류가 발생했습니다.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 에러가 있을 때 onError 콜백 호출
  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const isLoading = loading || isProcessing;
  const isDisabled = disabled || isLoading || amount <= 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <Button
            onClick={handlePayment}
            disabled={isDisabled}
            className={`w-full ${className}`}
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                결제 처리 중...
              </div>
            ) : (
              children || `${formatAmount(amount)} 결제하기`
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 결제 정보 표시 */}
          <div className="space-y-3 text-sm border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">상품명</span>
              <span className="font-medium">{orderName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">결제 금액</span>
              <Badge variant="secondary" className="font-bold text-lg">
                {formatAmount(amount)}
              </Badge>
            </div>
            {customerName && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">주문자</span>
                <span className="font-medium">{customerName}</span>
              </div>
            )}
          </div>

          {/* 결제 수단 안내 */}
          <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
            <p>• 신용카드, 체크카드, 간편결제 지원</p>
            <p>• 안전한 토스페이먼츠 결제 시스템</p>
            <p>• SSL 보안 연결로 안전한 거래</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
