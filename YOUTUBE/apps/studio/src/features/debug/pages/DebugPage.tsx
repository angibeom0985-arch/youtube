import React, { useEffect, useState } from "react";
import { FiEye, FiEyeOff, FiHome } from "react-icons/fi";
import {
  HomeScreen,
  ImageScreen,
  ScriptScreen,
  TtsScreen,
  VideoScreen,
} from "@/features/shared/StudioScreens";

type LoginState = "checking" | "loggedOut" | "loggedIn";
type DebugMode = "home" | "script" | "image" | "video" | "tts";

interface DebugPageProps {
  mode: DebugMode;
}

const DebugPage: React.FC<DebugPageProps> = ({ mode }) => {
  const [loginState, setLoginState] = useState<LoginState>("checking");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkSession = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/abuse?limit=1");
      if (!response.ok) {
        throw new Error("not_logged_in");
      }
      setLoginState("loggedIn");
    } catch (err) {
      setLoginState("loggedOut");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username, password }),
      });

      if (!response.ok) {
        const message = await response.text();
        if (response.status === 401) {
          setError("Invalid credentials.");
        } else {
          setError(
            message || "Server error. Check ADMIN_* env vars and redeploy."
          );
        }
        setLoading(false);
        return;
      }

      setLoginState("loggedIn");
      setUsername("");
      setPassword("");
    } catch (err) {
      setError("Login failed.");
    } finally {
      setLoading(false);
    }
  };

  if (loginState === "checking") {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
        <div className="text-neutral-300">Loading debug session...</div>
      </div>
    );
  }

  if (loginState === "loggedOut") {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8">
          <h1 className="text-2xl font-bold mb-6">Debug Login</h1>
                  {error && (
                    <div className="mb-4 rounded-lg border border-red-600 bg-red-950/60 p-3 text-sm text-red-200">
                      {error}
                    </div>
                  )}          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#121212] px-3 py-2"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#121212] px-3 py-2 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-300 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-red-600 py-2 font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <a
            href="/"
            className="mt-4 inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
          >
            <FiHome size={16} />
            Back to home
          </a>
        </div>
      </div>
    );
  }

  if (mode === "image") {
    return <ImageScreen mode="debug" />;
  }

  if (mode === "home") {
    return <HomeScreen mode="debug" />;
  }

  if (mode === "video") {
    return <VideoScreen mode="debug" />;
  }

  if (mode === "tts") {
    return <TtsScreen mode="debug" />;
  }

  return <ScriptScreen mode="debug" />;
};

export default DebugPage;
