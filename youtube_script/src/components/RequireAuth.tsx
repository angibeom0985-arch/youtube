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


  const isKakaoUser = !!(
    user?.app_metadata?.provider === "kakao" ||
    user?.app_metadata?.providers?.includes("kakao")
  );
  const hasPhoneNumber = Boolean(
    user?.user_metadata?.phone_number || user?.user_metadata?.phone
  );
  const requiresKakaoPhone = Boolean(user) && (!isKakaoUser || !hasPhoneNumber);

  useEffect(() => {
    if (!requiresKakaoPhone) return;
    supabase.auth.signOut();
  }, [requiresKakaoPhone]);

  if (user === undefined) {
    return null;
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (requiresKakaoPhone) {
    return <Navigate to="/" replace state={{ authError: "kakao_phone_required" }} />;
  }

  return <Outlet />;
};

export default RequireAuth;
