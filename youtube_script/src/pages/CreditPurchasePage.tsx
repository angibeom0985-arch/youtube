import React, { useEffect, useState } from "react";
import { FiHome, FiZap, FiCheck } from "react-icons/fi";
import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";
import UserCreditSidebar from "../components/UserCreditSidebar";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  popular?: boolean;
  features: string[];
}

const pricingPlans: PricingPlan[] = [
  {
    id: "basic",
    name: "베이직 팩",
    price: 10.00,
    credits: 200,
    features: [
      "영상 분석 200회",
      "아이디어 생성 200회", 
      "기획안 작성 20회",
      "챕터 생성 40회",
      "30일 유효기간"
    ]
  },
  {
    id: "premium",
    name: "프리미엄 팩",
    price: 29.90,
    credits: 630,
    popular: true,
    features: [
      "영상 분석 630회",
      "아이디어 생성 630회",
      "기획안 작성 63회", 
      "챕터 생성 126회",
      "60일 유효기간",
      "우선 지원"
    ]
  },
  {
    id: "pro",
    name: "프로 팩",
    price: 49.90,
    credits: 1100,
    features: [
      "영상 분석 1,100회",
      "아이디어 생성 1,100회",
      "기획안 작성 110회",
      "챕터 생성 220회", 
      "90일 유효기간",
      "우선 지원"
    ]
  },
  {
    id: "master",
    name: "마스터 팩",
    price: 99.90,
    credits: 2300,
    features: [
      "영상 분석 2,300회",
      "아이디어 생성 2,300회",
      "기획안 작성 230회",
      "챕터 생성 460회",
      "180일 유효기간",
      "우선 지원",
      "1:1 컨설팅"
    ]
  },
  {
    id: "enterprise",
    name: "엔터프라이즈 팩",
    price: 199.90,
    credits: 5000,
    features: [
      "영상 분석 5,000회",
      "아이디어 생성 5,000회",
      "기획안 작성 500회",
      "챕터 생성 1,000회",
      "365일 유효기간",
      "우선 지원",
      "1:1 컨설팅",
      "전용 API 지원"
    ]
  }
];

const CreditPurchasePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 사용자 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // 페이지 메타데이터
    document.title = "크레딧 충전 - 유튜브 팩토리";

    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    updateMetaTag("og:title", "크레딧 충전 - 유튜브 팩토리");
    updateMetaTag("og:description", "매월 든든 자동할 필요가 없습니다. 필요한 때, 필요한 만큼 충전하세요");
    updateMetaTag("og:url", "https://youtube.money-hotissue.com/credit-purchase");

    return () => subscription.unsubscribe();
  }, []);

  const handlePurchase = (plan: PricingPlan) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      window.location.href = "/";
      return;
    }
    
    // TODO: 결제 시스템 연동
    alert(`${plan.name} 구매 기능은 준비 중입니다.\n\n결제 시스템 연동 예정입니다.`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative">
      {/* 헤더 */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <a 
            href="/" 
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <FiHome size={20} />
            <span>홈으로 돌아가기</span>
          </a>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* 제목 섹션 */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            크레딧 충전
          </h1>
          <p className="text-xl text-gray-400">
            매월 든든 자동할 필요가 없습니다. <span className="text-yellow-400 font-bold">필요한 때</span>, <span className="text-yellow-400 font-bold">필요한 만큼</span> 충전하세요
          </p>
        </div>

        {/* 가격 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-6 transition-all hover:scale-105 ${
                plan.popular
                  ? "border-yellow-500 bg-gradient-to-b from-yellow-500/10 to-transparent"
                  : "border-gray-800 bg-gray-900/50"
              }`}
            >
              {/* 인기 배지 */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-yellow-500 text-black text-sm font-bold px-4 py-1 rounded-full">
                    추천
                  </span>
                </div>
              )}

              {/* 플랜 이름 */}
              <h3 className="text-2xl font-bold mb-2 text-center">{plan.name}</h3>

              {/* 가격 */}
              <div className="text-center mb-4">
                <span className="text-4xl font-black">${plan.price}</span>
              </div>

              {/* 크레딧 */}
              <div className="flex items-center justify-center gap-2 mb-6 text-yellow-400">
                <span className="text-3xl font-bold">{plan.credits.toLocaleString()}</span>
                <FiZap size={24} />
              </div>

              {/* 충전식 크레딧 안내 */}
              <p className="text-center text-sm text-gray-400 mb-6">
                충전식 크레딧 (1년 유효)
              </p>

              {/* 기능 목록 */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                    <FiCheck className="flex-shrink-0 text-green-400 mt-0.5" size={16} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* 구매 버튼 */}
              <button
                onClick={() => handlePurchase(plan)}
                className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
                  plan.popular
                    ? "bg-yellow-500 hover:bg-yellow-400 text-black"
                    : "bg-gray-800 hover:bg-gray-700 text-white"
                }`}
              >
                구매하기
              </button>

              {/* 상쾌한 이용 가능 */}
              {plan.popular && (
                <p className="text-center text-xs text-gray-400 mt-3">
                  ✓ 상쾌한 이용 가능
                </p>
              )}
            </div>
          ))}
        </div>

        {/* 하단 안내 */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>안내: 결제 완료 후 크레딧은 즉시 충전됩니다.</p>
          <p className="mt-2">환불 정책은 구매일로부터 7일 이내, 미사용 크레딧에 한해 가능합니다.</p>
        </div>
      </main>

      {/* 사용자 크레딧 사이드바 */}
      <UserCreditSidebar user={user} />
    </div>
  );
};

export default CreditPurchasePage;
