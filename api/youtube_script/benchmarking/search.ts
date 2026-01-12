import type { VercelRequest, VercelResponse } from "@vercel/node";

const YT_BASE_URL = "https://www.googleapis.com/youtube/v3";
const MAX_RESULTS_PER_PAGE = 50;

function getEnvKey() {
  return process.env.YOUTUBE_API_KEY;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

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
    throw new Error("YouTube API 요청에 실패했습니다.");
  }
  return data;
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

  const apiKey = getEnvKey();
  if (!apiKey) {
    return res.status(500).json({ error: "YOUTUBE_API_KEY가 필요합니다." });
  }

  const body = req.body;
  const query = String(body.query || "").trim();
  if (!query) {
    return res.status(400).json({ error: "검색어를 입력해 주세요." });
  }

  const days = Number(body.days || 7);
  const durationFilter = body.durationFilter || "any";
  const minViews = Number(body.minViews || 10000);
  const maxSubs = Number(body.maxSubs || 10000);
  const maxScan = Math.min(Number(body.maxScan || 100), 500);

  const publishedAfter = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
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

  while (videoIds.length < maxScan) {
    const params = new URLSearchParams({
      key: apiKey,
      part: "id,snippet",
      q: query,
      maxResults: String(MAX_RESULTS_PER_PAGE),
      publishedAfter,
      type: "video",
      order: "relevance"
    });
    if (nextPageToken) {
      params.set("pageToken", nextPageToken);
    }

    const searchUrl = `${YT_BASE_URL}/search?${params.toString()}`;
    const searchData = await fetchJson(searchUrl);
    const items = searchData.items || [];
    collected += items.length;

    for (const item of items) {
      const videoId = item?.id?.videoId;
      if (!videoId || videoMeta[videoId]) continue;
      const title = item?.snippet?.title || "";
      const titleLower = title.toLowerCase();
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
        thumbnail: item?.snippet?.thumbnails?.high?.url || "",
        channelId
      };

      if (videoIds.length >= maxScan) {
        break;
      }
    }

    nextPageToken = searchData.nextPageToken || "";
    if (!nextPageToken || items.length === 0) {
      break;
    }
  }

  if (videoIds.length === 0) {
    return res.json({
      results: [],
      summary: {
        scanned: collected,
        titleFiltered,
        matched: 0
      }
    });
  }

  const uniqueChannelIds = Array.from(new Set(channelIds)).filter(Boolean);
  const channelSubs: Record<string, number> = {};

  for (const chunk of chunkArray(uniqueChannelIds, 50)) {
    const params = new URLSearchParams({
      key: apiKey,
      part: "statistics",
      id: chunk.join(",")
    });
    const channelUrl = `${YT_BASE_URL}/channels?${params.toString()}`;
    const channelData = await fetchJson(channelUrl);
    for (const item of channelData.items || []) {
      channelSubs[item.id] = Number(item?.statistics?.subscriberCount || 0);
    }
  }

  const results: VideoResult[] = [];
  for (const chunk of chunkArray(videoIds, 50)) {
    const params = new URLSearchParams({
      key: apiKey,
      part: "statistics,contentDetails",
      id: chunk.join(",")
    });
    const videoUrl = `${YT_BASE_URL}/videos?${params.toString()}`;
    const videoData = await fetchJson(videoUrl);

    for (const item of videoData.items || []) {
      const videoId = item.id;
      const stats = item.statistics || {};
      const content = item.contentDetails || {};
      const viewCount = Number(stats.viewCount || 0);
      const channelId = videoMeta[videoId]?.channelId || "";
      const subs = Number(channelSubs[channelId] || 0);
      const durationSeconds = parseDurationToSeconds(content.duration);

      let passDuration = false;
      if (durationFilter === "any") {
        passDuration = true;
      } else if (durationFilter === "short" && durationSeconds < 480) {
        passDuration = true;
      } else if (durationFilter === "long" && durationSeconds >= 480) {
        passDuration = true;
      }

      if (!passDuration || viewCount < minViews || subs > maxSubs) {
        continue;
      }

      const contribution = subs > 0 ? Number((viewCount / subs).toFixed(1)) : 0;

      results.push({
        id: videoId,
        title: videoMeta[videoId]?.title || "",
        publishedAt: videoMeta[videoId]?.publishedAt || "",
        channelTitle: videoMeta[videoId]?.channelTitle || "",
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

  results.sort((a, b) => b.contribution - a.contribution);

  return res.json({
    results,
    summary: {
      scanned: collected,
      titleFiltered,
      matched: results.length
    }
  });
}
