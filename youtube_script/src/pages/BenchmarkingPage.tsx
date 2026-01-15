import React, { useState, useMemo, useEffect } from "react";
import { FiLayout, FiList, FiDownload, FiExternalLink, FiSearch } from "react-icons/fi";
import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";
import UserCreditToolbar from "../components/UserCreditToolbar";
import HomeBackButton from "../components/HomeBackButton";

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
  { label: "1媛쒖썡", days: 30 },
  { label: "2媛쒖썡", days: 60 },
  { label: "6媛쒖썡", days: 180 },
  { label: "1??, days: 365 },
  { label: "?꾩껜 湲곌컙", days: 0 }
];

const durationOptions: DurationOption[] = [
  { label: "?꾩껜", value: "any" },
  { label: "?륂뤌", value: "short" },
  { label: "濡깊뤌", value: "long" }
];

const momentumOptions = [
  { level: 1, label: "1?④퀎 (??쓬)", min: 0, max: 0.2 },
  { level: 2, label: "2?④퀎 (?깆옣 以?", min: 0.2, max: 0.5 },
  { level: 3, label: "3?④퀎 (1:1 洹좏삎)", min: 0.5, max: 1.5 },
  { level: 4, label: "4?④퀎 (?믪? 紐⑤찘?)", min: 1.5, max: 5.0 },
  { level: 5, label: "5?④퀎 (??컻???깃낵)", min: 5.0, max: 99999 }
];

const numberFormatter = new Intl.NumberFormat("ko-KR");

const BenchmarkingPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState("?쇱긽 嫄닿컯");
  const [days, setDays] = useState(dateOptions[0].days);
  const [durationFilter, setDurationFilter] = useState(durationOptions[0].value);
  const [momentumLevel, setMomentumLevel] = useState(0); // 0?대㈃ ?꾩껜
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<SearchSummary | null>(null);
  const [results, setResults] = useState<VideoResult[]>([]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ?대씪?댁뼵??痢??꾪꽣留??곸슜 (紐⑤찘? ?덈꺼 ??
  const filteredResults = useMemo(() => {
    if (momentumLevel === 0) return results;
    const option = momentumOptions.find(o => o.level === momentumLevel);
    if (!option) return results;
    return results.filter(v => v.contribution >= option.min && v.contribution < option.max);
  }, [results, momentumLevel]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch("/api/benchmarking/search", {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          days,
          durationFilter,
          maxScan: 100 // 理쒕? 100媛??ㅼ틪
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "寃?됱뿉 ?ㅽ뙣?덉뒿?덈떎.");
      }

        setResults(data.results || []);
        setSummary(data.summary || null);
        window.dispatchEvent(new Event("creditRefresh"));
    } catch (err) {
      setError((err as Error).message || "寃?됱뿉 ?ㅽ뙣?덉뒿?덈떎.");
    } finally {
      setLoading(false);
    }
  }

  // ?묒?(CSV) ???湲곕뒫 (?쒓? 源⑥쭚 諛⑹? BOM 異붽?)
  const exportToExcel = () => {
    if (filteredResults.length === 0) return;

    const headers = ["?쒖쐞", "?쒕ぉ", "梨꾨꼸紐?, "援щ룆??, "議고쉶??, "紐⑤찘?", "湲몄씠", "?낅줈?쒖씪", "留곹겕", "?쒓렇", "?ㅻ챸"];
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
    
    // UTF-8 BOM 異붽? (\ufeff)
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `?좏뒠釉?紐⑤찘?_遺꾩꽍_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">

      <div className="mx-auto max-w-[1600px] px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <HomeBackButton tone="purple" className="mb-2" />
            <h1 className="text-4xl font-black bg-gradient-to-r from-white via-purple-200 to-purple-500 bg-clip-text text-transparent">
              踰ㅼ튂留덊궧 ?곸긽 諛쒓뎬
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center justify-end gap-3">
            <UserCreditToolbar user={user} onLogout={handleLogout} tone="purple" />
            
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
                    寃???ㅼ썙??
                  </label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="遺꾩꽍???ㅼ썙?쒕? ?낅젰?섏꽭??(?? ?ы뀒???명븯??"
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
                    <label className="block text-sm font-bold text-slate-200 mb-3">?낅줈??湲곌컙</label>
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
                    <label className="block text-sm font-bold text-slate-200 mb-3">?곸긽 ?좏삎</label>
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
                  ?뮕 踰ㅼ튂留덊궧 ?섏튂??
                </h3>
                <div className="space-y-4 text-sm text-slate-300">
                  <p className="leading-relaxed">
                    援щ룆?????鍮?議고쉶?섍? ?쇰쭏???믪?吏瑜?痢≪젙?섏뿬 踰ㅼ튂留덊궧 ?⑥쑉??怨꾩궛?⑸땲?? <br />
                    <span className="text-white font-bold">1:1 鍮꾩쑉(1諛?</span>???됯퇏?곸씤 ?깃낵?쇰㈃, <br />
                    <span className="text-purple-400 font-bold">10諛??댁긽???섏튂</span>????컻?곸씤 ?좎옱?μ쓣 ?섎??⑸땲??
                  </p>
                  <div className="p-3 bg-black/40 rounded-lg border border-purple-500/10">
                    <p className="text-xs text-slate-400">湲곗?: 援щ룆??1留?/ 議고쉶??10留?= 10諛??⑥쑉</p>
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
                  ?좏뒠釉??붿쭊 遺꾩꽍 以?..
                </span>
              ) : (
                <>
                  <span>踰ㅼ튂留덊궧 ?곸긽 寃??/span>
                  <span className="bg-white/20 text-white text-sm px-2 py-1 rounded-full font-bold">5 ??/span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Filters & Actions bar */}
        {results.length > 0 && (
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <div className="w-full lg:w-auto">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">紐⑤찘? 諛곗닔 ?꾪꽣</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setMomentumLevel(0)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${momentumLevel === 0 ? 'bg-white text-black' : 'bg-slate-800 text-slate-400'}`}
                >
                  ?꾩껜
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
                <span className="text-slate-400 text-sm">諛쒓껄??湲고쉶</span>
                <p className="text-2xl font-black text-purple-400">{filteredResults.length}嫄?/p>
              </div>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg"
              >
                <FiDownload />
                ?묒? ???
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-orange-900/20 border-2 border-orange-500/30 rounded-xl p-6 mb-10 text-center">
            <p className="text-orange-400 font-bold">??{error}</p>
          </div>
        )}

        {/* Content Section */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-6"></div>
            <p className="text-slate-400 animate-pulse text-lg">YouTube ?곗씠?곕? ?ъ링 遺꾩꽍?섍퀬 ?덉뒿?덈떎...</p>
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
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">議고쉶??/p>
                        <p className="text-green-400 font-black">{numberFormatter.format(video.views)}</p>
                      </div>
                      <div className="bg-black/40 rounded-xl p-3 border border-slate-800">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">援щ룆??/p>
                        <p className="text-slate-300 font-black">{numberFormatter.format(video.subscribers)}</p>
                      </div>
                    </div>

                    <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-purple-300">紐⑤찘?</span>
                        <span className="text-xl font-black text-purple-400">{video.contribution}諛???</span>
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
                      ?곸긽 ?먯꽭??蹂닿린
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
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase w-20">?쒖쐞</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase min-w-[300px] resize-x overflow-auto">?곸긽 ?쒕ぉ</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase min-w-[150px] resize-x overflow-auto">梨꾨꼸</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase w-24">湲몄씠</th>
                      <th className="px-6 py-4 text-xs font-bold text-green-400 uppercase w-32">議고쉶??/th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase w-32">援щ룆??/th>
                      <th className="px-6 py-4 text-xs font-bold text-purple-400 uppercase w-32">紐⑤찘?</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase w-24">留곹겕</th>
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
                            {video.contribution}諛?
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
            <h3 className="text-xl font-bold text-slate-400 mb-2">遺꾩꽍 ?곗씠?곌? ?놁뒿?덈떎</h3>
            <p className="text-slate-500">寃?됱뼱瑜??낅젰?섍퀬 踰꾪듉???뚮윭 ?좏뒠釉??쒖옣??湲고쉶瑜?李얠븘蹂댁꽭??</p>
          </div>
        )}
      </div>

      {/* ?ъ슜???щ젅???ъ씠?쒕컮 */}
    </div>
  );
};

export default BenchmarkingPage;







