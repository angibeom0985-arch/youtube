import { supabase } from "./supabase";

export interface VideoGenerationParams {
  prompt: string;
  image?: string;
  audio?: string;
  duration?: number;
  ratio?: string;
}

export interface VideoGenerationResult {
  videoUrl: string;
  message?: string;
}

export const generateVideo = async (
  params: VideoGenerationParams
): Promise<string> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error("로그인이 필요합니다.");
  }

  const response = await fetch("/api/YOUTUBE/video/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "영상 생성 요청에 실패했습니다.");
  }

  const data = (await response.json()) as VideoGenerationResult;
  return data.videoUrl;
};
