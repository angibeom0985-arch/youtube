import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";

const RequireAuth: React.FC = () => {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);


  if (user === undefined) {
    return (
      <div className="min-h-screen bg-[#0a0505] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // 원래 가려던 페이지를 쿼리 파라미터로 전달
    return <Navigate to={`/?from=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
