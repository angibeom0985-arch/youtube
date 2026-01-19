'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { XCircle, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { parsePaymentFailure } from '@/lib/toss-payments';

interface PaymentFailInfo {
  code: string;
  message: string;
  orderId?: string | null;
}

export default function PaymentFailPage() {
  const router = useRouter();
  const [failInfo, setFailInfo] = useState<PaymentFailInfo | null>(null);

  useEffect(() => {
    // URL에서 실패 정보 파싱
    const failureData = parsePaymentFailure();

    if (failureData) {
      setFailInfo(failureData);
    } else {
      // 기본 실패 정보
      setFailInfo({
        code: 'UNKNOWN_ERROR',
        message: '알 수 없는 오류가 발생했습니다.',
      });
    }
  }, []);

  // 에러 코드에 따른 스타일 결정
  const getErrorVariant = (code: string) => {
    if (code === 'PAY_PROCESS_CANCELED') {
      return 'default'; // 사용자 취소는 덜 심각
    }
    return 'destructive'; // 나머지는 에러
  };

  // 에러 코드에 따른 아이콘 결정
  const getErrorIcon = (code: string) => {
    if (code === 'PAY_PROCESS_CANCELED') {
      return <XCircle className="h-16 w-16 text-gray-400" />;
    }
    return <AlertTriangle className="h-16 w-16 text-red-500" />;
  };

  // 에러 코드에 따른 제목 결정
  const getErrorTitle = (code: string) => {
    if (code === 'PAY_PROCESS_CANCELED') {
      return '결제가 취소되었습니다';
    }
    return '결제에 실패했습니다';
  };

  // 재시도 가능한 에러인지 확인
  const isRetryable = (code: string) => {
    const retryableCodes = [
      'PAY_PROCESS_CANCELED',
      'PAY_PROCESS_ABORTED',
      'PROVIDER_ERROR',
      'CARD_PROCESSING_ERROR',
      'CARD_COMPANY_NOT_AVAILABLE',
    ];
    return retryableCodes.includes(code);
  };

  if (!failInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
              <h2 className="text-lg font-medium">결제 정보 확인 중...</h2>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 실패 헤더 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              {getErrorIcon(failInfo.code)}
              <h1 className="text-2xl font-bold text-gray-900 mb-2 mt-4">
                {getErrorTitle(failInfo.code)}
              </h1>
              <p className="text-gray-600">
                {failInfo.code === 'PAY_PROCESS_CANCELED'
                  ? '결제 과정에서 취소하셨습니다.'
                  : '결제 처리 중 문제가 발생했습니다.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 오류 상세 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>오류 상세 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={getErrorVariant(failInfo.code)}>
              <AlertDescription className="text-base">{failInfo.message}</AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">오류 코드</label>
                <div className="mt-1">
                  <Badge variant="outline" className="font-mono">
                    {failInfo.code}
                  </Badge>
                </div>
              </div>

              {failInfo.orderId && (
                <div>
                  <label className="text-sm font-medium text-gray-500">주문번호</label>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded border mt-1">
                    {failInfo.orderId}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">발생 시간</label>
                <p className="text-sm mt-1">{new Date().toLocaleString('ko-KR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 해결 방법 안내 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>해결 방법</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {failInfo.code === 'PAY_PROCESS_CANCELED' ? (
                <>
                  <p>• 결제를 다시 시도해보세요</p>
                  <p>• 다른 결제 수단을 이용해보세요</p>
                </>
              ) : failInfo.code === 'REJECT_CARD_COMPANY' ? (
                <>
                  <p>• 카드 정보를 다시 확인해주세요</p>
                  <p>• 카드사에 결제 한도를 확인해주세요</p>
                  <p>• 다른 카드를 이용해보세요</p>
                </>
              ) : failInfo.code === 'INVALID_CARD_NUMBER' ? (
                <>
                  <p>• 카드번호를 정확히 입력했는지 확인해주세요</p>
                  <p>• 카드가 정상적으로 사용 가능한지 확인해주세요</p>
                </>
              ) : failInfo.code === 'NOT_ENOUGH_BALANCE' ? (
                <>
                  <p>• 계좌 잔액을 확인해주세요</p>
                  <p>• 카드 한도를 확인해주세요</p>
                  <p>• 다른 결제 수단을 이용해보세요</p>
                </>
              ) : (
                <>
                  <p>• 잠시 후 다시 시도해주세요</p>
                  <p>• 인터넷 연결을 확인해주세요</p>
                  <p>• 계속 문제가 발생하면 고객센터에 문의해주세요</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 액션 버튼 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            이전으로
          </Button>

          {isRetryable(failInfo.code) && (
            <Link href="/payment">
              <Button className="w-full flex items-center justify-center">
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 결제하기
              </Button>
            </Link>
          )}

          <Link href="/">
            <Button variant="outline" className="w-full">
              홈으로 돌아가기
            </Button>
          </Link>
        </div>

        {/* 고객 지원 정보 */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="text-center text-sm text-gray-600">
              <p className="mb-2">문제가 계속 발생하시나요?</p>
              <p>
                고객센터: <span className="font-medium">1588-0000</span> | 이메일:{' '}
                <span className="font-medium">support@vibecoding.com</span>
              </p>
              <p className="mt-2 text-xs text-gray-500">
                평일 09:00-18:00 (점심시간 12:00-13:00 제외)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
