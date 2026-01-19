'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, ArrowLeft, Receipt } from 'lucide-react';
import { formatAmount, parsePaymentResult } from '@/lib/toss-payments';

interface PaymentDetail {
  paymentKey: string;
  orderId: string;
  orderName: string;
  method: string;
  totalAmount: number;
  balanceAmount: number;
  status: string;
  requestedAt: string;
  approvedAt: string;
  card?: {
    company: string;
    number: string;
    installmentPlanMonths: number;
    approveNo: string;
    useCardPoint: boolean;
    cardType: string;
    ownerType: string;
    acquireStatus: string;
    isInterestFree: boolean;
    interestPayer: string | null;
  };
}

export default function PaymentSuccessPage() {
  const router = useRouter();
  const [paymentDetail, setPaymentDetail] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        // URL에서 결제 정보 파싱
        const paymentResult = parsePaymentResult();

        if (!paymentResult) {
          setError('결제 정보를 찾을 수 없습니다.');
          setLoading(false);
          return;
        }

        // 결제 승인 API 호출
        const response = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentKey: paymentResult.paymentKey,
            orderId: paymentResult.orderId,
            amount: paymentResult.amount,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || '결제 승인에 실패했습니다.');
        }

        if (result.success && result.payment) {
          setPaymentDetail(result.payment);
        } else {
          throw new Error('결제 승인 응답이 올바르지 않습니다.');
        }
      } catch (err: unknown) {
        console.error('결제 승인 오류:', err);
        const errorMessage =
          err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <h2 className="text-lg font-medium">결제 승인 처리 중...</h2>
              <p className="text-sm text-gray-500 text-center">
                잠시만 기다려주세요. 결제를 승인하고 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <span>결제 승인 실패</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => router.back()} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                돌아가기
              </Button>
              <Link href="/payment" className="flex-1">
                <Button className="w-full">다시 결제하기</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paymentDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-medium mb-2">결제 정보 없음</h2>
              <p className="text-gray-500 mb-4">결제 정보를 찾을 수 없습니다.</p>
              <Link href="/">
                <Button>홈으로 돌아가기</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 성공 헤더 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">결제가 완료되었습니다!</h1>
              <p className="text-gray-600">주문이 정상적으로 처리되었습니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 결제 상세 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5" />
              <span>결제 상세 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">주문번호</label>
                <p className="text-sm font-mono bg-gray-50 p-2 rounded border">
                  {paymentDetail.orderId}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">결제상태</label>
                <div className="mt-1">
                  <Badge variant={paymentDetail.status === 'DONE' ? 'default' : 'secondary'}>
                    {paymentDetail.status === 'DONE' ? '결제완료' : paymentDetail.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">상품명</label>
              <p className="text-base font-medium">{paymentDetail.orderName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">결제방법</label>
                <p className="text-base">{paymentDetail.method}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">결제금액</label>
                <p className="text-xl font-bold text-blue-600">
                  {formatAmount(paymentDetail.totalAmount)}
                </p>
              </div>
            </div>

            {paymentDetail.card && (
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-gray-500 mb-2 block">카드 정보</label>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">카드사:</span>
                    <span className="ml-2 font-medium">{paymentDetail.card.company}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">카드번호:</span>
                    <span className="ml-2 font-mono">{paymentDetail.card.number}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">할부:</span>
                    <span className="ml-2">
                      {paymentDetail.card.installmentPlanMonths === 0
                        ? '일시불'
                        : `${paymentDetail.card.installmentPlanMonths}개월`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">승인번호:</span>
                    <span className="ml-2 font-mono">{paymentDetail.card.approveNo}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">결제요청시간:</span>
                  <p className="text-sm">
                    {new Date(paymentDetail.requestedAt).toLocaleString('ko-KR')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">결제승인시간:</span>
                  <p className="text-sm">
                    {new Date(paymentDetail.approvedAt).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 액션 버튼 */}
        <div className="flex space-x-4">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              홈으로 돌아가기
            </Button>
          </Link>
          <Link href="/payment" className="flex-1">
            <Button className="w-full">추가 주문하기</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
