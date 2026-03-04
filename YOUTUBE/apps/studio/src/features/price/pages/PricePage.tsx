import React from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiBarChart2,
  FiCheck,
  FiLayers,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";

import HomeBackButton from "@/components/HomeBackButton";
import { CREDIT_COSTS } from "@/constants/creditCosts";

type Plan = {
  id: "starter" | "growth" | "scale";
  name: string;
  subtitle: string;
  monthlyPriceKrw: number;
  credits: number;
  badge: string;
  cta: string;
  recommended?: boolean;
  anchorPriceKrw?: number;
};

type FeatureCostRow = {
  key: string;
  label: string;
  credits: number;
  unit?: string;
};

const ASSUMED_IMAGE_GENERATIONS_PER_VIDEO = 6;
const ASSUMED_TTS_CHARS_PER_VIDEO = 1200;
const ASSUMED_REVENUE_PER_VIDEO_KRW = 80000;
const API_COST_MARGIN = 1.35;

const CREDIT_BREAKDOWN = [
  { key: "search", label: "벤치마킹 검색", cost: CREDIT_COSTS.SEARCH },
  {
    key: "analysis",
    label: "대본 분석 + 주제 추천",
    cost: CREDIT_COSTS.ANALYZE_TRANSCRIPT + CREDIT_COSTS.GENERATE_IDEAS,
  },
  { key: "script", label: "대본 생성", cost: CREDIT_COSTS.GENERATE_SCRIPT },
  {
    key: "image",
    label: `이미지 생성 (${ASSUMED_IMAGE_GENERATIONS_PER_VIDEO}컷)` ,
    cost: CREDIT_COSTS.GENERATE_IMAGE * ASSUMED_IMAGE_GENERATIONS_PER_VIDEO,
  },
  {
    key: "tts",
    label: `TTS 생성 (${ASSUMED_TTS_CHARS_PER_VIDEO.toLocaleString()}자)` ,
    cost: (ASSUMED_TTS_CHARS_PER_VIDEO / 10) * CREDIT_COSTS.TTS_PER_10_CHARS,
  },
];

const FEATURE_COST_ROWS: FeatureCostRow[] = [
  { key: "search", label: "벤치마킹 검색", credits: CREDIT_COSTS.SEARCH, unit: "1회" },
  {
    key: "analysis_ideas",
    label: "대본 분석 + 주제 추천",
    credits: CREDIT_COSTS.ANALYZE_TRANSCRIPT + CREDIT_COSTS.GENERATE_IDEAS,
    unit: "1회",
  },
  { key: "reformat", label: "주제 형식 변환", credits: CREDIT_COSTS.REFORMAT_TOPIC, unit: "1회" },
  { key: "script", label: "대본 생성", credits: CREDIT_COSTS.GENERATE_SCRIPT, unit: "1회" },
  { key: "image", label: "이미지 생성", credits: CREDIT_COSTS.GENERATE_IMAGE, unit: "1컷" },
  { key: "tts", label: "TTS 생성", credits: CREDIT_COSTS.TTS_PER_10_CHARS, unit: "10자" },
].filter((row) => row.credits > 0);

const API_RAW_COST_KRW: Record<string, number> = {
  search: 58,
  analysis_ideas: 26,
  script: 128,
  image: 74,
  tts: 11,
};

const VIDEO_CREDIT_COST = CREDIT_BREAKDOWN.reduce((sum, item) => sum + item.cost, 0);

const PLAN_LIST: Plan[] = [
  {
    id: "starter",
    name: "스타터",
    subtitle: "초기 테스트 / 실험 채널",
    monthlyPriceKrw: 39000,
    credits: 1800,
    badge: "입문 최적",
    cta: "가볍게 시작",
  },
  {
    id: "growth",
    name: "그로스",
    subtitle: "수익화 집중 / 가장 많이 선택",
    monthlyPriceKrw: 89000,
    anchorPriceKrw: 119000,
    credits: 5400,
    badge: "BEST VALUE",
    cta: "지금 업그레이드",
    recommended: true,
  },
  {
    id: "scale",
    name: "스케일",
    subtitle: "팀 운영 / 고빈도 제작",
    monthlyPriceKrw: 189000,
    credits: 10000,
    badge: "대량 제작",
    cta: "팀 플랜 선택",
  },
];

const formatWon = (value: number) => `${Math.round(value).toLocaleString()}원`;

const getPlanMetrics = (plan: Plan) => {
  const estimatedVideos = Math.floor(plan.credits / VIDEO_CREDIT_COST);
  const estimatedRevenue = estimatedVideos * ASSUMED_REVENUE_PER_VIDEO_KRW;
  const estimatedProfit = estimatedRevenue - plan.monthlyPriceKrw;
  const costPerCredit = plan.monthlyPriceKrw / plan.credits;
  const creditsPer1000Won = (plan.credits / plan.monthlyPriceKrw) * 1000;
  return {
    estimatedVideos,
    estimatedRevenue,
    estimatedProfit,
    costPerCredit,
    creditsPer1000Won,
  };
};

const PricePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0c111b] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-20 left-0 h-[320px] w-[420px] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-32 right-[-80px] h-[420px] w-[420px] rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[260px] w-[360px] rounded-full bg-amber-500/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <HomeBackButton tone="yellow" className="mb-6" />

        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/75 to-slate-900/50 p-6 shadow-[0_30px_80px_rgba(2,6,23,0.55)] sm:p-9">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            <FiTrendingUp className="h-3.5 w-3.5" />
            Conversion Pricing
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">
            크레딧 요금제,
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-300 bg-clip-text text-transparent">
              그로스 플랜 중심으로 설계
            </span>
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            제작 1회당 평균 소모 크레딧을 기준으로 실전 수익 시뮬레이션을 제공합니다.
            스타터는 진입장벽을 낮추고, 스케일은 상위 확장용으로 배치해
            <span className="font-bold text-emerald-200"> 중간 플랜의 체감 가성비</span>가 가장 높게 보이도록 설계했습니다.
          </p>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-400">평균 제작 원가</p>
              <p className="mt-1 text-2xl font-black text-white">{Math.round(VIDEO_CREDIT_COST)} 크레딧</p>
              <p className="mt-1 text-xs text-slate-300">영상 1개 기준</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4">
              <p className="text-xs text-emerald-100/85">평균 영상 수익</p>
              <p className="mt-1 text-2xl font-black text-white">{formatWon(ASSUMED_REVENUE_PER_VIDEO_KRW)}</p>
              <p className="mt-1 text-xs text-emerald-100/75">채널 상황에 따라 변동 가능</p>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4">
              <p className="text-xs text-amber-100/90">핵심 추천</p>
              <p className="mt-1 text-2xl font-black text-white">그로스 플랜</p>
              <p className="mt-1 text-xs text-amber-100/80">월 제작량/수익화 밸런스 최적화</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
          <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
              <FiBarChart2 className="h-4 w-4" />
              크레딧 인포그래픽
            </div>
            <h2 className="text-xl font-black text-white">영상 1개 제작 시 소모 구조</h2>
            <p className="mt-2 text-sm text-slate-300">어디서 크레딧이 많이 쓰이는지 한눈에 확인하세요.</p>

            <div className="mt-5 space-y-3">
              {CREDIT_BREAKDOWN.map((item, idx) => {
                const ratio = Math.max(8, Math.round((item.cost / VIDEO_CREDIT_COST) * 100));
                const barTone =
                  idx === 0
                    ? "from-cyan-400 to-cyan-300"
                    : idx === 1
                      ? "from-indigo-400 to-violet-300"
                      : idx === 2
                        ? "from-emerald-400 to-emerald-300"
                        : idx === 3
                          ? "from-amber-400 to-orange-300"
                          : "from-pink-400 to-rose-300";
                return (
                  <div key={item.key}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                      <span>{item.label}</span>
                      <span className="font-semibold text-white">{Math.round(item.cost)}크레딧</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-800/90">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${barTone}`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-3">
              <p className="text-xs text-emerald-100/85">한 줄 요약</p>
              <p className="mt-1 text-sm font-semibold text-emerald-50">
                이미지 + TTS 비중이 크기 때문에, 크레딧 여유가 있는 플랜일수록 제작 단가가 안정됩니다.
              </p>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-[0_24px_60px_rgba(2,6,23,0.45)] sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-white sm:text-2xl">요금제 선택</h2>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-100">
                <FiZap className="h-3.5 w-3.5" />
                중간 플랜 구매율 극대화 구조
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {PLAN_LIST.map((plan) => {
                const m = getPlanMetrics(plan);
                return (
                  <article
                    key={plan.id}
                    className={`relative overflow-hidden rounded-2xl border p-4 transition-transform ${plan.recommended
                      ? "border-emerald-300/70 bg-gradient-to-b from-emerald-500/20 via-emerald-500/10 to-slate-900/75 shadow-[0_20px_55px_rgba(16,185,129,0.3)] lg:-translate-y-2"
                      : "border-white/10 bg-black/25"
                      }`}
                  >
                    {plan.recommended && (
                      <div className="absolute right-3 top-3 rounded-full bg-emerald-300 px-2.5 py-1 text-[10px] font-black text-slate-900">
                        추천
                      </div>
                    )}

                    <p className={`text-xs font-semibold ${plan.recommended ? "text-emerald-100" : "text-slate-300"}`}>{plan.badge}</p>
                    <h3 className="mt-1 text-3xl font-black text-white">{plan.name}</h3>
                    <p className="mt-1 text-xs text-slate-300">{plan.subtitle}</p>

                    <div className="mt-4">
                      {plan.anchorPriceKrw && (
                        <p className="text-xs text-slate-400 line-through">정가 {formatWon(plan.anchorPriceKrw)}</p>
                      )}
                      <p className="text-2xl font-black text-white">{formatWon(plan.monthlyPriceKrw)}</p>
                      <p className="text-xs text-slate-300">{plan.credits.toLocaleString()} 크레딧 포함</p>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <p className="rounded-lg bg-slate-800/75 px-3 py-2 text-slate-200">
                        제작 가능 예상: <span className="font-black text-white">{m.estimatedVideos.toLocaleString()}개</span>
                      </p>
                      <p className="rounded-lg bg-cyan-500/15 px-3 py-2 text-cyan-100">
                        예상 총수익: <span className="font-black text-white">{formatWon(m.estimatedRevenue)}</span>
                      </p>
                      <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-amber-100">
                        요금 대비 순이익: <span className="font-black text-white">{formatWon(m.estimatedProfit)}</span>
                      </p>
                      <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-emerald-100">
                        1크레딧 단가: <span className="font-black text-white">{m.costPerCredit.toFixed(1)}원</span>
                      </p>
                      <p className="rounded-lg bg-indigo-500/15 px-3 py-2 text-indigo-100">
                        1,000원당: <span className="font-black text-white">{m.creditsPer1000Won.toFixed(1)}크레딧</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${plan.recommended
                        ? "bg-emerald-400 text-slate-900 hover:bg-emerald-300"
                        : "border border-white/20 bg-white/5 text-white hover:bg-white/10"
                        }`}
                    >
                      {plan.cta}
                      <FiArrowRight className="h-4 w-4" />
                    </button>
                  </article>
                );
              })}
            </div>
          </article>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-white">기능별 크레딧 / API 원가 환산</h2>
            <p className="text-xs text-slate-300">0크레딧 기능은 자동 제외됨</p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2">기능</th>
                  <th className="px-3 py-2">기준</th>
                  <th className="px-3 py-2">현재 크레딧</th>
                  <th className="px-3 py-2">API 원가(추정)</th>
                  <th className="px-3 py-2">권장 크레딧</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_COST_ROWS.map((row) => {
                  const rawCost = API_RAW_COST_KRW[row.key] ?? 0;
                  const recommendedCredits = Math.max(1, Math.ceil((rawCost * API_COST_MARGIN) / (89000 / 5400)));
                  return (
                    <tr key={row.key} className="border-b border-white/5 text-slate-200">
                      <td className="px-3 py-2 font-semibold text-white">{row.label}</td>
                      <td className="px-3 py-2 text-slate-300">{row.unit || "-"}</td>
                      <td className="px-3 py-2">{row.credits.toLocaleString()}크레딧</td>
                      <td className="px-3 py-2">{formatWon(rawCost)}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-100">
                          {recommendedCredits.toLocaleString()}크레딧
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            원가 계산 기준: API 실비 추정치 + 운영 마진 {Math.round((API_COST_MARGIN - 1) * 100)}%.
          </p>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-white">바로 시작 가이드</h2>
            <p className="text-xs text-slate-300">리스크는 낮추고, 제작량은 올리는 순서</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-400">STEP 1</p>
              <p className="mt-1 font-bold text-white">스타터로 1주 검증</p>
            </div>
            <div className="rounded-xl border border-emerald-300/35 bg-emerald-500/10 p-4">
              <p className="text-xs text-emerald-100">STEP 2</p>
              <p className="mt-1 font-bold text-white">그로스로 본격 수익화</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-400">STEP 3</p>
              <p className="mt-1 font-bold text-white">팀 운영 시 스케일 확장</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/mypage"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-900 hover:bg-emerald-300"
            >
              <FiCheck className="h-4 w-4" />
              지금 크레딧 구매하러 가기
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              <FiLayers className="h-4 w-4" />
              홈으로 돌아가기
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PricePage;
