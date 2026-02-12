import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAndDeductCredits, CREDIT_COSTS } from "../../../shared/creditService.js";

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
    const errorMsg = data?.error?.message || "YouTube API ?”ì²­???¤íŒ¨?ˆìŠµ?ˆë‹¤.";
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

  // ?´ë¼?´ì–¸?¸ì—???„ë‹¬??API ???°ì„  ?¬ìš©, ?†ìœ¼ë©??˜ê²½ë³€???¬ìš©
  const apiKey = (body.apiKey || "").trim() || process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: "YouTube API ?¤ê? ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ?? ?¤ì •?ì„œ ?…ë ¥??ì£¼ì„¸??" });
  }

  const query = String(body.query || "").trim();
  if (!query) {
    return res.status(400).json({ error: "ê²€?‰ì–´ë¥??…ë ¥??ì£¼ì„¸??" });
  }

  const creditResult = await checkAndDeductCredits(req, res, CREDIT_COSTS.SEARCH);
  if (!creditResult.allowed) {
    return res.status(creditResult.status || 402).json({
      message: creditResult.message || "Credits required",
      error: "credit_limit",
      currentCredits: creditResult.currentCredits,
    });
  }

  const days = Number(body.days || 3650); // 0?´ë©´ ?„ì²´ ê¸°ê°„ (??10??
  const durationFilter = body.durationFilter || "any"; // any, short, long
  const minViews = Number(body.minViews || 0);
  const maxSubs = Number(body.maxSubs || 999999999);
  const maxScan = Math.min(Number(body.maxScan || 50), 500);

  // ? ì§œ ?„í„° ?¤ì •
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
        order: "relevance",
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

        // ?¤ì›Œ??ë§¤ì¹­ (?œëª© ê¸°ë°˜ ?„í„°ë§ì? ? íƒ?¬í•­?´ë‚˜ ?•í™•?„ë? ?„í•´ ? ì?)
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
          channelId,
        };

        if (videoIds.length >= maxScan) break;
      }

      nextPageToken = searchData.nextPageToken || "";
      if (!nextPageToken || items.length === 0) break;
    }

    if (videoIds.length === 0) {
      return res.json({
        results: [],
        summary: { scanned: collected, titleFiltered, matched: 0 },
      });
    }

    // ì±„ë„ ?•ë³´ ê°€?¸ì˜¤ê¸?(êµ¬ë…??
    const uniqueChannelIds = Array.from(new Set(channelIds)).filter(Boolean);
    const channelSubs: Record<string, number> = {};

    for (const chunk of chunkArray(uniqueChannelIds, 50)) {
      const channelParams = new URLSearchParams({
        key: apiKey,
        part: "statistics",
        id: chunk.join(","),
      });
      const channelUrl = `${YT_BASE_URL}/channels?${channelParams.toString()}`;
      const channelData = await fetchJson(channelUrl);
      for (const item of channelData.items || []) {
        channelSubs[item.id] = Number(item?.statistics?.subscriberCount || 0);
      }
    }

    // ?ìƒ ?ì„¸ ?•ë³´ ê°€?¸ì˜¤ê¸?(?¬ìƒ ?œê°„, ?œê·¸, ?¤ëª…, ì¡°íšŒ??
    const results: VideoResult[] = [];
    for (const chunk of chunkArray(videoIds, 50)) {
      const videoParams = new URLSearchParams({
        key: apiKey,
        part: "statistics,contentDetails,snippet",
        id: chunk.join(","),
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

        // ê¸°ê°„ ?„í„° (?í¼: 1ë¶?ë¯¸ë§Œ / ë¡±í¼: 1ë¶??´ìƒ)
        let passDuration = true;
        if (durationFilter === "short") {
          passDuration = durationSeconds < 60;
        } else if (durationFilter === "long") {
          passDuration = durationSeconds >= 60;
        }

        // ê¸°ë³¸ ?„í„°ë§?(ì¡°íšŒ?? êµ¬ë…??
        if (!passDuration || viewCount < minViews || subs > maxSubs) continue;

        // ê¸°ì—¬??ëª¨ë©˜?€) ê³„ì‚°: êµ¬ë…???€ë¹?ì¡°íšŒ??ë°°ìˆ˜
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
          link: `https://www.youtube.com/watch?v=${videoId}`,
        });
      }
    }

    // ê¸°ë³¸ ?•ë ¬: ëª¨ë©˜?€(ê¸°ì—¬?? ?’ì? ??
    results.sort((a, b) => b.contribution - a.contribution);

    return res.json({
      results,
      summary: {
        scanned: collected,
        titleFiltered,
        matched: results.length,
      },
    });
  } catch (error: any) {
    console.error("[Search API Error]:", error);
    return res.status(500).json({ error: error.message || "?ìƒ ê²€??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤." });
  }
}
