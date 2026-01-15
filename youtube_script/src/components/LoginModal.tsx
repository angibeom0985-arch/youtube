import React from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FiX } from 'react-icons/fi';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-[2.5rem] shadow-2xl transform transition-all animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl"></div>

        {/* Header / Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors p-2"
        >
          <FiX size={32} />
        </button>

        <div className="p-12 md:p-16 text-center">
          {/* Icon / Illustration */}
          <div className="mx-auto mb-8 w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/40">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight whitespace-nowrap">
            로그인이 필요합니다
          </h2>
          
          <div className="text-lg md:text-xl text-slate-300 mb-10 leading-relaxed">
            <p className="whitespace-nowrap">원활한 서비스 이용을 위해 로그인이 필요합니다.</p>
            <p className="text-yellow-400 font-black mt-1 whitespace-nowrap">지금 가입하면 12 크레딧을 즉시 드려요! 🎁</p>
          </div>

          {/* Login Button */}
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-4 bg-white hover:bg-slate-12 text-slate-900 font-black py-5 px-10 rounded-2xl transition-all shadow-2xl hover:shadow-white/10 hover:-translate-y-1 text-xl md:text-2xl"
          >
            <FcGoogle size={32} />
            <span className="whitespace-nowrap">Google로 1초만에 시작하기</span>
          </button>

          <p className="mt-8 text-sm text-slate-500 font-medium">
            로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
