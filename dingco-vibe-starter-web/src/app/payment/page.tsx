'use client';

import React, { useState } from 'react';
import { PaymentButton } from '@/components/payment';
import { generateOrderId } from '@/lib/toss-payments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Button import removed - not used in this file
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { PageSEO } from '@/components/seo';
import { pageDefaults } from '@/lib/seo/config';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, Building, Gift, Info } from 'lucide-react';

interface TestProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
}

const testProducts: TestProduct[] = [
  {
    id: 'course_basic',
    name: '딩코딩코 기초 과정',
    price: 99000,
    description: '프로그래밍 기초부터 차근차근 배우는 과정',
    category: '강의',
  },
  {
    id: 'course_advanced',
    name: '딩코딩코 고급 과정',
    price: 199000,
    description: '실무 프로젝트를 통한 실전 개발 경험',
    category: '강의',
  },
  {
    id: 'ebook_js',
    name: 'JavaScript 완전정복',
    price: 29000,
    description: 'JavaScript의 모든 것을 담은 전자책',
    category: '전자책',
  },
  {
    id: 'consulting',
    name: '1:1 개발 컨설팅',
    price: 150000,
    description: '개인 맞춤형 개발 컨설팅 서비스',
    category: '컨설팅',
  },
  {
    id: 'test_small',
    name: '테스트 소액결제',
    price: 1000,
    description: '결제 테스트를 위한 소액 상품',
    category: '테스트',
  },
  {
    id: 'test_large',
    name: '테스트 고액결제',
    price: 1000000,
    description: '고액 결제 테스트를 위한 상품',
    category: '테스트',
  },
];

export default function PaymentTestPage() {
  const [selectedProduct, setSelectedProduct] = useState<TestProduct>(testProducts[0]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '홍길동',
    email: 'test@example.com',
    phone: '010-1234-5678',
  });

  const [paymentHistory, setPaymentHistory] = useState<
    Array<{
      orderId: string;
      product: string;
      amount: number;
      status: 'success' | 'fail' | 'pending';
      timestamp: Date;
    }>
  >([]);

  const handlePaymentSuccess = (orderId: string) => {
    setPaymentHistory((prev) => [
      ...prev,
      {
        orderId,
        product: selectedProduct.name,
        amount: selectedProduct.price,
        status: 'success',
        timestamp: new Date(),
      },
    ]);
  };

  const handlePaymentError = (error: string) => {
    setPaymentHistory((prev) => [
      ...prev,
      {
        orderId: generateOrderId(),
        product: selectedProduct.name,
        amount: selectedProduct.price,
        status: 'fail',
        timestamp: new Date(),
      },
    ]);
    console.error('결제 오류:', error);
  };

  const getPaymentAmount = () => {
    return selectedProduct.price;
  };

  const getOrderName = () => {
    return selectedProduct.name;
  };

  const generateTestOrderId = () => {
    return generateOrderId();
  };

  return (
    <>
      {/* SEO 메타태그 */}
      <PageSEO
        title={pageDefaults.payment.title}
        description={pageDefaults.payment.description}
        keywords={pageDefaults.payment.keywords}
        ogImage="/images/og/payment.jpg"
      />

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              토스페이먼츠 API 개별 연동 테스트
            </h1>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                이 페이지는 토스페이먼츠 API 개별 연동을 테스트하기 위한 페이지입니다. 실제 결제가
                발생하지 않는 테스트 환경입니다.
              </AlertDescription>
            </Alert>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 상품 선택 */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Gift className="h-5 w-5" />
                    <span>상품 선택</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {testProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedProduct.id === product.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedProduct(product)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-900">{product.name}</h3>
                          <Badge variant={product.category === '테스트' ? 'secondary' : 'default'}>
                            {product.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                        <p className="text-lg font-bold text-blue-600">
                          {product.price.toLocaleString()}원
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 고객 정보 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="h-5 w-5" />
                    <span>고객 정보</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="customerName">이름</Label>
                      <Input
                        id="customerName"
                        value={customerInfo.name}
                        onChange={(e) =>
                          setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerEmail">이메일</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) =>
                          setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerPhone">전화번호</Label>
                      <Input
                        id="customerPhone"
                        value={customerInfo.phone}
                        onChange={(e) =>
                          setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 결제 패널 */}
            <div className="space-y-6">
              <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader>
                  <CardTitle className="text-blue-700">💳 결제 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-gray-500">선택된 상품</Label>
                      <p className="font-medium">{selectedProduct.name}</p>
                      <p className="text-sm text-gray-600">{selectedProduct.description}</p>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-sm text-gray-500">결제 금액</Label>
                      <p className="text-2xl font-bold text-blue-600">
                        {getPaymentAmount().toLocaleString()}원
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm text-gray-500">주문자</Label>
                      <p className="font-medium">{customerInfo.name}</p>
                      <p className="text-sm text-gray-600">{customerInfo.email}</p>
                    </div>
                  </div>

                  <Separator />

                  <PaymentButton
                    amount={getPaymentAmount()}
                    orderName={getOrderName()}
                    orderId={generateTestOrderId()}
                    customerName={customerInfo.name}
                    customerEmail={customerInfo.email}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    className="w-full"
                  />

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• 테스트 환경에서는 실제 결제가 발생하지 않습니다</p>
                    <p>• 결제창에서 테스트 카드 정보를 사용하세요</p>
                    <p>• 카드번호: 4330-1234-1234-1234</p>
                  </div>
                </CardContent>
              </Card>

              {/* 결제 이력 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Smartphone className="h-5 w-5" />
                    <span>최근 결제 이력</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentHistory.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      아직 결제 이력이 없습니다.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {paymentHistory
                        .slice(-5)
                        .reverse()
                        .map((history, index) => (
                          <div key={index} className="p-3 border border-gray-200 rounded">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-sm font-medium">{history.product}</p>
                              <Badge
                                variant={history.status === 'success' ? 'default' : 'destructive'}
                              >
                                {history.status === 'success' ? '성공' : '실패'}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">
                              {history.amount.toLocaleString()}원
                            </p>
                            <p className="text-xs text-gray-400">
                              {history.timestamp.toLocaleString('ko-KR')}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
