import React, { useEffect, useMemo, useState } from "react";
import { FiDownload, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";
import HomeBackButton from "@/components/HomeBackButton";
import UserCreditToolbar from "@/components/UserCreditToolbar";
import { CREDIT_COSTS, formatCreditLabel } from "@/constants/creditCosts";

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
  { label: "쇼츠(<60s)", value: "short" },
  { label: "롱폼(>=60s)", value: "long" },
];

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

const BenchmarkingPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [couponBypassCredits, setCouponBypassCredits] = useState(false);
  const [query, setQuery] = useState("일상 건강");
  const [days, setDays] = useState(30);
  const [durationFilter, setDurationFilter] = useState("any");
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

  const filteredResults = useMemo(() => results, [results]);

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
    <div className="min-h-screen bg-black text-white relative">
      <div className="absolute top-0 right-0 p-4 sm:p-6 flex gap-3 z-50 items-center">
        <UserCreditToolbar user={user} onLogout={handleLogout} tone="purple" showCredits={false} />
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-24 pb-10">
        <HomeBackButton tone="purple" className="mb-4" />
        <h1 className="text-3xl font-black mb-2">벤치마킹 영상 검색</h1>
        <p className="text-slate-400 mb-8">검색 실행 시 크레딧이 차감됩니다. 쿠폰 계정의 API 키 등록은 마이페이지에서 진행하세요.</p>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">검색어</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-black border border-white/15"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {dateOptions.map((item) => (
              <button
                key={item.days}
                type="button"
                onClick={() => setDays(item.days)}
                className={`px-3 py-2 rounded-lg border text-sm ${days === item.days ? "bg-purple-600 border-purple-500" : "border-white/15"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {durationOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setDurationFilter(item.value)}
                className={`px-3 py-2 rounded-lg border text-sm ${durationFilter === item.value ? "bg-purple-600 border-purple-500" : "border-white/15"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 flex items-center gap-2"
            >
              <FiSearch />
              {loading ? "검색 중..." : `검색 (${formatCreditLabel(CREDIT_COSTS.SEARCH)})`}
            </button>
            <button
              type="button"
              onClick={exportToCsv}
              disabled={!filteredResults.length}
              className="px-4 py-2 rounded-lg border border-white/20 disabled:opacity-50 flex items-center gap-2"
            >
              <FiDownload /> CSV
            </button>
          </div>

          {error && <p className="text-red-300 text-sm">{error}</p>}
        </form>

        {summary && (
          <div className="mt-6 text-sm text-slate-300">
            스캔: {summary.scanned.toLocaleString()} / 제목필터: {summary.titleFiltered.toLocaleString()} / 매칭: {summary.matched.toLocaleString()}
          </div>
        )}

        <div className="mt-6 grid gap-3">
          {filteredResults.map((item, idx) => (
            <div key={item.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">#{idx + 1} · 기여도 {item.contribution}</div>
              <a href={item.link} target="_blank" rel="noreferrer" className="font-semibold text-slate-100 hover:text-purple-300">
                {item.title}
              </a>
              <div className="text-sm text-slate-400 mt-1">{item.channelTitle} · 조회수 {item.views.toLocaleString()} · 구독자 {item.subscribers.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BenchmarkingPage;
