import React, { useState, useMemo, useEffect } from "react";
import { FiLayout, FiList, FiDownload, FiExternalLink, FiSearch } from "react-icons/fi";
import { supabase } from "@/services/supabase";
import type { User } from "@supabase/supabase-js";
import HomeBackButton from "@/components/HomeBackButton";
import { ProgressTracker } from "@/components/ProgressIndicator";
import UserCreditToolbar from "@/components/UserCreditToolbar";

interface DateOption {
  label: string;
  days: number;
}

interface DurationOption {
  label: string;
  value: string;
}

interface VideoResult {
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
}

interface SearchSummary {
  scanned: number;
  titleFiltered: number;
  matched: number;
}

const dateOptions: DateOption[] = [
  { label: "1개월", days: 30 },
  { label: "2개월", days: 60 },
  { label: "6개월", days: 180 },
  { label: "1년", days: 365 },
  { label: "전체 기간", days: 0 }
];

const durationOptions: DurationOption[] = [
  { label: "전체", value: "any" },
  { label: "숏폼", value: "short" },
  { label: "롱폼", value: "long" }
];


const momentumOptions = [
  { level: 1, label: "1단계 (없음)", min: 0, max: 0.2 },
  { level: 2, label: "2단계 (성장 중)", min: 0.2, max: 0.5 },
  { level: 3, label: "3단계 (1:1 균형)", min: 0.5, max: 1.5 },
  { level: 4, label: "4단계 (높은 모멘텀)", min: 1.5, max: 5.0 },
  { level: 5, label: "5단계 (폭발적 성과)", min: 5.0, max: 99999 }
];

const numberFormatter = new Intl.NumberFormat("ko-KR");

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
  const [user, setUser] = useState<User | null>(null);
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [query, setQuery] = useState("일상 건강");
  const [days, setDays] = useState(dateOptions[0].days);
  const [durationFilter, setDurationFilter] = useState(durationOptions[0].value);
  const [momentumLevel, setMomentumLevel] = useState(0); // 0이면 전체
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<SearchSummary | null>(null);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [searchProgress, setSearchProgress] = useState({
    currentStep: 0,
    steps: ["검색 준비", "영상 검색", "데이터 분석", "결과 정리"],
  });

  // Auth
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
    try {
      const stored = localStorage.getItem("google_cloud_api_key");
      if (stored?.trim()) {
        setYoutubeApiKey(stored.trim());
      }
    } catch (error) {
      console.error("Failed to read google_cloud_api_key from localStorage", error);
    }

    const loadKeyFromProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      try {
        const response = await fetch("/api/user/settings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        const extracted = extractGoogleCloudApiKey(data?.google_credit_json);
        if (!extracted) return;

        setYoutubeApiKey(extracted);
        localStorage.setItem("google_cloud_api_key", extracted);
      } catch (error) {
        console.error("Failed to load Google API key from profile", error);
      }
    };

    loadKeyFromProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // 클라이언트 측 필터링 적용 (모멘텀 레벨 등)
  const filteredResults = useMemo(() => {
    if (momentumLevel === 0) return results;
    const option = momentumOptions.find(o => o.level === momentumLevel);
    if (!option) return results;
    return results.filter(v => v.contribution >= option.min && v.contribution < option.max);
  }, [results, momentumLevel]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!youtubeApiKey.trim()) {
      setError("마이페이지에서 Google Cloud API 키를 먼저 저장해 주세요.");
      return;
    }

    setLoading(true);
    setSearchProgress({ ...searchProgress, currentStep: 0 });
    setError("");

    try {
      // Step 1: 검색 준비
      setSearchProgress(prev => ({ ...prev, currentStep: 0 }));
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Step 2: 영상 검색
      setSearchProgress(prev => ({ ...prev, currentStep: 1 }));
      const response = await fetch("/api/benchmarking/search", {
        method: "POST",
        headers,
        body: JSON.stringify({
          apiKey: youtubeApiKey.trim(),
          query,
          days,
          durationFilter,
          maxScan: 100 // 최대 100개 스캔
        })
      });

      // Step 3: 데이터 분석
      setSearchProgress(prev => ({ ...prev, currentStep: 2 }));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "검색에 실패했습니다.");
      }

      // Step 4: 결과 정리
      setSearchProgress(prev => ({ ...prev, currentStep: 3 }));
      await new Promise(resolve => setTimeout(resolve, 300)); // UI 업데이트를 위한 짧은 지연

      setResults(data.results || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError((err as Error).message || "검색에 실패했습니다.");
    } finally {
      setLoading(false);
      setSearchProgress({ ...searchProgress, currentStep: 0 });
    }
  }

  // 엑셀(CSV) 저장 기능 (한글 깨짐 방지 BOM 추가)
  const exportToExcel = () => {
    if (filteredResults.length === 0) return;

    const headers = ["순위", "제목", "채널명", "구독자", "조회수", "기여도", "길이", "게시일", "링크", "태그", "설명"];
    const csvRows = filteredResults.map((v, i) => [
      i + 1,
      `"${v.title.replace(/"/g, '""')}"`,
      `"${v.channelTitle.replace(/"/g, '""')}"`,
      v.subscribers,
      v.views,
      v.contribution,
      v.durationLabel,
      v.publishedAt.split('T')[0],
      v.link,
      `"${(v.tags || []).join(', ').replace(/"/g, '""')}"`,
      `"${v.description.substring(0, 100).replace(/"/g, '""').replace(/\n/g, ' ')}"...`
    ]);

    const csvContent = [headers, ...csvRows].map(e => e.join(",")).join("\n");

    // UTF-8 BOM 추가 (\ufeff)
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `유튜브_모멘텀_분석_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 relative">
      <div className="absolute top-0 right-0 p-4 sm:p-6 flex gap-3 z-50 items-center">
        <UserCreditToolbar user={user} onLogout={handleLogout} tone="purple" showCredits={false} />
      </div>

      <div className="mx-auto max-w-[1600px] px-6 pt-24 pb-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <HomeBackButton tone="purple" className="mb-2" />
            <h1 className="text-4xl font-black bg-gradient-to-r from-white via-purple-200 to-purple-500 bg-clip-text text-transparent">
              벤치마킹 영상 발굴
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">


            <div className="bg-slate-900 border border-slate-700 rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode("card")}
                className={`p-2 rounded-md transition-all ${viewMode === "card" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
              >
                <FiLayout size={18} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-md transition-all ${viewMode === "table" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
              >
                <FiList size={18} />
              </button>
            </div>
          </div>
        </div>



        {/* Search Form */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 mb-10 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Keyword & Period */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-200 mb-3">
                    <FiSearch className="text-purple-500" />
                    검색 키워드
                  </label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="분석할 키워드를 입력하세요 (예: 재테크, 다이어트)"
                    required
                    className="w-full px-5 py-4 bg-black border border-slate-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-lg"
                    style={
                      {
                        userSelect: "text",
                        WebkitUserSelect: "text",
                      } as React.CSSProperties
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-200 mb-3">업로드 기간</label>
                    <div className="flex flex-wrap gap-2">
                      {dateOptions.map((opt) => (
                        <button
                          key={opt.days}
                          type="button"
                          onClick={() => setDays(opt.days)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${days === opt.days ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-200 mb-3">영상 유형</label>
                    <div className="flex gap-2">
                      {durationOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDurationFilter(opt.value)}
                          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${durationFilter === opt.value ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Momentum Info */}
              <div className="bg-purple-900/10 border border-purple-500/20 rounded-2xl p-6 flex flex-col justify-center">
                <h3 className="text-purple-400 font-bold mb-4 flex items-center gap-2 text-lg">
                  팁: 벤치마킹 수치란?
                </h3>
                <div className="space-y-4 text-sm text-slate-300">
                  <p className="leading-relaxed">
                    구독자 수 대비 조회수가 얼마나 높은지를 측정하여 벤치마킹 효율을 계산합니다. <br />
                    <span className="text-white font-bold">1:1 비율(1배)</span>이 평균적인 성과라면, <br />
                    <span className="text-purple-400 font-bold">10배 이상의 수치</span>는 폭발적인 잠재력을 의미합니다.
                  </p>
                  <div className="p-3 bg-black/40 rounded-lg border border-purple-500/10">
                    <p className="text-xs text-slate-400">기준: 구독자 1만 / 조회수 10만 = 10배 효율</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 rounded-xl font-black transition-all text-xl shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:shadow-[0_0_40px_rgba(147,51,234,0.5)] transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  유튜브 엔진 분석 중...
                </span>
              ) : (
                <>
                  <span>벤치마킹 영상 검색</span>
                </>
              )}
            </button>

            {loading && (
              <div className="mt-4">
                <ProgressTracker
                  currentStepIndex={searchProgress.currentStep}
                  stepLabels={searchProgress.steps}
                  stepDescriptions={[
                    "YouTube API 연결을 준비하고 있습니다",
                    "검색어에 맞는 영상들을 찾고 있습니다",
                    "각 영상의 성과와 모멘텀을 계산하고 있습니다",
                    "최종 결과를 정리하고 있습니다"
                  ]}
                  estimatedTimeSeconds={18}
                />
              </div>
            )}
          </form>
        </div>

        {/* Filters & Actions bar */}
        {results.length > 0 && (
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <div className="w-full lg:w-auto">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">모멘텀 배수 필터</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setMomentumLevel(0)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${momentumLevel === 0 ? 'bg-white text-black' : 'bg-slate-800 text-slate-400'}`}
                >
                  전체
                </button>
                {momentumOptions.map((opt) => (
                  <button
                    key={opt.level}
                    onClick={() => setMomentumLevel(opt.level)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${momentumLevel === opt.level ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="text-right flex-grow lg:flex-grow-0">
                <span className="text-slate-400 text-sm">발견된 기회</span>
                <p className="text-2xl font-black text-purple-400">{filteredResults.length}건</p>
              </div>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg"
              >
                <FiDownload />
                엑셀 저장
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-orange-900/20 border-2 border-orange-500/30 rounded-xl p-6 mb-10 text-center">
            <p className="text-orange-400 font-bold">⚠️ {error}</p>
          </div>
        )}

        {/* Content Section */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-6"></div>
            <p className="text-slate-400 animate-pulse text-lg">YouTube 데이터를 수집 분석하고 있습니다...</p>
          </div>
        ) : filteredResults.length > 0 ? (
          viewMode === "card" ? (
            /* Card Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredResults.map((video, index) => (
                <div key={video.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all group">
                  <div className="relative aspect-video overflow-hidden">
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute top-3 left-3 px-3 py-1 bg-black/80 backdrop-blur-md rounded-lg text-xs font-bold text-white border border-white/10">
                      #{index + 1}
                    </div>
                    <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 rounded font-mono text-xs text-white">
                      {video.durationLabel}
                    </div>
                  </div>
                  <div className="p-6">
                    <h4 className="text-lg font-bold mb-2 line-clamp-2 min-h-[3.5rem] leading-snug">{video.title}</h4>
                    <div className="flex items-center gap-2 mb-4 text-slate-400 text-sm">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">YT</div>
                      {video.channelTitle}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-black/40 rounded-xl p-3 border border-slate-800">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">조회수</p>
                        <p className="text-green-400 font-black">{numberFormatter.format(video.views)}</p>
                      </div>
                      <div className="bg-black/40 rounded-xl p-3 border border-slate-800">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">구독자</p>
                        <p className="text-slate-300 font-black">{numberFormatter.format(video.subscribers)}</p>
                      </div>
                    </div>

                    <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-purple-300">모멘텀</span>
                        <span className="text-xl font-black text-purple-400">{video.contribution}배↑</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-6">
                      {video.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded">#{tag}</span>
                      ))}
                    </div>

                    <a
                      href={video.link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-orange-600/10 hover:bg-orange-600 text-orange-500 hover:text-white font-bold rounded-xl border border-orange-600/30 transition-all"
                    >
                      <FiExternalLink />
                      영상 자세히 보기
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View with Column Resizing */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="bg-slate-800/50 border-b border-slate-700">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase w-20">순위</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase min-w-[300px] resize-x overflow-auto">영상 제목</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase min-w-[150px] resize-x overflow-auto">채널명</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase w-24">길이</th>
                      <th className="px-6 py-4 text-xs font-bold text-green-400 uppercase w-32">조회수</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase w-32">구독자</th>
                      <th className="px-6 py-4 text-xs font-bold text-purple-400 uppercase w-32">모멘텀</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase w-24">링크</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredResults.map((video, index) => (
                      <tr key={video.id} className="hover:bg-purple-500/5 transition-colors group">
                        <td className="px-6 py-4 text-sm font-bold text-slate-500">#{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <img src={video.thumbnail} className="w-16 h-9 object-cover rounded shadow-lg" alt="" />
                            <div className="max-w-[400px] overflow-hidden">
                              <p className="text-sm font-bold truncate group-hover:text-purple-400 transition-colors" title={video.title}>{video.title}</p>
                              <p className="text-[10px] text-slate-500 mt-1">{video.publishedAt.split('T')[0]}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300 font-medium">{video.channelTitle}</td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-400">{video.durationLabel}</td>
                        <td className="px-6 py-4 text-sm font-black text-green-400">{numberFormatter.format(video.views)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-400">{numberFormatter.format(video.subscribers)}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full font-black text-xs border border-purple-500/20">
                            {video.contribution}배↑
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <a href={video.link} target="_blank" rel="noreferrer" className="text-orange-500 hover:text-orange-400">
                            <FiExternalLink size={18} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <div className="py-32 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-3xl text-center">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-600">
              <FiSearch size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-400 mb-2">분석 데이터가 없습니다</h3>
            <p className="text-slate-500">검색어를 입력하고 버튼을 눌러 유튜브 시장의 기회를 찾아보세요.</p>
          </div>
        )}
      </div>

      {/* 사용자 크레딧 사이드바 */}
    </div>
  );
};

export default BenchmarkingPage;
