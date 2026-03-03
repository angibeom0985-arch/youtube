import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";
import type { User } from "@supabase/supabase-js";
import { FiUser, FiClock, FiKey, FiGift, FiZap, FiRefreshCw } from "react-icons/fi";
import ApiKeyInput from "@/components/ApiKeyInput";
import HomeBackButton from "@/components/HomeBackButton";
import UserCreditToolbar from "@/components/UserCreditToolbar";

const MyPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [googleCloudApiKey, setGoogleCloudApiKey] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [hasUserGeminiKey, setHasUserGeminiKey] = useState(false);
  const [couponBypassCredits, setCouponBypassCredits] = useState(false);
  const [couponBypassExpiresAt, setCouponBypassExpiresAt] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
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

  const fetchCreditState = async () => {
    setCreditsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setCredits(0);
        setHasUserGeminiKey(false);
        setCouponBypassCredits(false);
        setCouponBypassExpiresAt(null);
        return;
      }

      const [creditRes, settingsRes] = await Promise.all([
        fetch("/api/YOUTUBE/user", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch("/api/user/settings", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),
      ]);

      if (creditRes.ok) {
        const data = await creditRes.json();
        setCredits(Number(data?.credits ?? 0));
      } else {
        setCredits(0);
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        const userKey = typeof data?.gemini_api_key === "string" ? data.gemini_api_key.trim() : "";
        setHasUserGeminiKey(Boolean(userKey));
        setCouponBypassCredits(data?.coupon_bypass_credits === true);
        setCouponBypassExpiresAt(
          typeof data?.coupon_bypass_expires_at === "string" ? data.coupon_bypass_expires_at : null
        );
      } else {
        setHasUserGeminiKey(false);
        setCouponBypassCredits(false);
        setCouponBypassExpiresAt(null);
      }
    } catch (error) {
      console.error("Failed to fetch credit state:", error);
      setCredits(0);
      setHasUserGeminiKey(false);
      setCouponBypassCredits(false);
      setCouponBypassExpiresAt(null);
    } finally {
      setCreditsLoading(false);
    }
  };

  const getCouponRemainingLabel = () => {
    if (!couponBypassExpiresAt) return null;
    const remainMs = new Date(couponBypassExpiresAt).getTime() - nowTick;
    if (!Number.isFinite(remainMs) || remainMs <= 0) return "유효기간 만료";
    const remainHours = Math.floor(remainMs / (1000 * 60 * 60));
    const remainDays = Math.floor(remainHours / 24);
    const remainHourRemainder = remainHours % 24;
    if (remainDays > 0) return `${remainDays}일 ${remainHourRemainder}시간 남음`;
    const remainMinutes = Math.max(0, Math.floor((remainMs % (1000 * 60 * 60)) / (1000 * 60)));
    return `${remainHourRemainder}시간 ${remainMinutes}분 남음`;
  };

  useEffect(() => {
    if (!user) return;
    fetchCreditState();
    const handleCreditRefresh = () => fetchCreditState();
    window.addEventListener("creditRefresh", handleCreditRefresh);
    return () => window.removeEventListener("creditRefresh", handleCreditRefresh);
  }, [user?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) {
      setCouponMessage("쿠폰 코드를 입력해주세요.");
      return;
    }

    setCouponLoading(true);
    setCouponMessage(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }

      const response = await fetch("/api/user/coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const reason = data?.message || "coupon_apply_failed";
        if (reason === "coupon_already_used") {
          setCouponMessage("이미 사용한 쿠폰입니다.");
        } else if (reason === "coupon_expired") {
          setCouponMessage("만료된 쿠폰입니다.");
        } else if (reason === "coupon_not_found" || reason === "invalid_code") {
          setCouponMessage("유효하지 않은 쿠폰 코드입니다.");
        } else {
          setCouponMessage("쿠폰 적용에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
        return;
      }

      const expiryRaw = typeof data?.bypassExpiresAt === "string" ? data.bypassExpiresAt : "";
      const expiryLabel = expiryRaw
        ? new Date(expiryRaw).toLocaleDateString("ko-KR")
        : "적용일로부터 2개월";
      setCouponMessage(`쿠폰 적용 완료: 유효기간은 ${expiryLabel}까지이며, Gemini/Google Cloud 본인 API 키 등록 시 전체 기능을 크레딧 없이 사용할 수 있습니다.`);
      setCouponCode("");
      window.dispatchEvent(new Event("creditRefresh"));
    } catch (error) {
      console.error("Failed to apply coupon:", error);
      setCouponMessage("쿠폰 적용 중 오류가 발생했습니다.");
    } finally {
      setCouponLoading(false);
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
    <div className="min-h-screen text-white relative bg-[radial-gradient(circle_at_16%_12%,rgba(99,102,241,0.20),transparent_42%),radial-gradient(circle_at_84%_0%,rgba(37,99,235,0.14),transparent_36%),linear-gradient(180deg,#020617_0%,#020617_100%)]">
      <div className="absolute top-0 right-0 p-6 flex gap-3 z-10 items-center">
        <UserCreditToolbar user={user} onLogout={handleLogout} tone="indigo" showCredits />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="mb-8">
          <HomeBackButton tone="indigo" />
        </div>

        <h1 className="text-4xl font-bold mb-2">마이 페이지</h1>
        <p className="text-slate-400 mb-12">계정 정보를 확인하고 관리하세요.</p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="md:col-span-1 bg-slate-900/75 border border-indigo-300/20 rounded-2xl p-6 backdrop-blur-sm">
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
              <p className="text-sm text-slate-400 mb-4">{user?.email}</p>

              <div className="w-full mb-4 rounded-xl border border-indigo-400/30 bg-indigo-500/12 px-3 py-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-indigo-300 flex items-center gap-1">
                    <FiZap /> 크레딧
                  </span>
                  <button
                    onClick={fetchCreditState}
                    disabled={creditsLoading}
                    className="p-1 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
                    title="크레딧 새로고침"
                  >
                    <FiRefreshCw className={`text-indigo-300 text-xs ${creditsLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
                <p className="text-2xl font-black text-indigo-200 mt-1">
                  {creditsLoading ? "-" : (credits ?? 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {couponBypassCredits
                    ? (hasUserGeminiKey
                        ? "현재 모드: 쿠폰 적용 완료 (본인 API 필수 / 크레딧 차감 없음)"
                        : "현재 모드: 쿠폰 적용됨 (본인 Gemini API 키 등록 필요)")
                    : "현재 모드: 기본 크레딧 모드 (서버 API 사용 시 요청별 차감)"}
                </p>
                {couponBypassCredits && (
                  <p className="text-[11px] text-emerald-300 mt-1">
                    남은 유효기간: {getCouponRemainingLabel() ?? "확인 불가"}
                  </p>
                )}
              </div>

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
              <Link to="/script" className="bg-slate-900/75 border border-indigo-300/20 p-5 rounded-2xl hover:border-indigo-300/45 transition-colors group backdrop-blur-sm">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3 group-hover:bg-orange-500/20 transition-colors">
                  <span className="text-xl">📝</span>
                </div>
                <h3 className="font-bold text-slate-200">대본 관리</h3>
                <p className="text-xs text-slate-500 mt-1">저장된 대본 보기</p>
              </Link>

              <Link to="/video" className="bg-slate-900/75 border border-indigo-300/20 p-5 rounded-2xl hover:border-indigo-300/45 transition-colors group backdrop-blur-sm">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-3 group-hover:bg-red-500/20 transition-colors">
                  <span className="text-xl">🎬</span>
                </div>
                <h3 className="font-bold text-slate-200">영상 프로젝트</h3>
                <p className="text-xs text-slate-500 mt-1">진행 중인 프로젝트</p>
              </Link>
            </div>

            <div className="bg-slate-900/75 border border-indigo-300/20 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <FiZap className="text-emerald-400" /> 크레딧 관리
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="text-xs text-indigo-300">현재 보유 크레딧</p>
                  <p className="text-3xl font-black text-indigo-200 mt-1">
                    {creditsLoading ? "-" : (credits ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs text-slate-400">차감 정책</p>
                  <p className="text-sm text-slate-200 mt-2 leading-relaxed">
                    기본: 서버 공용 API 사용 시 요청별 크레딧 차감
                    <br />
                    쿠폰 적용 후: 본인 API 키 등록 시 크레딧 차감 없음
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={fetchCreditState}
                  disabled={creditsLoading}
                  className="px-3 py-2 rounded-lg border border-indigo-300/20 hover:bg-indigo-500/10 text-sm text-slate-200 disabled:opacity-50 flex items-center gap-2"
                >
                  <FiRefreshCw className={creditsLoading ? "animate-spin" : ""} />
                  크레딧 새로고침
                </button>
                <Link
                  to="/pricing"
                  className="px-4 py-2 rounded-lg bg-amber-400 text-black text-sm font-bold hover:bg-amber-300 transition-colors"
                >
                  크레딧 구매
                </Link>
              </div>
              <p className="mt-3 text-xs text-amber-200/90">
                크레딧이 부족하면 제작 흐름이 멈춥니다. 지금 충전해서 작업을 끊기지 않게 이어가세요.
              </p>
            </div>

            {/* API Settings Section */}
            <div className="bg-slate-900/75 border border-indigo-300/20 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <FiKey className="text-orange-400" /> API 키 설정
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                Google AI Studio 및 Google Cloud Console 키를 설정하면 더 안정적인 서비스를 이용할 수 있습니다.
              </p>

              <div className="space-y-4">
                <ApiKeyInput
                  apiKey={geminiApiKey}
                  setApiKey={setGeminiApiKey}
                  storageKey="gemini_api_key"
                  label="Gemini API 키"
                  placeholder="AIzaSy..."
                  helpText="Script 및 Image 생성에 사용됩니다. (Google AI Studio)"
                  guideRoute="/api-guide-aistudio"
                  theme="orange"
                  apiType="gemini"
                />
                <ApiKeyInput
                  apiKey={googleCloudApiKey}
                  setApiKey={setGoogleCloudApiKey}
                  storageKey="google_cloud_api_key"
                  label="Google Cloud API 키"
                  placeholder="AIzaSy..."
                  helpText="Benchmarking(YouTube) 및 TTS에 사용됩니다. (Google Cloud Console)"
                  guideRoute="/api-guide-googlecloud"
                  theme="blue"
                  apiType="googleCloud"
                />
              </div>
            </div>

            <div className="bg-slate-900/75 border border-indigo-300/20 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <FiGift className="text-emerald-400" /> 할인 쿠폰
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                쿠폰 적용 후 유효기간은 2개월이며, Gemini/Google Cloud 본인 API 키를 등록한 요청만 크레딧 없이 사용됩니다. 미등록 시 사용이 제한됩니다.
              </p>
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="쿠폰 코드 입력"
                  className="flex-1 px-3 py-2 rounded-lg bg-black border border-white/10 text-white placeholder:text-slate-500"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold"
                >
                  {couponLoading ? "적용 중..." : "적용"}
                </button>
              </div>
              {couponMessage && (
                <p className="text-sm mt-3 text-slate-300">{couponMessage}</p>
              )}
              {couponBypassExpiresAt && (
                <p className="text-sm mt-2 text-emerald-300">
                  현재 쿠폰 남은 유효기간: {getCouponRemainingLabel() ?? "확인 불가"}
                </p>
              )}
            </div>

            {/* Recent Activity (Placeholder) */}
            <div className="bg-slate-900/75 border border-indigo-300/20 rounded-2xl p-6 backdrop-blur-sm">
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

