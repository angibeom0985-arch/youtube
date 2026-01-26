import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import type { User } from '@supabase/supabase-js';
import { FiZap, FiLogOut, FiRefreshCw, FiUser } from 'react-icons/fi';

interface UserCreditToolbarProps {
  user: User | null;
  onLogout: () => void;
  tone?: 'orange' | 'blue'; // Example tones
}

const UserCreditToolbar: React.FC<UserCreditToolbarProps> = ({ user, onLogout, tone = 'orange' }) => {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCredits = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('Session Error:', sessionError);
        setCredits(0);
        return;
      }

      const response = await fetch('/api/YOUTUBE/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Credit Fetch Error:', errorData);
        setCredits(0);
        return;
      }

      const data = await response.json();
      setCredits(data.credits ?? 0);
    } catch (error) {
      console.error('Failed to fetch credits:', error);
      setCredits(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
    const handleCreditRefresh = () => fetchCredits();
    window.addEventListener('creditRefresh', handleCreditRefresh);
    return () => window.removeEventListener('creditRefresh', handleCreditRefresh);
  }, [user]);

  const colorClasses = {
    orange: {
      bg: 'bg-zinc-800/80',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      icon: 'text-orange-400',
      buttonBg: 'hover:bg-orange-500/20',
      avatarBorder: 'border-orange-500/50',
    },
    blue: {
      bg: 'bg-zinc-800/80',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      icon: 'text-blue-400',
      buttonBg: 'hover:bg-blue-500/20',
      avatarBorder: 'border-blue-500/50',
    },
  };

  const colors = colorClasses[tone];

  if (!user) return null;

  return (
    <div className={`flex items-center gap-3 p-2 rounded-full backdrop-blur-md border ${colors.bg} ${colors.border} shadow-lg`}>
      <div className="flex items-center gap-2">
        {user.user_metadata?.avatar_url ? (
          <img src={user.user_metadata.avatar_url} alt="Profile" className={`w-8 h-8 rounded-full border-2 ${colors.avatarBorder}`} />
        ) : (
          <div className={`w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center border-2 ${colors.avatarBorder}`}>
            <FiUser className={`${colors.icon} text-lg`} />
          </div>
        )}
        <span className="text-sm font-semibold text-white hidden sm:inline">{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
      </div>

      <div className="h-6 border-l border-zinc-600"></div>

      <div className="flex items-center gap-2">
        <FiZap className={`${colors.icon} text-lg`} />
        {loading ? (
          <div className="w-12 h-5 animate-pulse bg-zinc-700 rounded-md"></div>
        ) : (
          <span className={`text-base font-bold ${colors.text}`}>{credits !== null ? credits.toLocaleString() : '-'}</span>
        )}
        <button onClick={fetchCredits} disabled={loading} className={`p-1.5 rounded-full transition-colors ${colors.buttonBg}`}>
          <FiRefreshCw className={`text-sm ${colors.icon} ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="h-6 border-l border-zinc-600"></div>

      <div className="flex items-center gap-2">
        <Link to="/mypage" className={`p-2 rounded-full transition-colors ${colors.buttonBg} group`} title="마이페이지">
          <FiUser className={`${colors.icon} text-base group-hover:text-white transition-colors`} />
        </Link>
        <button onClick={onLogout} title="Logout" className={`p-2 rounded-full transition-colors ${colors.buttonBg}`}>
          <FiLogOut className={`${colors.icon} text-base`} />
        </button>
      </div>
    </div>
  );
};

export default UserCreditToolbar;
