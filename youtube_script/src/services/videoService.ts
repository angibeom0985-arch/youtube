import { supabase } from "./supabase";

export interface VideoGenerationParams {
  prompt: string;
  image?: string; // base64
  audio?: string; // base64
  duration?: number;
  ratio?: string;
}

export const generateVideo = async (params: VideoGenerationParams): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
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
    throw new Error(errorData.message || "영상 생성에 실패했습니다.");
  }

  const data = await response.json();
  return data.videoUrl;
};
