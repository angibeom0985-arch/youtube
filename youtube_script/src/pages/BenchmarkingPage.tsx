import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";

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
  channelTitle: string;
  thumbnail: string;
  views: number;
  subscribers: number;
  durationLabel: string;
  contribution: number;
  link: string;
}

interface SearchSummary {
  scanned: number;
  titleFiltered: number;
  matched: number;
}

const dateOptions: DateOption[] = [
  { label: "최근 24시간", days: 1 },
  { label: "최근 3일", days: 3 },
  { label: "최근 7일", days: 7 },
  { label: "최근 30일", days: 30 },
  { label: "최근 90일", days: 90 }
];

const durationOptions: DurationOption[] = [
  { label: "길이 제한 없음", value: "any" },
  { label: "8분 미만", value: "short" },
  { label: "8분 이상", value: "long" }
];

const viewOptions = [5000, 10000, 30000, 50000, 100000, 500000, 1000000];
const subOptions = [1000, 3000, 5000, 10000, 50000, 100000, 500000];
const scanOptions = [50, 100, 150, 200, 300, 400, 500];

const numberFormatter = new Intl.NumberFormat("ko-KR");

const BenchmarkingPage: React.FC = () => {
  const [query, setQuery] = useState("일상 건강");
  const [days, setDays] = useState(dateOptions[2].days);
  const [durationFilter, setDurationFilter] = useState(durationOptions[0].value);
  const [minViews, setMinViews] = useState(viewOptions[1]);
  const [maxSubs, setMaxSubs] = useState(subOptions[3]);
  const [maxScan, setMaxScan] = useState(scanOptions[1]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<SearchSummary | null>(null);
  const [results, setResults] = useState<VideoResult[]>([]);

  const highlight = useMemo(() => {
    if (!results.length) return null;
    return results[0];
  }, [results]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/benchmarking/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          days,
          durationFilter,
          minViews,
          maxSubs,
          maxScan
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "검색에 실패했습니다.");
      }

      setResults(data.results || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError((err as Error).message || "검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-4">
            ← 홈으로 돌아가기
          </Link>
          <div className="inline-block px-3 py-1 text-xs font-semibold bg-purple-500/20 text-purple-300 rounded-full mb-4">
            모멘텀 헌터
          </div>
          <h1 className="text-4xl font-bold mb-2">잠재력 높은 유튜브 영상을 빠르게 찾으세요.</h1>
          <p className="text-slate-300">
            채널 규모, 조회 속도, 콘텐츠 길이를 함께 분석해 구독자 대비 모멘텀이 높은 영상을 찾아줍니다.
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="query" className="block text-sm font-medium mb-2">
                검색 키워드
              </label>
              <input
                id="query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="예: 일상 건강"
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">업로드 기간</label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {dateOptions.map((option) => (
                    <option key={option.days} value={option.days}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">영상 길이</label>
                <select
                  value={durationFilter}
                  onChange={(e) => setDurationFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {durationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">최소 조회수</label>
                <select
                  value={minViews}
                  onChange={(e) => setMinViews(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {viewOptions.map((value) => (
                    <option key={value} value={value}>
                      {numberFormatter.format(value)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">최대 구독자 수</label>
                <select
                  value={maxSubs}
                  onChange={(e) => setMaxSubs(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {subOptions.map((value) => (
                    <option key={value} value={value}>
                      {numberFormatter.format(value)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">최대 스캔 수</label>
                <select
                  value={maxScan}
                  onChange={(e) => setMaxScan(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {scanOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}개 영상
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition"
            >
              {loading ? "유튜브 스캔 중..." : "모멘텀 스캔 실행"}
            </button>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
          </form>
        </div>

        {/* Summary Section */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-2">모멘텀 신호</h2>
          <p className="text-slate-300 mb-4">
            조회수 대비 구독자 비율로 영상을 정렬하고, 길이와 업로드 기간을 함께 걸러냅니다.
          </p>
          
          {summary ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-3xl font-bold text-purple-400">
                  {numberFormatter.format(summary.scanned || 0)}
                </h3>
                <span className="text-sm text-slate-400">스캔한 영상</span>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-3xl font-bold text-purple-400">
                  {numberFormatter.format(summary.titleFiltered || 0)}
                </h3>
                <span className="text-sm text-slate-400">제목 매칭</span>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-3xl font-bold text-purple-400">
                  {numberFormatter.format(summary.matched || 0)}
                </h3>
                <span className="text-sm text-slate-400">결과 수</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <h3 className="text-xl font-bold text-slate-400">준비 완료</h3>
              <span className="text-sm text-slate-500">검색을 시작해 주세요.</span>
            </div>
          )}
        </div>

        {/* Highlight Video */}
        {highlight && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">최고 모멘텀 영상</h2>
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 flex flex-col md:flex-row gap-6">
              <img
                src={highlight.thumbnail}
                alt={highlight.title}
                className="w-full md:w-80 h-auto rounded-lg"
              />
              <div className="flex-1">
                <h4 className="text-xl font-bold mb-2">{highlight.title}</h4>
                <p className="text-slate-400 mb-4">{highlight.channelTitle}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                    {numberFormatter.format(highlight.views)} 조회수
                  </span>
                  <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                    {numberFormatter.format(highlight.subscribers)} 구독자
                  </span>
                  <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                    {highlight.durationLabel}
                  </span>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-bold">
                    {highlight.contribution}배 모멘텀
                  </span>
                </div>
                <a
                  href={highlight.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
                >
                  유튜브에서 보기 →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">전체 결과</h2>
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">제목</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">채널</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">길이</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">조회수</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">구독자</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">모멘텀</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">링크</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {results.map((video) => (
                      <tr key={video.id} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-sm">{video.title}</td>
                        <td className="px-4 py-3 text-sm">{video.channelTitle}</td>
                        <td className="px-4 py-3 text-sm">{video.durationLabel}</td>
                        <td className="px-4 py-3 text-sm">{numberFormatter.format(video.views)}</td>
                        <td className="px-4 py-3 text-sm">{numberFormatter.format(video.subscribers)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-purple-400">{video.contribution}배</td>
                        <td className="px-4 py-3 text-sm">
                          <a
                            href={video.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-400 hover:text-purple-300 underline"
                          >
                            보기
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BenchmarkingPage;
