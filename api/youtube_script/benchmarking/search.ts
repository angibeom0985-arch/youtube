import type { VercelRequest, VercelResponse } from "@vercel/node";

const YT_BASE_URL = "https://www.googleapis.com/youtube/v3";
const MAX_RESULTS_PER_PAGE = 50;

function parseDurationToSeconds(isoDuration: string): number {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(isoDuration || "");
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  const hours = Math.floor(mins / 60);
  const minsR = mins % 60;
  if (hours > 0) {
    return `${hours}:${String(minsR).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.error?.message || "YouTube API 요청에 실패했습니다.";
    throw new Error(errorMsg);
  }
  return data;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

interface VideoMeta {
  title: string;
  publishedAt: string;
  channelTitle: string;
  thumbnail: string;
  channelId: string;
}

interface VideoResult {
  id: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  channelTitle: string;
  thumbnail: string;
  durationSeconds: number;
  durationLabel: string;
  views: number;
  subscribers: number;
  contribution: number;
  link: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body;
  
  // 클라이언트에서 전달한 API 키 우선 사용, 없으면 환경변수 사용
  const apiKey = (body.apiKey || "").trim() || process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    return res.status(400).json({ error: "YouTube API 키가 설정되지 않았습니다. 설정에서 입력해 주세요." });
  }

  const query = String(body.query || "").trim();
  if (!query) {
    return res.status(400).json({ error: "검색어를 입력해 주세요." });
  }

  const days = Number(body.days || 3650); // 0이면 전체 기간 (약 10년)
  const durationFilter = body.durationFilter || "any"; // any, short, long
  const minViews = Number(body.minViews || 0);
  const maxSubs = Number(body.maxSubs || 999999999);
  const maxScan = Math.min(Number(body.maxScan || 50), 500);

  // 날짜 필터 설정
  let publishedAfter: string | undefined;
  if (days > 0) {
    publishedAfter = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }

  const keywords = query
    .replace(/,/g, " ")
    .split(" ")
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);

  const videoIds: string[] = [];
  const channelIds: string[] = [];
  const videoMeta: Record<string, VideoMeta> = {};
  let nextPageToken = "";
  let collected = 0;
  let titleFiltered = 0;

  try {
    while (videoIds.length < maxScan) {
      const searchParams = new URLSearchParams({
        key: apiKey,
        part: "id,snippet",
        q: query,
        maxResults: String(MAX_RESULTS_PER_PAGE),
        type: "video",
        order: "relevance"
      });
      
      if (publishedAfter) {
        searchParams.set("publishedAfter", publishedAfter);
      }
      
      if (nextPageToken) {
        searchParams.set("pageToken", nextPageToken);
      }

      const searchUrl = `${YT_BASE_URL}/search?${searchParams.toString()}`;
      const searchData = await fetchJson(searchUrl);
      const items = searchData.items || [];
      collected += items.length;

      for (const item of items) {
        const videoId = item?.id?.videoId;
        if (!videoId || videoMeta[videoId]) continue;
        
        const title = item?.snippet?.title || "";
        const titleLower = title.toLowerCase();
        
        // 키워드 매칭 (제목 기반 필터링은 선택사항이나 정확도를 위해 유지)
        const matches = keywords.length === 0 || keywords.some((word) => titleLower.includes(word));
        if (!matches) continue;

        const channelId = item?.snippet?.channelId || "";
        videoIds.push(videoId);
        channelIds.push(channelId);
        titleFiltered += 1;

        videoMeta[videoId] = {
          title,
          publishedAt: item?.snippet?.publishedAt,
          channelTitle: item?.snippet?.channelTitle,
          thumbnail: item?.snippet?.thumbnails?.high?.url || item?.snippet?.thumbnails?.medium?.url || "",
          channelId
        };

        if (videoIds.length >= maxScan) break;
      }

      nextPageToken = searchData.nextPageToken || "";
      if (!nextPageToken || items.length === 0) break;
    }

    if (videoIds.length === 0) {
      return res.json({
        results: [],
        summary: { scanned: collected, titleFiltered, matched: 0 }
      });
    }

    // 채널 정보 가져오기 (구독자 수)
    const uniqueChannelIds = Array.from(new Set(channelIds)).filter(Boolean);
    const channelSubs: Record<string, number> = {};

    for (const chunk of chunkArray(uniqueChannelIds, 50)) {
      const channelParams = new URLSearchParams({
        key: apiKey,
        part: "statistics",
        id: chunk.join(",")
      });
      const channelUrl = `${YT_BASE_URL}/channels?${channelParams.toString()}`;
      const channelData = await fetchJson(channelUrl);
      for (const item of channelData.items || []) {
        channelSubs[item.id] = Number(item?.statistics?.subscriberCount || 0);
      }
    }

    // 영상 상세 정보 가져오기 (재생 시간, 태그, 설명, 조회수)
    const results: VideoResult[] = [];
    for (const chunk of chunkArray(videoIds, 50)) {
      const videoParams = new URLSearchParams({
        key: apiKey,
        part: "statistics,contentDetails,snippet",
        id: chunk.join(",")
      });
      const videoUrl = `${YT_BASE_URL}/videos?${videoParams.toString()}`;
      const videoData = await fetchJson(videoUrl);

      for (const item of videoData.items || []) {
        const videoId = item.id;
        const stats = item.statistics || {};
        const content = item.contentDetails || {};
        const snippet = item.snippet || {};
        
        const viewCount = Number(stats.viewCount || 0);
        const channelId = videoMeta[videoId]?.channelId || "";
        const subs = Number(channelSubs[channelId] || 0);
        const durationSeconds = parseDurationToSeconds(content.duration);

        // 기간 필터 (숏폼: 1분 미만 / 롱폼: 1분 이상)
        let passDuration = true;
        if (durationFilter === "short") {
          passDuration = durationSeconds < 60;
        } else if (durationFilter === "long") {
          passDuration = durationSeconds >= 60;
        }

        // 기본 필터링 (조회수, 구독자)
        if (!passDuration || viewCount < minViews || subs > maxSubs) continue;

        // 기여도(모멘텀) 계산: 구독자 대비 조회수 배수
        const contribution = subs > 0 ? Number((viewCount / subs).toFixed(2)) : viewCount > 0 ? 999 : 0;

        results.push({
          id: videoId,
          title: snippet.title || videoMeta[videoId]?.title || "",
          description: snippet.description || "",
          tags: snippet.tags || [],
          publishedAt: snippet.publishedAt || videoMeta[videoId]?.publishedAt || "",
          channelTitle: snippet.channelTitle || videoMeta[videoId]?.channelTitle || "",
          thumbnail: videoMeta[videoId]?.thumbnail || "",
          durationSeconds,
          durationLabel: formatDuration(durationSeconds),
          views: viewCount,
          subscribers: subs,
          contribution,
          link: `https://www.youtube.com/watch?v=${videoId}`
        });
      }
    }

    // 기본 정렬: 모멘텀(기여도) 높은 순
    results.sort((a, b) => b.contribution - a.contribution);

    return res.json({
      results,
      summary: {
        scanned: collected,
        titleFiltered,
        matched: results.length
      }
    });

  } catch (error: any) {
    console.error("[Search API Error]:", error);
    return res.status(500).json({ error: error.message || "영상 검색 중 오류가 발생했습니다." });
  }
}