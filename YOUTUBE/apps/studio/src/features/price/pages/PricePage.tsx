import React from "react";
import { Link } from "react-router-dom";
import HomeBackButton from "@/components/HomeBackButton";
import { CREDIT_COSTS } from "@/constants/creditCosts";

const PricePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1f1800] via-[#120f00] to-black text-amber-50">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <HomeBackButton tone="yellow" className="mb-6" />
        <h1 className="mb-2 bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-4xl font-black text-transparent">
          크레딧 요금 안내
        </h1>
        <p className="mb-8 text-amber-100/80">기능 실행 시 아래 기준으로 크레딧이 차감됩니다.</p>

        <div className="rounded-2xl border border-amber-300/30 bg-amber-950/25 p-6 shadow-[0_0_0_1px_rgba(251,191,36,0.15),0_24px_60px_rgba(245,158,11,0.18)]">
          <ul className="space-y-3 text-sm">
            <li>벤치마킹 검색: {CREDIT_COSTS.SEARCH} 크레딧</li>
            <li>대본 분석 + 주제 추천: {CREDIT_COSTS.ANALYZE_TRANSCRIPT + CREDIT_COSTS.GENERATE_IDEAS} 크레딧</li>
            <li>주제 형식 변환: {CREDIT_COSTS.REFORMAT_TOPIC} 크레딧</li>
            <li>대본 생성: {CREDIT_COSTS.GENERATE_SCRIPT} 크레딧</li>
            <li>이미지 생성(1회): {CREDIT_COSTS.GENERATE_IMAGE} 크레딧</li>
            <li>TTS 생성: 10자당 {CREDIT_COSTS.TTS_PER_10_CHARS} 크레딧</li>
          </ul>
        </div>

        <div className="mt-6 flex gap-3">
          <Link to="/mypage" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400">
            마이페이지로 이동
          </Link>
          <Link to="/" className="rounded-lg border border-amber-300/30 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/10">
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PricePage;
