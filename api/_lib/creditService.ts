import { supabaseAdmin } from "./supabase.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// 크레딧 비용 정의
export const CREDIT_COSTS = {
  SEARCH: 5,          // 벤치마킹 검색
  SCRIPT_PLAN: 10,    // 기획안 생성
  SCRIPT_OUTLINE: 5,  // 챕터 목차 구성 (신규)
  SCRIPT_CHUNK: 5,    // 챕터별 대본 생성 (신규)
  IMAGE_GEN: 5,       // 이미지 1장 생성
  TTS_CHAR: 0.1,      // TTS 1글자당 (10자 = 1크레딧)
  ANALYSIS: 1,        // 영상 분석 (가볍게)
  IDEATION: 1,        // 아이디어 생성 (가볍게)
};

// 일일 무료 제공량 (이 이하로 떨어지면 다음 날 채워줌)
const DAILY_FREE_FLOOR = 30;

export interface CreditCheckResult {
  allowed: boolean;
  currentCredits: number;
  cost: number;
  message?: string;
  status?: number;
  userId?: string;
}

const getClientIp = (req: VercelRequest): string | null => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket?.remoteAddress || null;
};

/**
 * 사용자 ID를 추출하고 크레딧을 확인/차감하는 미들웨어 함수
 */
export const checkAndDeductCredits = async (
  req: VercelRequest,
  res: VercelResponse,
  cost: number
): Promise<CreditCheckResult> => {
  // 1. Supabase 인증 토큰 확인
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return { allowed: false, currentCredits: 0, cost, message: "로그인이 필요한 서비스입니다. 회원가입하고 크레딧을 받아보세요!", status: 401 };
  }

  if (!supabaseAdmin) {
    console.error("Supabase Admin client not initialized");
    return { allowed: false, currentCredits: 0, cost, message: "서버 오류: DB 연결 실패", status: 500 };
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return { allowed: false, currentCredits: 0, cost, message: "유효하지 않은 토큰입니다.", status: 401 };
  }

  const userId = user.id;
  const clientIp = getClientIp(req);

  // 2. 프로필(크레딧) 조회
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("credits, last_reset_date, signup_ip")
    .eq("id", userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') { // PGRST116: no rows result
    console.error("Profile fetch error:", profileError);
    return { allowed: false, currentCredits: 0, cost, message: "크레딧 정보를 불러오지 못했습니다.", status: 500 };
  }

  // 프로필이 없으면 생성 (가입 트리거가 실패했을 경우 대비)
  let currentCredits = profile?.credits ?? 0;
  let lastReset = profile?.last_reset_date;
  
  if (!profile) {
    // [IP 중복 가입 체크]
    // 같은 IP로 이미 가입된 다른 계정이 있는지 확인
    let initialCredits = 100; // 기본 지급량
    
    if (clientIp) {
        const { data: existingIpProfiles, error: ipCheckError } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("signup_ip", clientIp)
            .neq("id", userId)
            .limit(1);
        
        if (!ipCheckError && existingIpProfiles && existingIpProfiles.length > 0) {
            // 중복 IP 발견: 초기 크레딧을 지급하지 않음
            initialCredits = 0;
            console.log(`Duplicate IP detected (${clientIp}). Denying initial credits for user ${userId}`);
        }
    }

    const { error: insertError } = await supabaseAdmin
      .from("profiles")
      .insert({ 
        id: userId, 
        email: user.email, 
        credits: initialCredits, 
        last_reset_date: new Date().toISOString(),
        signup_ip: clientIp 
      });
    
    if (insertError) {
        console.error("Profile creation error:", insertError);
    }
    currentCredits = initialCredits;
    lastReset = new Date().toISOString();
  } else if (!profile.signup_ip && clientIp) {
    // 기록된 IP가 없으면 현재 IP 기록 (하위 호환성)
    await supabaseAdmin.from("profiles").update({ signup_ip: clientIp }).eq("id", userId);
  }

  // 3. 일일 리셋 로직 (Daily Floor Reset)
  // 오늘 날짜와 마지막 리셋 날짜 비교
  const today = new Date().toISOString().split('T')[0];
  const lastResetDate = lastReset ? new Date(lastReset).toISOString().split('T')[0] : "";

  if (lastResetDate !== today) {
    // 날짜가 바뀌었으면
    if (currentCredits < DAILY_FREE_FLOOR) {
        // 무료 제공량보다 적으면 무료 제공량만큼 채워줌 (예: 5 -> 30)
        // 유료 결제해서 500 있는 사람은 그대로 유지 (500 -> 500)
        currentCredits = DAILY_FREE_FLOOR;
        
        await supabaseAdmin
            .from("profiles")
            .update({ credits: currentCredits, last_reset_date: today })
            .eq("id", userId);
    } else {
        // 이미 많으면 날짜만 업데이트
        await supabaseAdmin
            .from("profiles")
            .update({ last_reset_date: today })
            .eq("id", userId);
    }
  }

  // 4. 크레딧 차감 확인
  if (currentCredits < cost) {
    return { 
        allowed: false, 
        currentCredits, 
        cost, 
        message: `크레딧이 부족합니다. (필요: ${cost}, 보유: ${currentCredits})`, 
        status: 402, // Payment Required
        userId
    };
  }

  // 5. 크레딧 차감 실행
  const newCredits = currentCredits - cost;
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ credits: newCredits })
    .eq("id", userId);

  if (updateError) {
    console.error("Credit deduction error:", updateError);
    return { allowed: false, currentCredits, cost, message: "크레딧 차감 중 오류 발생", status: 500 };
  }

  return { allowed: true, currentCredits: newCredits, cost, userId };
};
