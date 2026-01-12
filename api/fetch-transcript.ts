import type { VercelRequest, VercelResponse } from '@vercel/node';
import { YoutubeTranscript } from 'youtube-transcript';

const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:v=|\/v\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const url = (req.body as any)?.url as string;
    if (!url || !url.trim()) {
      res.status(400).send('URL이 필요합니다.');
      return;
    }

    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      res.status(400).send('올바른 유튜브 URL이 아닙니다.');
      return;
    }

    // 전략: 한국어 -> 영어 -> 기본값 순으로 시도
    let transcriptItems = null;
    let usedLanguage = '';

    // 1. 한국어 시도
    try {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'ko',
      });
      usedLanguage = 'ko';
    } catch (e) {
      // 한국어 실패 시 무시하고 다음 단계로
      // console.log('Korean transcript not found, trying English...');
    }

    // 2. 한국어가 없으면 영어 시도
    if (!transcriptItems) {
      try {
        transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: 'en',
        });
        usedLanguage = 'en';
      } catch (e) {
        // 영어도 실패 시 무시
        // console.log('English transcript not found, trying default...');
      }
    }

    // 3. 영어도 없으면 기본값(언어 지정 없이) 시도
    // youtube-transcript는 언어를 지정하지 않으면 가능한 자막 목록을 가져오거나 기본 자막을 가져옴
    // fetchTranscript(videoId)만 호출하면 기본적으로 캡션 트랙 중 하나를 가져옴
    if (!transcriptItems) {
      try {
        // 옵션 없이 호출하면 라이브러리가 알아서 가장 적절한(또는 첫 번째) 자막을 가져옴
        transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
        usedLanguage = 'default';
      } catch (e) {
        console.error('[fetch-transcript] All attempts failed:', e);
        res.status(404).send('이 영상에서 자막을 추출할 수 없습니다. (자막이 없거나 비공개일 수 있습니다)');
        return;
      }
    }

    if (!transcriptItems || transcriptItems.length === 0) {
      res.status(404).send('자막 데이터가 비어 있습니다.');
      return;
    }

    // 텍스트 합치기
    const fullText = transcriptItems
      .map((item) => item.text)
      .join(' ')
      // HTML 엔티티 디코딩 (간단한 처리)
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      // 불필요한 공백 정리
      .replace(/\s+/g, ' ')
      .trim();

    res.status(200).json({ 
      text: fullText,
      language: usedLanguage,
      videoId: videoId
    });

  } catch (error: any) {
    console.error('[fetch-transcript] error:', error);
    res
      .status(500)
      .send(error?.message || '대본을 불러오는 중 오류가 발생했습니다.');
  }
}
