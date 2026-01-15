import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";
import UserCreditToolbar from "../components/UserCreditToolbar";
import { FiUser, FiZap, FiCreditCard, FiClock, FiSettings } from "react-icons/fi";

const MyPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
        return;
      }
      setUser(session.user);
      fetchCredits(session.access_token);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/");
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchCredits = async (token: string) => {
    try {
      const response = await fetch("/api/YOUTUBE/user/credits", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCredits(data.credits);
      }
    } catch (error) {
      console.error("Failed to fetch credits:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      <div className="absolute top-0 right-0 p-6 flex gap-3 z-10 items-center">
        <UserCreditToolbar user={user} onLogout={handleLogout} tone="slate" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-20">
        <Link to="/" className="text-slate-400 hover:text-white transition-colors mb-8 inline-block">
          ← 메인으로 돌아가기
        </Link>
        
        <h1 className="text-4xl font-bold mb-2">마이 페이지</h1>
        <p className="text-slate-400 mb-12">계정 정보와 크레딧 내역을 확인하세요.</p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="md:col-span-1 bg-zinc-900 border border-white/10 rounded-2xl p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mb-4 border-2 border-white/10">
                {user?.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt="Profile" 
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  <FiUser className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                {user?.user_metadata?.full_name || "사용자"}
              </h2>
              <p className="text-sm text-slate-400 mb-6">{user?.email}</p>
              
              <button 
                onClick={handleLogout}
                className="w-full py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm font-medium transition-colors text-slate-300"
              >
                로그아웃
              </button>
            </div>
          </div>

          {/* Credit & Activity */}
          <div className="md:col-span-2 space-y-6">
            {/* Credit Balance */}
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <FiZap className="w-32 h-32" />
              </div>
              
              <div className="relative z-10">
                <p className="text-indigo-300 font-medium mb-1 flex items-center gap-2">
                  <FiZap /> 보유 크레딧
                </p>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-black text-white tracking-tight">
                    {credits?.toLocaleString() ?? 0}
                  </span>
                  <span className="text-lg text-white/60">credits</span>
                </div>

                <Link
                  to="/credit-purchase"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-900 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
                >
                  <FiCreditCard />
                  크레딧 충전하기
                </Link>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Link to="/script" className="bg-zinc-900 border border-white/10 p-5 rounded-2xl hover:border-white/30 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3 group-hover:bg-orange-500/20 transition-colors">
                  <span className="text-xl">📝</span>
                </div>
                <h3 className="font-bold text-slate-200">대본 관리</h3>
                <p className="text-xs text-slate-500 mt-1">저장된 대본 보기</p>
              </Link>
              
              <Link to="/video" className="bg-zinc-900 border border-white/10 p-5 rounded-2xl hover:border-white/30 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-3 group-hover:bg-red-500/20 transition-colors">
                  <span className="text-xl">🎬</span>
                </div>
                <h3 className="font-bold text-slate-200">영상 프로젝트</h3>
                <p className="text-xs text-slate-500 mt-1">진행 중인 프로젝트</p>
              </Link>
            </div>
            
            {/* Recent Activity (Placeholder) */}
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <FiClock /> 최근 활동 내역
              </h3>
              <div className="text-center py-8 text-slate-500 text-sm">
                아직 활동 내역이 없습니다.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPage;
