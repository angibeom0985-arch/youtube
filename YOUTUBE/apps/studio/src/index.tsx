
import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '@/features/home/pages/HomePage.tsx';
import GuidePage from '@/features/guide/pages/GuidePage.tsx';
import ApiGuidePage from '@/features/api-guide/pages/ApiGuidePage.tsx';
import ApiGuideAiStudioPage from '@/features/api-guide/pages/ApiGuideAiStudioPage.tsx';
import ApiGuideCloudConsolePage from '@/features/api-guide/pages/ApiGuideCloudConsolePage.tsx';
import ScriptGuidePage from '@/features/script/pages/ScriptGuidePage.tsx';
import ImageGuidePage from '@/features/guide/pages/ImageGuidePage.tsx';
import TtsGuidePage from '@/features/tts/pages/TtsGuidePage.tsx';
import AdminPage from '@/features/admin/pages/AdminPage.tsx';
import AdminEditorPage from '@/features/admin/pages/AdminEditorPage.tsx';
import DebugPage from '@/features/debug/pages/DebugPage.tsx';
import DownloadProgressPage from '@/features/download/pages/DownloadProgressPage.tsx';
import DownloadPage from '@/features/download/pages/DownloadPage.tsx';
import BenchmarkingPage from '@/features/benchmarking/pages/BenchmarkingPage.tsx';
import MyPage from '@/features/mypage/pages/MyPage.tsx';
import PricePage from '@/features/price/pages/PricePage.tsx';
import RequireAuth from './components/RequireAuth.tsx';
import {
  ImageScreen,
  ScriptScreen,
  TtsScreen,
  VideoScreen,
} from "@/features/shared/StudioScreens";

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route element={<RequireAuth />}>
          <Route path="/benchmarking" element={<BenchmarkingPage />} />
          <Route path="/script" element={<ScriptScreen mode="normal" />} />
          <Route path="/image/*" element={<ImageScreen mode="normal" />} />
          <Route path="/tts" element={<TtsScreen mode="normal" />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/video/*" element={<VideoScreen mode="normal" />} />
        </Route>
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/script/guide" element={<ScriptGuidePage />} />
        <Route path="/image/guide" element={<ImageGuidePage />} />
        <Route path="/tts/guide" element={<TtsGuidePage />} />
        <Route path="/api-guide" element={<ApiGuidePage />} />
        <Route path="/api_guide" element={<ApiGuidePage />} />
        <Route path="/api-guide-aistudio" element={<ApiGuideAiStudioPage />} />
        <Route path="/api-guide-cloudconsole" element={<ApiGuideCloudConsolePage />} />
        <Route path="/pricing" element={<PricePage />} />
        <Route path="/price" element={<Navigate to="/pricing" replace />} />
        <Route path="/credit" element={<Navigate to="/pricing" replace />} />
        <Route path="/credits" element={<Navigate to="/pricing" replace />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin-editor" element={<AdminEditorPage />} />
        <Route path="/debug" element={<DebugPage mode="home" />} />
        <Route path="/debug/script" element={<DebugPage mode="script" />} />
        <Route path="/debug/image/*" element={<DebugPage mode="image" />} />
        <Route path="/debug/tts" element={<DebugPage mode="tts" />} />
        <Route path="/debug/video/*" element={<DebugPage mode="video" />} />
        <Route path="/download-progress" element={<DownloadProgressPage />} />
        <Route path="/download" element={<DownloadPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
