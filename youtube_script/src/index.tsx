
import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import ImageApp from '../../youtube_image/ui/App';
import ImageErrorBoundary from '../../youtube_image/ui/components/ErrorBoundary';
import HomePage from './pages/HomePage.tsx';
import GuidePage from './pages/GuidePage.tsx';
import ApiGuidePage from './pages/ApiGuidePage.tsx';
import ScriptGuidePage from './pages/ScriptGuidePage.tsx';
import ImageGuidePage from './pages/ImageGuidePage.tsx';
import TtsGuidePage from './pages/TtsGuidePage.tsx';
import AdminPage from './pages/AdminPage.tsx';
import DebugPage from './pages/DebugPage.tsx';
import DownloadProgressPage from './pages/DownloadProgressPage.tsx';
import DownloadPage from './pages/DownloadPage.tsx';
import TtsPage from './pages/TtsPage.tsx';
import BenchmarkingPage from './pages/BenchmarkingPage.tsx';
import CreditPurchasePage from './pages/CreditPurchasePage.tsx';
import VideoPage from './pages/VideoPage.tsx';
import MyPage from './pages/MyPage.tsx';

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
        <Route path="/benchmarking" element={<BenchmarkingPage />} />
        <Route path="/script" element={<App />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/script/guide" element={<ScriptGuidePage />} />
        <Route path="/image/guide" element={<ImageGuidePage />} />
        <Route path="/tts/guide" element={<TtsGuidePage />} />
        <Route path="/api-guide" element={<ApiGuidePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/debug" element={<DebugPage mode="script" />} />
        <Route path="/debug/script" element={<DebugPage mode="script" />} />
        <Route path="/debug/image/*" element={<DebugPage mode="image" />} />
        <Route path="/debug/tts" element={<Navigate to="/tts" replace />} />
        <Route path="/debug/video" element={<DebugPage mode="video" />} />
        <Route path="/download-progress" element={<DownloadProgressPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/tts" element={<TtsPage />} />
        <Route path="/credit-purchase" element={<CreditPurchasePage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/video" element={<VideoPage />} />
        <Route
          path="/image/*"
          element={
            <ImageErrorBoundary>
              <ImageApp basePath="/image" />
            </ImageErrorBoundary>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
