import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";
import { FiUser, FiClock, FiSettings } from "react-icons/fi";

const MyPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
        return;
      }
      setUser(session.user);
      setLoading(false);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("정말 회원탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.");
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      const response = await fetch("/api/YOUTUBE/user", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Account deletion failed");
      }
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Failed to delete account:", error);
      alert("회원탈퇴에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsDeleting(false);
    }
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
        
      </div>

      <div className="max-w-4xl mx-auto px-6 py-20">
        <Link to="/" className="text-slate-400 hover:text-white transition-colors mb-8 inline-block">
          ← 메인으로 돌아가기
        </Link>
        
        <h1 className="text-4xl font-bold mb-2">마이 페이지</h1>
        <p className="text-slate-400 mb-12">계정 정보를 확인하고 관리하세요.</p>

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
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="mt-2 w-full py-2 rounded-lg border border-red-500/30 text-sm font-medium text-red-200 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "회원탈퇴 처리 중..." : "회원탈퇴"}
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="md:col-span-2 space-y-6">
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
