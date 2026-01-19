import { NextRequest, NextResponse } from 'next/server';

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
const TOSS_API_BASE_URL = 'https://api.tosspayments.com/v1';

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const { paymentKey, orderId, amount } = await request.json();

    // 필수 필드 검증
    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST',
          message: 'paymentKey, orderId, amount는 필수 필드입니다.',
        },
        { status: 400 },
      );
    }

    // Secret Key 검증
    if (!TOSS_SECRET_KEY) {
      console.error('TOSS_SECRET_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        {
          error: 'INTERNAL_SERVER_ERROR',
          message: '서버 설정 오류입니다.',
        },
        { status: 500 },
      );
    }

    // Basic Auth 헤더 생성 (Secret Key + ':')
    const authHeader = `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`;

    // 토스페이먼츠 결제 승인 API 호출
    const tossResponse = await fetch(`${TOSS_API_BASE_URL}/payments/confirm`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    const responseData = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error('토스페이먼츠 API 오류:', responseData);

      // 토스페이먼츠 에러를 클라이언트에 전달
      return NextResponse.json(
        {
          error: responseData.code || 'PAYMENT_APPROVAL_FAILED',
          message: responseData.message || '결제 승인에 실패했습니다.',
          details: responseData,
        },
        { status: tossResponse.status },
      );
    }

    // 결제 승인 성공 - 여기서 데이터베이스에 결제 정보를 저장할 수 있습니다
    console.log('결제 승인 성공:', {
      paymentKey: responseData.paymentKey,
      orderId: responseData.orderId,
      amount: responseData.totalAmount,
      method: responseData.method,
      status: responseData.status,
    });

    // TODO: 데이터베이스에 결제 정보 저장
    // await savePaymentToDatabase(responseData);

    // 성공 응답 반환
    return NextResponse.json({
      success: true,
      payment: responseData,
    });
  } catch (error: unknown) {
    console.error('결제 승인 처리 중 오류:', error);

    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: errorMessage,
      },
      { status: 500 },
    );
  }
}
