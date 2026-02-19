import React, { useEffect, useMemo, useState } from "react";
import { FiDownload, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";
import HomeBackButton from "@/components/HomeBackButton";
import UserCreditToolbar from "@/components/UserCreditToolbar";
import { CREDIT_COSTS, formatCreditButtonLabel } from "@/constants/creditCosts";

type VideoResult = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  channelTitle: string;
  thumbnail: string;
  views: number;
  subscribers: number;
  durationLabel: string;
  durationSeconds: number;
  contribution: number;
  publishedAt: string;
  link: string;
};

type SearchSummary = {
  scanned: number;
  titleFiltered: number;
  matched: number;
};

const dateOptions = [
  { label: "1개월", days: 30 },
  { label: "2개월", days: 60 },
  { label: "6개월", days: 180 },
  { label: "1년", days: 365 },
  { label: "전체", days: 0 },
];

const durationOptions = [
  { label: "전체", value: "any" },
  { label: "쇼츠(60초 미만)", value: "short" },
  { label: "롱폼(60초 이상)", value: "long" },
];

const subscriberOptions = [
  { label: "전체", min: 0 },
  { label: "1천+", min: 1_000 },
  { label: "1만+", min: 10_000 },
  { label: "10만+", min: 100_000 },
  { label: "100만+", min: 1_000_000 },
];

const sortOptions = [
  { label: "떡상 점수순", value: "momentum" },
  { label: "조회수순", value: "views" },
  { label: "구독자순", value: "subscribers" },
  { label: "최신순", value: "recent" },
] as const;

type SortOption = (typeof sortOptions)[number]["value"];

const extractGoogleCloudApiKey = (raw: unknown): string => {
  if (!raw) return "";

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (!trimmed.startsWith("{")) return trimmed;

    try {
      const parsed = JSON.parse(trimmed) as { apiKey?: string };
      return typeof parsed.apiKey === "string" ? parsed.apiKey.trim() : "";
    } catch {
      return "";
    }
  }

  if (typeof raw === "object") {
    const obj = raw as { apiKey?: unknown };
    return typeof obj.apiKey === "string" ? obj.apiKey.trim() : "";
  }

  return "";
};

const getMomentumScore = (contribution: number): number => {
  if (!Number.isFinite(contribution) || contribution <= 0) return 0;
  // contribution 스케일(대략 0~7+)을 0~100으로 압축
  return Math.min(100, Math.round((1 - Math.exp(-contribution / 2.8)) * 100));
};

const getMomentumTier = (score: number): string => {
  if (score >= 85) return "초고속 상승";
  if (score >= 70) return "강한 상승";
  if (score >= 55) return "상승";
  if (score >= 40) return "관찰 필요";
  return "보통";
};

const BenchmarkingPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [couponBypassCredits, setCouponBypassCredits] = useState(false);
  const [query, setQuery] = useState("경제학");
  const [queryTouched, setQueryTouched] = useState(false);
  const [days, setDays] = useState(30);
  const [durationFilter, setDurationFilter] = useState("any");
  const [subscriberMin, setSubscriberMin] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>("momentum");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<SearchSummary | null>(null);
  const [results, setResults] = useState<VideoResult[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const localKey = localStorage.getItem("google_cloud_api_key") || "";
    if (localKey.trim()) {
      setYoutubeApiKey(localKey.trim());
    }

    const loadKeyFromProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      try {
        const response = await fetch("/api/user/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) return;
        const data = await response.json();
        const isCouponBypass = data?.coupon_bypass_credits === true;
        setCouponBypassCredits(isCouponBypass);
        const extracted = extractGoogleCloudApiKey(data?.google_credit_json);
        if (isCouponBypass && !extracted) {
          alert("할인 쿠폰 계정은 마이페이지에서 Google Cloud API 키를 먼저 등록해야 합니다.");
          navigate("/mypage", {
            replace: true,
            state: { from: "/benchmarking", reason: "coupon_api_key_required" },
          });
          return;
        }
        if (!extracted) return;

        setYoutubeApiKey(extracted);
        localStorage.setItem("google_cloud_api_key", extracted);
      } catch {
        // no-op
      }
    };

    loadKeyFromProfile();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const filteredResults = useMemo(() => {
    const filtered = results.filter((item) => item.subscribers >= subscriberMin);
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "views") return b.views - a.views;
      if (sortBy === "subscribers") return b.subscribers - a.subscribers;
      if (sortBy === "recent") {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
      // momentum
      return getMomentumScore(b.contribution) - getMomentumScore(a.contribution);
    });
    return sorted;
  }, [results, subscriberMin, sortBy]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (couponBypassCredits && !youtubeApiKey.trim()) {
      setError("할인 쿠폰 계정은 마이페이지에서 Google Cloud API 키를 등록해야 합니다.");
      navigate("/mypage", {
        replace: true,
        state: { from: "/benchmarking", reason: "coupon_api_key_required" },
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch("/api/benchmarking/search", {
        method: "POST",
        headers,
        body: JSON.stringify({
          apiKey: youtubeApiKey.trim(),
          query,
          days,
          durationFilter,
          maxScan: 100,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data?.error === "credit_limit") {
          throw new Error("크레딧이 부족합니다.");
        }
        if (data?.error === "missing_api_key") {
          throw new Error("서버 YouTube API 키가 없습니다. 관리자에게 문의해 주세요.");
        }
        if (data?.error === "coupon_user_key_required") {
          navigate("/mypage", {
            replace: true,
            state: { from: "/benchmarking", reason: "coupon_api_key_required" },
          });
          throw new Error("할인 쿠폰 모드에서는 마이페이지에 본인 Google Cloud API 키를 등록해야 합니다.");
        }
        if (data?.error === "auth_required") {
          throw new Error("크레딧 모드 사용을 위해 로그인이 필요합니다.");
        }
        throw new Error(data?.error || "검색에 실패했습니다.");
      }

      setResults(data.results || []);
      setSummary(data.summary || null);

      if (data?.billing?.mode === "server_credit") {
        window.dispatchEvent(new Event("creditRefresh"));
      }
    } catch (err) {
      setError((err as Error).message || "검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = () => {
    if (!filteredResults.length) return;

    const headers = ["순위", "제목", "채널", "구독자", "조회수", "기여도", "길이", "게시일", "링크"];
    const rows = filteredResults.map((item, idx) => [
      String(idx + 1),
      item.title,
      item.channelTitle,
      String(item.subscribers),
      String(item.views),
      String(item.contribution),
      item.durationLabel,
      item.publishedAt?.split("T")[0] || "",
      item.link,
    ]);

    const csv = [headers, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `benchmarking_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_15%,rgba(168,85,247,0.18),transparent_38%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.18),transparent_30%),linear-gradient(180deg,rgba(17,24,39,0.25),rgba(0,0,0,0.85))]" />
      <div className="absolute top-0 right-0 p-4 sm:p-6 flex gap-3 z-50 items-center">
        <UserCreditToolbar user={user} onLogout={handleLogout} tone="purple" showCredits={false} />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-10">
        <HomeBackButton tone="purple" className="mb-4" />
        <h1 className="text-3xl font-black mb-2 bg-gradient-to-r from-purple-200 via-fuchsia-300 to-purple-400 bg-clip-text text-transparent">벤치마킹 영상 검색</h1>
        <p className="text-purple-100/80 mb-8">키워드 기준으로 유튜브 영상을 빠르게 탐색하고, 채널 규모·조회수·기여도를 비교해 벤치마킹 인사이트를 얻는 기능입니다.</p>

        <form onSubmit={handleSubmit} className="bg-gradient-to-br from-purple-950/55 to-black/70 border border-purple-400/35 rounded-2xl p-6 space-y-4 shadow-[0_0_0_1px_rgba(139,92,246,0.25),0_20px_50px_rgba(88,28,135,0.3)]">
          <div>
            <label className="block text-sm text-purple-100/90 mb-2">검색어</label>
            <input
              value={query}
              onFocus={() => {
                if (!queryTouched && query === "경제학") {
                  setQuery("");
                }
                setQueryTouched(true);
              }}
              onChange={(e) => {
                setQueryTouched(true);
                setQuery(e.target.value);
              }}
              required
              className={`w-full px-4 py-3 rounded-xl bg-black/60 border border-purple-300/30 focus:border-purple-300 focus:ring-2 focus:ring-purple-500/40 outline-none ${!queryTouched && query === "경제학" ? "text-slate-400" : "text-white"}`}
            />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-purple-200/80 mb-2">기간</p>
              <div className="flex flex-wrap gap-2">
                {dateOptions.map((item) => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => setDays(item.days)}
                    className={`px-3 py-2 rounded-full border text-sm whitespace-nowrap transition-all ${days === item.days ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 border-purple-300 text-white shadow-[0_6px_20px_rgba(139,92,246,0.4)]" : "border-purple-300/25 bg-purple-900/20 text-purple-100/80 hover:border-purple-300/40"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-purple-200/80 mb-2">영상 길이</p>
              <div className="flex flex-wrap gap-2">
                {durationOptions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setDurationFilter(item.value)}
                    className={`px-3 py-2 rounded-full border text-sm whitespace-nowrap transition-all ${durationFilter === item.value ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 border-purple-300 text-white shadow-[0_6px_20px_rgba(139,92,246,0.4)]" : "border-purple-300/25 bg-purple-900/20 text-purple-100/80 hover:border-purple-300/40"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-purple-200/80 mb-2">구독자수</p>
              <div className="flex flex-wrap gap-2">
                {subscriberOptions.map((item) => (
                  <button
                    key={item.min}
                    type="button"
                    onClick={() => setSubscriberMin(item.min)}
                    className={`px-3 py-2 rounded-full border text-sm whitespace-nowrap transition-all ${subscriberMin === item.min ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 border-purple-300 text-white shadow-[0_6px_20px_rgba(139,92,246,0.4)]" : "border-purple-300/25 bg-purple-900/20 text-purple-100/80 hover:border-purple-300/40"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold text-purple-200/80 mr-1">정렬</p>
              {sortOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSortBy(item.value)}
                  className={`px-3 py-2 rounded-full border text-sm whitespace-nowrap transition-all ${sortBy === item.value ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 border-purple-300 text-white shadow-[0_6px_20px_rgba(139,92,246,0.4)]" : "border-purple-300/25 bg-purple-900/20 text-purple-100/80 hover:border-purple-300/40"}`}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={exportToCsv}
                disabled={!filteredResults.length}
                className="lg:ml-auto px-4 py-2 rounded-full border border-purple-300/35 bg-purple-900/20 disabled:opacity-50 flex items-center gap-2 text-purple-100/90 whitespace-nowrap"
              >
                <FiDownload /> CSV
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-violet-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-violet-500 disabled:opacity-50 flex items-center justify-center gap-3 text-lg font-black shadow-[0_14px_32px_rgba(139,92,246,0.42)]"
            >
              <FiSearch />
              {loading ? "검색 중..." : `검색 시작 (${formatCreditButtonLabel(CREDIT_COSTS.SEARCH).replace("크레딯", "크레딧")})`}
            </button>
          </div>

          {error && <p className="text-red-300 text-sm">{error}</p>}
        </form>

        {summary && (
          <div className="mt-6 text-sm text-purple-100/85 bg-purple-950/40 border border-purple-400/25 rounded-xl px-4 py-3">
            스캔: {summary.scanned.toLocaleString()} / 제목필터: {summary.titleFiltered.toLocaleString()} / 매칭: {summary.matched.toLocaleString()}
          </div>
        )}

        <div className="mt-6 grid gap-3">
          {filteredResults.map((item, idx) => (
            <div key={item.id} className="bg-gradient-to-br from-purple-950/45 to-black/80 border border-purple-300/25 rounded-xl p-4">
              <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                <a href={item.link} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`}
                    alt={item.title}
                    className="w-full h-[124px] object-cover rounded-lg border border-purple-300/25"
                    loading="lazy"
                  />
                </a>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                    <span className="text-purple-200/70">#{idx + 1}</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-300/40 text-rose-100">
                      떡상 점수 {getMomentumScore(item.contribution)}점
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-300/35 text-purple-100">
                      {getMomentumTier(getMomentumScore(item.contribution))}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 border border-white/10 overflow-hidden mb-3">
                    <div
                      className="h-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-rose-500"
                      style={{ width: `${getMomentumScore(item.contribution)}%` }}
                    />
                  </div>
                  <a href={item.link} target="_blank" rel="noreferrer" className="font-semibold text-slate-100 hover:text-purple-300">
                    {item.title}
                  </a>
                  <div className="text-sm text-purple-100/70 mt-1">{item.channelTitle} · 조회수 {item.views.toLocaleString()} · 구독자 {item.subscribers.toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BenchmarkingPage;
