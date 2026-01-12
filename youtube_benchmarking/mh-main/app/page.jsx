"use client";

import { useMemo, useState } from "react";

const dateOptions = [
  { label: "최근 24시간", days: 1 },
  { label: "최근 3일", days: 3 },
  { label: "최근 7일", days: 7 },
  { label: "최근 30일", days: 30 },
  { label: "최근 90일", days: 90 }
];

const durationOptions = [
  { label: "길이 제한 없음", value: "any" },
  { label: "8분 미만", value: "short" },
  { label: "8분 이상", value: "long" }
];

const viewOptions = [5000, 10000, 30000, 50000, 100000, 500000, 1000000];
const subOptions = [1000, 3000, 5000, 10000, 50000, 100000, 500000];
const scanOptions = [50, 100, 150, 200, 300, 400, 500];

const numberFormatter = new Intl.NumberFormat("ko-KR");

export default function Home() {
  const [query, setQuery] = useState("일상 건강");
  const [days, setDays] = useState(dateOptions[2].days);
  const [durationFilter, setDurationFilter] = useState(durationOptions[0].value);
  const [minViews, setMinViews] = useState(viewOptions[1]);
  const [maxSubs, setMaxSubs] = useState(subOptions[3]);
  const [maxScan, setMaxScan] = useState(scanOptions[1]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [results, setResults] = useState([]);

  const highlight = useMemo(() => {
    if (!results.length) return null;
    return results[0];
  }, [results]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/search", {
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
      setError(err.message || "검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <section className="hero">
        <div>
          <div className="hero-badge">모멘텀 헌터</div>
          <h1>잠재력 높은 유튜브 영상을 빠르게 찾으세요.</h1>
          <p>
            채널 규모, 조회 속도, 콘텐츠 길이를 함께 분석해 구독자 대비
            모멘텀이 높은 영상을 찾아줍니다.
          </p>
        </div>
        <div className="panel">
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="query">검색 키워드</label>
              <input
                id="query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="예: 일상 건강"
                required
              />
            </div>
            <div className="input-row">
              <div>
                <label>업로드 기간</label>
                <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
                  {dateOptions.map((option) => (
                    <option key={option.days} value={option.days}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>영상 길이</label>
                <select
                  value={durationFilter}
                  onChange={(event) => setDurationFilter(event.target.value)}
                >
                  {durationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="input-row">
              <div>
                <label>최소 조회수</label>
                <select value={minViews} onChange={(event) => setMinViews(Number(event.target.value))}>
                  {viewOptions.map((value) => (
                    <option key={value} value={value}>
                      {numberFormatter.format(value)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>최대 구독자 수</label>
                <select value={maxSubs} onChange={(event) => setMaxSubs(Number(event.target.value))}>
                  {subOptions.map((value) => (
                    <option key={value} value={value}>
                      {numberFormatter.format(value)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>최대 스캔 수</label>
                <select value={maxScan} onChange={(event) => setMaxScan(Number(event.target.value))}>
                  {scanOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}개 영상
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" disabled={loading}>
              {loading ? "유튜브 스캔 중..." : "모멘텀 스캔 실행"}
            </button>
            {error ? <p className="loading">{error}</p> : null}
          </form>
        </div>
      </section>

      <section className="panel">
        <h2>모멘텀 신호</h2>
        <p>
          조회수 대비 구독자 비율로 영상을 정렬하고, 길이와 업로드 기간을
          함께 걸러냅니다. 조건을 조정해 유의미한 니치를 찾으세요.
        </p>
        {summary ? (
          <div className="summary">
            <div className="summary-card">
              <h3>{numberFormatter.format(summary.scanned || 0)}</h3>
              <span>스캔한 영상</span>
            </div>
            <div className="summary-card">
              <h3>{numberFormatter.format(summary.titleFiltered || 0)}</h3>
              <span>제목 매칭</span>
            </div>
            <div className="summary-card">
              <h3>{numberFormatter.format(summary.matched || 0)}</h3>
              <span>결과 수</span>
            </div>
          </div>
        ) : (
          <div className="summary">
            <div className="summary-card loading">
              <h3>준비 완료</h3>
              <span>검색을 시작해 주세요.</span>
            </div>
          </div>
        )}
      </section>

      {highlight ? (
        <section className="results">
          <h2>최고 모멘텀 영상</h2>
          <article className="result-row">
            <img src={highlight.thumbnail} alt={highlight.title} />
            <div className="result-meta">
              <h4>{highlight.title}</h4>
              <p>{highlight.channelTitle}</p>
              <div className="badge-row">
                <span className="badge good">{numberFormatter.format(highlight.views)} 조회수</span>
                <span className="badge">{numberFormatter.format(highlight.subscribers)} 구독자</span>
                <span className="badge">{highlight.durationLabel}</span>
                <span className="badge good">{highlight.contribution}배 모멘텀</span>
              </div>
              <a href={highlight.link} target="_blank" rel="noreferrer">
                유튜브에서 보기
              </a>
            </div>
          </article>
        </section>
      ) : null}

      {results.length ? (
        <section className="results">
          <h2>전체 결과</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>제목</th>
                  <th>채널</th>
                  <th>길이</th>
                  <th>조회수</th>
                  <th>구독자</th>
                  <th>모멘텀</th>
                  <th>링크</th>
                </tr>
              </thead>
              <tbody>
                {results.map((video) => (
                  <tr key={video.id}>
                    <td>{video.title}</td>
                    <td>{video.channelTitle}</td>
                    <td>{video.durationLabel}</td>
                    <td>{numberFormatter.format(video.views)}</td>
                    <td>{numberFormatter.format(video.subscribers)}</td>
                    <td>{video.contribution}배</td>
                    <td>
                      <a href={video.link} target="_blank" rel="noreferrer">
                        보기
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
