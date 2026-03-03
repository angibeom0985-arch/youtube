import React from "react";
import { Link } from "react-router-dom";
import HomeBackButton from "@/components/HomeBackButton";
import { CREDIT_COSTS } from "@/constants/creditCosts";

type Plan = {
  name: string;
  priceKrw: number;
  credits: number;
  highlight: string;
};

const PLAN_LIST: Plan[] = [
  { name: "스타터", priceKrw: 29000, credits: 1500, highlight: "테스트 + 첫 수익화" },
  { name: "그로스", priceKrw: 79000, credits: 5000, highlight: "가장 많이 선택" },
  { name: "스케일", priceKrw: 149000, credits: 12000, highlight: "채널 확장 운영" },
];

const ASSUMED_IMAGE_GENERATIONS_PER_VIDEO = 6;
const ASSUMED_TTS_CHARS_PER_VIDEO = 1200;
const ASSUMED_REVENUE_PER_VIDEO_KRW = 80000;

const VIDEO_CREDIT_COST =
  CREDIT_COSTS.ANALYZE_TRANSCRIPT +
  CREDIT_COSTS.GENERATE_IDEAS +
  CREDIT_COSTS.GENERATE_SCRIPT +
  CREDIT_COSTS.GENERATE_IMAGE * ASSUMED_IMAGE_GENERATIONS_PER_VIDEO +
  (ASSUMED_TTS_CHARS_PER_VIDEO / 10) * CREDIT_COSTS.TTS_PER_10_CHARS;

const formatWon = (value: number) => `${Math.round(value).toLocaleString()}원`;

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

        <div className="mt-8 rounded-2xl border border-emerald-300/35 bg-emerald-950/20 p-6 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_24px_60px_rgba(16,185,129,0.16)]">
          <h2 className="text-xl font-black text-emerald-200">요금제별 수익 시뮬레이션 (이득 중심)</h2>
          <p className="mt-2 text-sm text-emerald-100/85">
            계산 기준: 영상 1개 제작에 약 {VIDEO_CREDIT_COST}크레딧, 영상 1개 평균 수익 {formatWon(ASSUMED_REVENUE_PER_VIDEO_KRW)}
          </p>
          <p className="mt-1 text-xs text-emerald-100/70">
            채널 주제/조회수/광고단가에 따라 실제 수익은 달라질 수 있습니다.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {PLAN_LIST.map((plan) => {
              const estimatedVideos = Math.floor(plan.credits / VIDEO_CREDIT_COST);
              const estimatedRevenue = estimatedVideos * ASSUMED_REVENUE_PER_VIDEO_KRW;
              const estimatedProfit = estimatedRevenue - plan.priceKrw;

              return (
                <article
                  key={plan.name}
                  className="rounded-xl border border-emerald-300/30 bg-black/30 p-4 backdrop-blur-sm"
                >
                  <p className="text-xs font-semibold tracking-wide text-emerald-200/90">{plan.highlight}</p>
                  <h3 className="mt-1 text-2xl font-black text-white">{plan.name}</h3>
                  <p className="mt-1 text-sm text-emerald-100/90">요금: {formatWon(plan.priceKrw)}</p>
                  <p className="text-sm text-emerald-100/90">제공 크레딧: {plan.credits.toLocaleString()}크레딧</p>

                  <div className="mt-4 space-y-2 text-sm">
                    <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-emerald-100">
                      제작 가능 영상: <span className="font-black text-white">{estimatedVideos.toLocaleString()}개</span>
                    </p>
                    <p className="rounded-lg bg-sky-500/15 px-3 py-2 text-sky-100">
                      예상 총수익: <span className="font-black text-white">{formatWon(estimatedRevenue)}</span>
                    </p>
                    <p className="rounded-lg bg-amber-500/20 px-3 py-2 text-amber-100">
                      요금 대비 예상 순이익: <span className="font-black text-white">{formatWon(estimatedProfit)}</span>
                    </p>
                  </div>

                  <p className="mt-4 text-xs font-semibold text-emerald-200/90">
                    한 달 안에 1개만 성과가 나와도 요금 이상 회수 가능성을 노릴 수 있습니다.
                  </p>
                </article>
              );
            })}
          </div>
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
