import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-16 py-8 pb-32 border-t border-[#2A2A2A] bg-[#0A0A0A]">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center space-y-4">
          <div className="text-sm text-neutral-400">
            <p className="mb-2">유튜브 영상 분석 AI © 2025. All rights reserved.</p>
          </div>
          <div className="flex justify-center gap-4 text-xs text-neutral-500">
            <a href="/guide" className="hover:text-neutral-300 transition-colors">사용법</a>
            <span>•</span>
            <a href="/api-guide" className="hover:text-neutral-300 transition-colors">API 발급</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
