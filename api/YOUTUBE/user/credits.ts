import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../../_lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "인증이 필요합니다." });
    }

    const token = authHeader.substring(7);

    // Supabase로 사용자 확인
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
    }

    // 프로필에서 크레딧 조회
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("credits, initial_credits_expiry")
      .eq("id", user.id)
      .single();

    // 프로필이 없으면 생성 (회원가입 시 트리거가 작동하지 않은 경우 대비)
    if (profileError && profileError.code === 'PGRST116') {
      console.log('프로필 없음. 새로 생성...');
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          credits: 100,
          last_reset_date: new Date().toISOString(),
          initial_credits_expiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Profile creation error:", insertError);
        return res.status(500).json({ error: "프로필 생성 중 오류가 발생했습니다." });
      }

      return res.status(200).json({
        credits: 100,
        userId: user.id,
        isInInitialPeriod: true,
        daysRemaining: 3,
        initialExpiryDate: newProfile.initial_credits_expiry
      });
    }

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return res.status(500).json({ error: "크레딧 정보를 불러올 수 없습니다." });
    }

    // 초기 크레딧 기간 확인
    const initialExpiryDate = profile?.initial_credits_expiry;
    const isInInitialPeriod = initialExpiryDate && new Date() < new Date(initialExpiryDate);
    const daysRemaining = initialExpiryDate 
      ? Math.max(0, Math.ceil((new Date(initialExpiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return res.status(200).json({
      credits: profile?.credits ?? 0,
      userId: user.id,
      isInInitialPeriod,
      daysRemaining,
      initialExpiryDate
    });

  } catch (error) {
    console.error("Credits fetch error:", error);
    return res.status(500).json({ 
      error: "크레딧 조회 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
