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
  const [isInInitialPeriod, setIsInInitialPeriod] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  const fetchCredits = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Supabase 세션에서 액세스 토큰 가져오기
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('세션 오류:', sessionError);
        setCredits(0);
        setLoading(false);
        return;
      }

      console.log('크레딧 조회 시작...');
      
      // API를 통해 크레딧 조회
      const response = await fetch('/api/YOUTUBE/user/credits', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('API 응답 상태:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('크레딧 조회 오류:', errorData);
        setCredits(0);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('크레딧 데이터:', data);
      
      setCredits(data.credits ?? 0);
      setIsInInitialPeriod(data.isInInitialPeriod ?? false);
      setDaysRemaining(data.daysRemaining ?? 0);
    } catch (error) {
      console.error('크레딧 조회 실패:', error);
      setCredits(0);
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
      <div className="hidden xl:block fixed left-4 top-24 w-[280px] z-30">
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-md rounded-2xl p-6 border border-orange-500/30 shadow-[0_0_30px_rgba(234,88,12,0.15)]">
          {/* 사용자 정보 */}
          <div className="mb-6 pb-6 border-b border-zinc-700">
            <div className="flex items-center gap-3 mb-3">
              {user.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full border-2 border-orange-500/50"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center border-2 border-orange-500/50">
                  <FiUser className="text-orange-400 text-2xl" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-white truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </p>
                <p className="text-sm text-orange-400/70 truncate">
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
                  <div className="text-5xl font-black bg-gradient-to-br from-orange-400 to-amber-500 bg-clip-text text-transparent mb-2">
                    {credits !== null ? credits.toLocaleString() : '---'}
                  </div>
                  <p className="text-sm text-neutral-400 font-semibold">크레딧</p>
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
            <div className="bg-zinc-800/50 rounded-lg p-4 text-xs text-neutral-300 space-y-2 border border-zinc-700">
              <p className="font-semibold text-orange-400 mb-3 text-sm">💡 크레딧 사용량</p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span>영상 분석</span>
                  <span className="text-orange-400 font-bold">1 💎</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>아이디어 생성</span>
                  <span className="text-orange-400 font-bold">1 💎</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>기획안 작성</span>
                  <span className="text-orange-400 font-bold">10 💎</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>벤치마킹 검색</span>
                  <span className="text-orange-400 font-bold">5 💎</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>이미지 생성</span>
                  <span className="text-orange-400 font-bold">5 💎</span>
                </div>
              </div>
            </div>
            {/* 일일 무료 크레딧 안내 */}
            {isInInitialPeriod ? (
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg p-4 text-xs border border-green-500/30">
                <p className="text-green-400 font-semibold mb-2 text-sm">🎉 초기 크레딧 기간!</p>
                <p className="text-neutral-300 text-xs leading-relaxed mb-2">
                  회원가입 축하합니다! 100 크레딧을 사용하실 수 있습니다.
                </p>
                <div className="flex items-center justify-between bg-green-500/10 rounded px-3 py-2 mt-2">
                  <span className="text-green-300 text-xs font-semibold">남은 기간</span>
                  <span className="text-green-400 text-sm font-bold">{daysRemaining}일</span>
                </div>
                <p className="text-neutral-400 text-[10px] mt-2">
                  기간 만료 후 매일 30 크레딧이 자동 충전됩니다.
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-lg p-4 text-xs border border-amber-500/30">
                <p className="text-amber-400 font-semibold text-sm">🎁 매일 30 크레딧 무료 충전!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UserCreditSidebar;
