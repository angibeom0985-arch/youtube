# ?¬ë ˆ??UI ì»´í¬?ŒíŠ¸ ?„ì „ ë°±ì—…

## UserCreditSidebar.tsx
**?Œì¼ ?„ì¹˜**: `youtube/youtube_script/src/components/UserCreditSidebar.tsx`

```tsx
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('?¸ì…˜ ?¤ë¥˜:', sessionError);
        setCredits(0);
        setLoading(false);
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
        console.error('?¬ë ˆ??ì¡°íšŒ ?¤ë¥˜:', errorData);
        setCredits(0);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setCredits(data.credits ?? 0);
      setIsInInitialPeriod(data.isInInitialPeriod ?? false);
      setDaysRemaining(data.daysRemaining ?? 0);
    } catch (error) {
      console.error('?¬ë ˆ??ì¡°íšŒ ?¤íŒ¨:', error);
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

  if (!user) return null;

  return (
    <div className="hidden xl:block fixed left-4 top-24 w-[clamp(220px,18vw,320px)] z-30">
      <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-md rounded-2xl p-6 border border-orange-500/30 shadow-[0_0_30px_rgba(234,88,12,0.15)]">
        <div className="mb-6 pb-6 border-b border-zinc-700">
          <div className="flex items-center gap-3 mb-3">
            {user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Profile" className="w-16 h-16 rounded-full border-2 border-orange-500/50" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center border-2 border-orange-500/50">
                <FiUser className="text-orange-400 text-2xl" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white truncate">{user.user_metadata?.full_name || user.email?.split('@')[0]}</p>
              <p className="text-sm text-orange-400/70 truncate">{user.email}</p>
            </div>
          </div>
          <div className="mt-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg px-3 py-2 border border-green-500/30">
            <p className="text-green-400 text-xs font-semibold">?‰ ? ê·œ ê°€???œíƒ</p>
            <p className="text-neutral-300 text-[10px] mt-1">?Œì›ê°€????<span className="text-green-400 font-bold">12 ?¬ë ˆ??/span> ?œê³µ</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FiZap className="text-yellow-400 text-lg" />
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">?”ì—¬ ?¬ë ˆ??/span>
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
                <p className="text-sm text-neutral-400 font-semibold">?¬ë ˆ??/p>
              </div>
            )}
            <button onClick={fetchCredits} disabled={loading} className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-orange-500/30">
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              ?ˆë¡œê³ ì¹¨
            </button>
          </div>

          <div className="bg-zinc-800/50 rounded-lg p-4 text-xs text-neutral-300 space-y-2 border border-zinc-700">
            <p className="font-semibold text-orange-400 mb-3 text-sm">?’¡ ?¬ë ˆ???¬ìš©??/p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center"><span>?ìƒ ë¶„ì„</span><span className="text-orange-400 font-bold">1 ?’</span></div>
              <div className="flex justify-between items-center"><span>?„ì´?”ì–´ ?ì„±</span><span className="text-orange-400 font-bold">1 ?’</span></div>
              <div className="flex justify-between items-center"><span>ê¸°íš???‘ì„±</span><span className="text-orange-400 font-bold">10 ?’</span></div>
              <div className="flex justify-between items-center"><span>ë²¤ì¹˜ë§ˆí‚¹ ê²€??/span><span className="text-orange-400 font-bold">5 ?’</span></div>
              <div className="flex justify-between items-center"><span>?´ë?ì§€ ?ì„±</span><span className="text-orange-400 font-bold">5 ?’</span></div>
            </div>
          </div>

          {isInInitialPeriod ? (
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg p-4 text-xs border border-green-500/30">
              <p className="text-green-400 font-semibold mb-2 text-sm">?‰ ì´ˆê¸° ?¬ë ˆ??ê¸°ê°„!</p>
              <p className="text-neutral-300 text-xs leading-relaxed mb-2">?Œì›ê°€??ì¶•í•˜?©ë‹ˆ?? 12 ?¬ë ˆ?§ì„ ?¬ìš©?˜ì‹¤ ???ˆìŠµ?ˆë‹¤.</p>
              <div className="flex items-center justify-between bg-green-500/10 rounded px-3 py-2 mt-2">
                <span className="text-green-300 text-xs font-semibold">?¨ì? ê¸°ê°„</span>
                <span className="text-green-400 text-sm font-bold">{daysRemaining}??/span>
              </div>
              <p className="text-neutral-400 text-[10px] mt-2">ê¸°ê°„ ë§Œë£Œ ??ë§¤ì¼ 12 ?¬ë ˆ?§ì´ ?ë™ ì¶©ì „?©ë‹ˆ??</p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-lg p-4 text-xs border border-amber-500/30">
              <p className="text-amber-400 font-semibold text-sm">? ë§¤ì¼ 12 ?¬ë ˆ??ë¬´ë£Œ ì¶©ì „!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCreditSidebar;
```

## UserCreditToolbar.tsx 
**?Œì¼ ?„ì¹˜**: `youtube/youtube_script/src/components/UserCreditToolbar.tsx`

?„ì²´ ì½”ë“œ???ë³¸ ?Œì¼ ì°¸ì¡° (?¤ì–‘??tone ?¤í???ì§€??

## CreditPurchasePage.tsx
**?Œì¼ ?„ì¹˜**: `youtube/youtube_script/src/pages/CreditPurchasePage.tsx`

ê²°ì œ ?Œëœ ?•ë³´:
- ë² ì´ì§??? $9.90 / 180 ?¬ë ˆ??
- ë°¸ë¥˜ ?? $29.90 / 720 ?¬ë ˆ??(?¸ê¸°)
- ?„ë¡œ ?? $79.90 / 1800 ?¬ë ˆ??

