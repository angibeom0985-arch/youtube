import React, { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { FiLogOut, FiRefreshCw, FiUser, FiZap } from "react-icons/fi";
import { supabase } from "../services/supabase";

type Tone =
  | "orange"
  | "purple"
  | "emerald"
  | "indigo"
  | "red"
  | "blue"
  | "slate";

type ToneStyles = {
  badgeBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeShadow: string;
  accentText: string;
  accentBorder: string;
  accentBg: string;
  accentHover: string;
};

const toneMap: Record<Tone, ToneStyles> = {
  orange: {
    badgeBorder: "border-orange-500/30",
    badgeBg: "bg-orange-500/10",
    badgeText: "text-orange-300",
    badgeShadow: "shadow-[0_0_12px_rgba(249,115,22,0.25)]",
    accentText: "text-orange-400",
    accentBorder: "border-orange-500/30",
    accentBg: "bg-orange-500/10",
    accentHover: "hover:bg-orange-500/20",
  },
  purple: {
    badgeBorder: "border-purple-500/30",
    badgeBg: "bg-purple-500/10",
    badgeText: "text-purple-300",
    badgeShadow: "shadow-[0_0_12px_rgba(168,85,247,0.25)]",
    accentText: "text-purple-400",
    accentBorder: "border-purple-500/30",
    accentBg: "bg-purple-500/10",
    accentHover: "hover:bg-purple-500/20",
  },
  emerald: {
    badgeBorder: "border-emerald-500/30",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-300",
    badgeShadow: "shadow-[0_0_12px_rgba(16,185,129,0.22)]",
    accentText: "text-emerald-400",
    accentBorder: "border-emerald-500/30",
    accentBg: "bg-emerald-500/10",
    accentHover: "hover:bg-emerald-500/20",
  },
  indigo: {
    badgeBorder: "border-indigo-500/30",
    badgeBg: "bg-indigo-500/10",
    badgeText: "text-indigo-400",
    badgeShadow: "shadow-[0_0_12px_rgba(99,102,241,0.2)]",
    accentText: "text-indigo-500",
    accentBorder: "border-indigo-500/30",
    accentBg: "bg-indigo-500/10",
    accentHover: "hover:bg-indigo-500/20",
  },
  red: {
    badgeBorder: "border-red-500/30",
    badgeBg: "bg-red-500/10",
    badgeText: "text-red-300",
    badgeShadow: "shadow-[0_0_12px_rgba(239,68,68,0.2)]",
    accentText: "text-red-400",
    accentBorder: "border-red-500/30",
    accentBg: "bg-red-500/10",
    accentHover: "hover:bg-red-500/20",
  },
  blue: {
    badgeBorder: "border-blue-500/30",
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-300",
    badgeShadow: "shadow-[0_0_12px_rgba(59,130,246,0.2)]",
    accentText: "text-blue-400",
    accentBorder: "border-blue-500/30",
    accentBg: "bg-blue-500/10",
    accentHover: "hover:bg-blue-500/20",
  },
  slate: {
    badgeBorder: "border-white/10",
    badgeBg: "bg-white/5",
    badgeText: "text-slate-200",
    badgeShadow: "shadow-[0_0_12px_rgba(15,23,42,0.15)]",
    accentText: "text-slate-200",
    accentBorder: "border-white/15",
    accentBg: "bg-white/5",
    accentHover: "hover:bg-white/10",
  },
};

interface UserCreditToolbarProps {
  user: User | null;
  onLogout?: () => Promise<void> | void;
  tone?: Tone;
}

const UserCreditToolbar: React.FC<UserCreditToolbarProps> = ({
  user,
  onLogout,
  tone = "slate",
}) => {
  const styles = toneMap[tone] || toneMap.slate;
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInInitialPeriod, setIsInInitialPeriod] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  const fetchCredits = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("세션 오류:", sessionError);
        setCredits(0);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/YOUTUBE/user/credits", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("크레딧 조회 오류:", errorData);
        setCredits(0);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setCredits(data.credits ?? 0);
      setIsInInitialPeriod(data.isInInitialPeriod ?? false);
      setDaysRemaining(data.daysRemaining ?? 0);
    } catch (error) {
      console.error("크레딧 조회 실패:", error);
      setCredits(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();

    const handleCreditRefresh = () => {
      fetchCredits();
    };

    window.addEventListener("creditRefresh", handleCreditRefresh);

    return () => {
      window.removeEventListener("creditRefresh", handleCreditRefresh);
    };
  }, [user]);

  if (!user) return null;

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative group">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-full border ${styles.badgeBorder} ${styles.badgeBg} ${styles.badgeShadow}`}
        >
          <FiZap className={`${styles.badgeText}`} />
          <span className={`text-xs font-semibold ${styles.badgeText}`}>남은 크레딧</span>
          <span className="text-sm font-bold text-white">
            {loading ? "..." : credits !== null ? credits.toLocaleString() : "---"}
          </span>
        </div>

        <div className="absolute right-0 mt-3 w-[300px] opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
          <div className="rounded-2xl bg-zinc-950/95 border border-white/10 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className={`w-12 h-12 rounded-full border ${styles.badgeBorder}`}
                />
              ) : (
                <div className={`w-12 h-12 rounded-full ${styles.badgeBg} flex items-center justify-center border ${styles.badgeBorder}`}>
                  <FiUser className={styles.accentText} />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                </p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <div className={`rounded-xl border ${styles.badgeBorder} ${styles.badgeBg} px-3 py-2`}>
                <p className="text-xs text-slate-300">남은 크레딧</p>
                <p className={`text-xl font-black ${styles.badgeText}`}>
                  {credits !== null ? credits.toLocaleString() : "---"}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 space-y-1">
                <div className="flex items-center justify-between">
                  <span>영상 분석</span>
                  <span className={styles.accentText}>1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>아이디어 생성</span>
                  <span className={styles.accentText}>1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>기획안 작성</span>
                  <span className={styles.accentText}>10</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>벤치마킹 검색</span>
                  <span className={styles.accentText}>5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>이미지 생성</span>
                  <span className={styles.accentText}>5</span>
                </div>
              </div>

              {isInInitialPeriod ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  <p className="font-semibold">신규 가입 기간 적용 중</p>
                  <p className="text-[10px] text-emerald-100/80 mt-1">
                    남은 기간: {daysRemaining}일
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  매일 20 크레딧 무료 충전
                </div>
              )}

              <button
                type="button"
                onClick={fetchCredits}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 rounded-lg border ${styles.accentBorder} ${styles.accentBg} ${styles.accentHover} text-xs font-semibold ${styles.accentText} py-2 transition`}
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} />
                새로고침
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className={`text-xs font-bold px-3 py-2 rounded-full border ${styles.accentBorder} ${styles.accentBg} ${styles.accentHover} ${styles.accentText} transition`}
      >
        <span className="inline-flex items-center gap-1">
          <FiLogOut className="text-sm" />
          로그아웃
        </span>
      </button>
    </div>
  );
};

export default UserCreditToolbar;
