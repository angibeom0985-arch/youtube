import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { User } from '@supabase/supabase-js';
import { FiZap, FiUser, FiRefreshCw } from 'react-icons/fi';

interface UserCreditSidebarProps {
  user: User | null;
}

const UserCreditSidebar: React.FC<UserCreditSidebarProps> = ({ user }) => {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCredits = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('크레딧 조회 오류:', error);
        return;
      }

      setCredits(profile?.credits ?? 0);
    } catch (error) {
      console.error('크레딧 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
    
    // 10초마다 크레딧 자동 갱신
    const interval = setInterval(fetchCredits, 10000);
    
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  return (
    <>
      {/* 왼쪽 사이드바 */}
      <div className="hidden xl:block fixed left-4 top-24 w-[200px] z-30">
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-md rounded-2xl p-5 border border-orange-500/30 shadow-[0_0_30px_rgba(234,88,12,0.15)]">
          {/* 사용자 정보 */}
          <div className="mb-6 pb-5 border-b border-zinc-700">
            <div className="flex items-center gap-3 mb-3">
              {user.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  className="w-12 h-12 rounded-full border-2 border-orange-500/50"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center border-2 border-orange-500/50">
                  <FiUser className="text-orange-400 text-xl" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </p>
                <p className="text-xs text-orange-400/70 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* 크레딧 정보 */}
          <div className="space-y-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <FiZap className="text-yellow-400 text-lg" />
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  잔여 크레딧
                </span>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <div className="relative">
                  <div className="text-4xl font-black bg-gradient-to-br from-orange-400 to-amber-500 bg-clip-text text-transparent mb-1">
                    {credits !== null ? credits.toLocaleString() : '---'}
                  </div>
                  <p className="text-xs text-neutral-400">크레딧</p>
                </div>
              )}

              <button
                onClick={fetchCredits}
                disabled={loading}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-orange-500/30"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                새로고침
              </button>
            </div>

            {/* 크레딧 안내 */}
            <div className="bg-zinc-800/50 rounded-lg p-3 text-xs text-neutral-300 space-y-2 border border-zinc-700">
              <p className="font-semibold text-orange-400 mb-2">💡 크레딧 사용량</p>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>영상 분석</span>
                  <span className="text-orange-400 font-semibold">1 ⚡</span>
                </div>
                <div className="flex justify-between">
                  <span>아이디어 생성</span>
                  <span className="text-orange-400 font-semibold">1 ⚡</span>
                </div>
                <div className="flex justify-between">
                  <span>기획안 작성</span>
                  <span className="text-orange-400 font-semibold">10 ⚡</span>
                </div>
                <div className="flex justify-between">
                  <span>벤치마킹 검색</span>
                  <span className="text-orange-400 font-semibold">5 ⚡</span>
                </div>
                <div className="flex justify-between">
                  <span>이미지 생성</span>
                  <span className="text-orange-400 font-semibold">5 ⚡</span>
                </div>
              </div>
            </div>

            {/* 일일 무료 크레딧 안내 */}
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-lg p-3 text-xs border border-amber-500/30">
              <p className="text-amber-400 font-semibold mb-1">🎁 매일 무료 충전!</p>
              <p className="text-neutral-300 text-[11px] leading-relaxed">
                매일 30 크레딧이 자동으로 충전됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserCreditSidebar;
