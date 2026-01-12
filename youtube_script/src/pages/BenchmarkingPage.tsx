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
  { label: "최근 30일 (1개월)", days: 30 },
  { label: "최근 60일 (2개월)", days: 60 },
  { label: "최근 90일 (3개월)", days: 90 },
  { label: "최근 180일 (6개월)", days: 180 },
  { label: "최근 365일 (1년)", days: 365 }
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
  const [days, setDays] = useState(dateOptions[3].days); // 1개월 기본값
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
          <p className="text-slate-300 mb-3">
            채널 규모, 조회 속도, 콘텐츠 길이를 함께 분석해 구독자 대비 모멘텀이 높은 영상을 찾아줍니다.
          </p>
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 text-sm text-slate-300">
            <p className="font-semibold text-purple-300 mb-2">💡 이런 영상을 찾을 수 있어요:</p>
            <ul className="space-y-1 ml-4">
              <li>• 구독자 5만인데 조회수 100만 → <span className="text-purple-400 font-bold">20배 모멘텀!</span></li>
              <li>• 구독자는 적지만 조회수 비율이 엄청 높은 영상</li>
              <li>• 성장 전이라 기회가 큰 채널 발굴</li>
              <li>• 제목, 설명, 태그 분석으로 성공 패턴 파악</li>
            </ul>
          </div>
        </div>

        {/* Search Form */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="query" className="block text-sm font-medium mb-2">
                검색 키워드 <span className="text-purple-400">(제목, 설명, 태그에서 검색)</span>
              </label>
              <input
                id="query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="예: 일상 건강, 다이어트 브이로그 등"
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                💡 팁: 구체적인 키워드일수록 정확한 결과를 얻을 수 있습니다
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  업로드 기간 <span className="text-purple-400">(날짜 필터)</span>
                </label>
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
                <p className="text-xs text-slate-400 mt-1">
                  최근 업로드된 영상만 검색합니다
                </p>
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
                <label className="block text-sm font-medium mb-2">
                  최소 조회수 <span className="text-purple-400">(필터)</span>
                </label>
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
                <p className="text-xs text-slate-400 mt-1">
                  이 조회수 이상인 영상만 표시
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  최대 구독자 수 <span className="text-purple-400">(중요!)</span>
                </label>
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
                <p className="text-xs text-slate-400 mt-1">
                  작은 채널에서 높은 조회수 = 기회!
                </p>
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
                <p className="text-xs text-slate-400 mt-1">
                  더 많이 스캔할수록 정확합니다
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition text-lg"
            >
              {loading ? "🔍 유튜브 스캔 중... (잠시만 기다려주세요)" : "🚀 모멘텀 스캔 실행"}
            </button>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">❌ {error}</p>
              </div>
            )}
            
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 text-xs text-slate-300">
              <p className="font-semibold text-blue-300 mb-1">📊 분석 기준:</p>
              <p>구독자 대비 조회수 비율이 높을수록 모멘텀이 높습니다. 예: 구독자 5만 / 조회수 100만 = 20배 모멘텀!</p>
            </div>
          </form>
        </div>

        {/* Summary Section */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-2">📊 모멘텀 분석 결과</h2>
          <p className="text-slate-300 mb-4">
            구독자 대비 조회수 비율로 영상을 정렬합니다. 조건을 조정해 유의미한 니치를 찾으세요.
          </p>
          
          {summary ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border-l-4 border-blue-500">
                  <h3 className="text-3xl font-bold text-blue-400">
                    {numberFormatter.format(summary.scanned || 0)}
                  </h3>
                  <span className="text-sm text-slate-400">스캔한 영상</span>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border-l-4 border-green-500">
                  <h3 className="text-3xl font-bold text-green-400">
                    {numberFormatter.format(summary.titleFiltered || 0)}
                  </h3>
                  <span className="text-sm text-slate-400">제목 매칭</span>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border-l-4 border-purple-500">
                  <h3 className="text-3xl font-bold text-purple-400">
                    {numberFormatter.format(summary.matched || 0)}
                  </h3>
                  <span className="text-sm text-slate-400">최종 결과 수</span>
                </div>
              </div>
              {summary.matched > 0 && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-sm text-green-300">
                  ✅ {summary.matched}개의 높은 모멘텀 영상을 찾았습니다! 아래 결과를 확인하세요.
                </div>
              )}
            </>
          ) : (
            <div className="bg-slate-800/50 rounded-lg p-6 text-center">
              <h3 className="text-xl font-bold text-slate-400 mb-2">🎯 준비 완료</h3>
              <span className="text-sm text-slate-500">검색 조건을 설정하고 스캔을 시작하세요.</span>
            </div>
          )}
        </div>

        {/* Highlight Video */}
        {highlight && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold">🏆 최고 모멘텀 영상</h2>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold">
                TOP 1
              </span>
            </div>
            <div className="bg-gradient-to-r from-purple-900/30 to-slate-900/50 border-2 border-purple-500/50 rounded-xl p-6 flex flex-col md:flex-row gap-6">
              <img
                src={highlight.thumbnail}
                alt={highlight.title}
                className="w-full md:w-80 h-auto rounded-lg shadow-lg"
              />
              <div className="flex-1">
                <h4 className="text-xl font-bold mb-2 text-white">{highlight.title}</h4>
                <p className="text-slate-400 mb-4 flex items-center gap-2">
                  📺 {highlight.channelTitle}
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-800/70 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">조회수</div>
                    <div className="text-lg font-bold text-green-400">
                      {numberFormatter.format(highlight.views)}
                    </div>
                  </div>
                  <div className="bg-slate-800/70 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">구독자</div>
                    <div className="text-lg font-bold text-slate-300">
                      {numberFormatter.format(highlight.subscribers)}
                    </div>
                  </div>
                  <div className="bg-slate-800/70 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">영상 길이</div>
                    <div className="text-lg font-bold text-slate-300">
                      {highlight.durationLabel}
                    </div>
                  </div>
                  <div className="bg-purple-900/50 border border-purple-500/50 rounded-lg p-3">
                    <div className="text-xs text-purple-300 mb-1">모멘텀 배수</div>
                    <div className="text-2xl font-bold text-purple-400">
                      {highlight.contribution}배 🚀
                    </div>
                  </div>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 mb-4 text-sm text-slate-300">
                  <p className="font-semibold text-purple-300 mb-1">💡 왜 이 영상이 1위?</p>
                  <p>구독자 {numberFormatter.format(highlight.subscribers)}명인데 조회수 {numberFormatter.format(highlight.views)}회! 구독자 1명당 {highlight.contribution}배 이상의 조회수를 기록했습니다.</p>
                </div>
                <a
                  href={highlight.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition shadow-lg"
                >
                  🎬 유튜브에서 보기 →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">📋 전체 결과 ({results.length}개)</h2>
              <div className="text-sm text-slate-400">
                구독자 대비 조회수 비율 높은 순
              </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-purple-300">순위</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">제목</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">채널</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">길이</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-300">조회수</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">구독자</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-purple-300">모멘텀</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">링크</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {results.map((video, index) => (
                      <tr key={video.id} className="hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3 text-sm font-bold text-purple-400">
                          #{index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm max-w-md">
                          <div className="line-clamp-2" title={video.title}>
                            {video.title}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">{video.channelTitle}</td>
                        <td className="px-4 py-3 text-sm text-slate-400">{video.durationLabel}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-400">
                          {numberFormatter.format(video.views)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {numberFormatter.format(video.subscribers)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full font-bold text-xs">
                            {video.contribution}배 🚀
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <a
                            href={video.link}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs font-semibold transition inline-block"
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
            <div className="mt-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 text-sm text-slate-300">
              <p className="font-semibold text-blue-300 mb-2">💡 결과 활용 팁:</p>
              <ul className="space-y-1 ml-4">
                <li>• 높은 모멘텀 영상의 제목, 썸네일 패턴을 분석하세요</li>
                <li>• 작은 채널이 높은 조회수를 기록한 이유를 찾아보세요</li>
                <li>• 비슷한 컨셉으로 영상을 만들면 성공 확률이 높습니다</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BenchmarkingPage;
