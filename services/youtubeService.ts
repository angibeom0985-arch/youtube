
export interface VideoDetails {
  title: string;
  thumbnailUrl: string;
}

export const getVideoDetails = async (url: string): Promise<VideoDetails> => {
  // YouTube's oEmbed endpoint is public and can be used for this.
  // It doesn't require an API key for basic info like title and thumbnail.
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

  try {
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      // This could be because the video is private, deleted, or the URL is wrong.
      throw new Error(`❌ 유튜브 영상 정보를 가져올 수 없습니다.\n\n📌 가능한 원인:\n• 비공개 영상이거나 삭제된 영상입니다\n• 올바르지 않은 유튜브 URL입니다\n• 네트워크 연결에 문제가 있습니다\n\n🔧 개발자 정보: ${response.statusText}`);
    }
    
    const data = await response.json();

    if (!data.title || !data.thumbnail_url) {
        throw new Error("❌ 영상 정보가 불완전합니다.\n\n📌 가능한 원인:\n• 유튜브 API 응답에 필수 정보가 누락되었습니다\n\n💡 해결 방법:\n• 다른 영상 URL로 다시 시도해보세요\n• 문제가 지속되면 아래 오류 정보를 개발자에게 전달해주세요\n\n🔧 개발자 정보: oEmbed 응답 데이터 불완전");
    }

    return {
      title: data.title,
      thumbnailUrl: data.thumbnail_url,
    };
  } catch (error: any) {
    console.error("Error fetching YouTube video details:", error);
    // 이미 처리된 에러면 그대로 전달
    if (error.message && error.message.includes('❌')) {
      throw error;
    }
    throw new Error(`❌ 영상 정보를 가져오는 중 오류가 발생했습니다.\n\n📌 가능한 원인:\n• 네트워크 연결 문제\n• 유튜브 서버 일시적 오류\n\n💡 해결 방법:\n• 인터넷 연결을 확인해주세요\n• 잠시 후 다시 시도해주세요\n• 문제가 지속되면 아래 오류 정보를 개발자에게 전달해주세요\n\n🔧 개발자 정보: ${error.message || '알 수 없는 오류'}`);
  }
};
