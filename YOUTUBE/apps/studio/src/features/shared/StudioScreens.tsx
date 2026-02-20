import React from "react";
import App from "@/App";
import ImageApp from "@/features/image/App";
import ImageErrorBoundary from "@/features/image/components/ErrorBoundary";
import VideoPage from "@/features/script/pages/VideoPage";
import HomePage from "@/features/home/pages/HomePage";
import TtsPage from "@/features/tts/pages/TtsPage";

type ScreenMode = "normal" | "debug";

export const ScriptScreen: React.FC<{ mode?: ScreenMode }> = ({ mode = "normal" }) => (
  <App allowDevtools={mode === "debug"} />
);

export const ImageScreen: React.FC<{ mode?: ScreenMode }> = ({ mode = "normal" }) => (
  <ImageErrorBoundary>
    <ImageApp basePath={mode === "debug" ? "/debug/image" : "/image"} />
  </ImageErrorBoundary>
);

export const TtsScreen: React.FC<{ mode?: ScreenMode }> = ({ mode = "normal" }) => (
  <TtsPage basePath={mode === "debug" ? "/debug/tts" : "/tts"} />
);

export const VideoScreen: React.FC<{ mode?: ScreenMode }> = ({ mode = "normal" }) => (
  <VideoPage basePath={mode === "debug" ? "/debug" : ""} />
);

export const HomeScreen: React.FC<{ mode?: ScreenMode }> = ({ mode = "normal" }) => (
  <HomePage
    basePath={mode === "debug" ? "/debug" : ""}
    allowUnauthedNavigation={mode === "debug"}
  />
);

