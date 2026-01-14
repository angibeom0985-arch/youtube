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

// 크레딧 설정
const INITIAL_CREDITS = 100;        // 신규 가입자 초기 크레딧
const INITIAL_PERIOD_DAYS = 3;      // 초기 크레딧 사용 기한 (3일)
const DAILY_FREE_CREDITS = 20;      // 3일 이후 일일 무료 크레딧

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
    .select("credits, last_reset_date, signup_ip, initial_credits_expiry")
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
    if (clientIp) {
        const { data: existingIpProfiles, error: ipCheckError } = await supabaseAdmin
            .from("profiles")
            .select("id, email")
            .eq("signup_ip", clientIp)
            .neq("id", userId)
            .limit(1);
        
        if (!ipCheckError && existingIpProfiles && existingIpProfiles.length > 0) {
            // 중복 IP 발견: 아예 서비스 이용 차단
            console.log(`Abuse detected: Duplicate IP (${clientIp}). User ${userId} blocked.`);
            return { 
                allowed: false, 
                currentCredits: 0, 
                cost, 
                message: "죄송합니다. IP당 하나의 계정만 초기 크레딧을 받을 수 있습니다. 기존에 가입한 계정으로 로그인해주세요.", 
                status: 403 
            };
        }
    }

    // 신규 가입자: 초기 100 크레딧 + 3일 사용기한 설정
    const signupDate = new Date();
    const initialExpiryDate = new Date(signupDate);
    initialExpiryDate.setDate(initialExpiryDate.getDate() + INITIAL_PERIOD_DAYS);
    
    const { error: insertError } = await supabaseAdmin
      .from("profiles")
      .insert({ 
        id: userId, 
        email: user.email, 
        credits: INITIAL_CREDITS, 
        last_reset_date: signupDate.toISOString(),
        initial_credits_expiry: initialExpiryDate.toISOString(),
        signup_ip: clientIp 
      });
    
    if (insertError) {
        console.error("Profile creation error:", insertError);
    }
    currentCredits = INITIAL_CREDITS;
    lastReset = new Date().toISOString();
  } else if (!profile.signup_ip && clientIp) {
    // 기록된 IP가 없으면 현재 IP 기록 (하위 호환성)
    await supabaseAdmin.from("profiles").update({ signup_ip: clientIp }).eq("id", userId);
  }

  // 3. 일일 리셋 로직
  const today = new Date().toISOString().split('T')[0];
  const lastResetDate = lastReset ? new Date(lastReset).toISOString().split('T')[0] : "";
  const initialExpiryDate = profile?.initial_credits_expiry;
  const isInInitialPeriod = initialExpiryDate && new Date() < new Date(initialExpiryDate);

  if (lastResetDate !== today) {
    // 날짜가 바뀌었을 때
    if (isInInitialPeriod) {
      // 초기 3일 기간 중: 날짜만 업데이트 (크레딧 충전 안함)
      await supabaseAdmin
        .from("profiles")
        .update({ last_reset_date: today })
        .eq("id", userId);
    } else {
      // 3일 이후: 일일 무료 크레딧 지급
      if (currentCredits < DAILY_FREE_CREDITS) {
        currentCredits = DAILY_FREE_CREDITS;
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
