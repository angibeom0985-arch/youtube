import React, { useEffect, useState } from "react";
import { FiHome, FiLogOut, FiRefreshCw } from "react-icons/fi";

type AbuseEvent = {
  id: string;
  created_at: string;
  ip: string | null;
  reported_ip: string | null;
  ip_hash: string | null;
  user_agent: string;
  browser: string;
  os: string;
  fingerprint_hash: string | null;
  risk_label: string;
  risk_score: number | null;
  risk_reason: string | null;
  action: string | null;
};

type AdminData = {
  summary: Record<string, number>;
  events: AbuseEvent[];
};

type LoginState = "checking" | "loggedOut" | "loggedIn";

type FilterLabel = "all" | "normal" | "suspicious" | "abusive" | "pending" | "unknown";

const AdminPage: React.FC = () => {
  const [loginState, setLoginState] = useState<LoginState>("checking");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [filter, setFilter] = useState<FilterLabel>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async (label: FilterLabel = filter) => {
    const params = new URLSearchParams();
    params.set("limit", "200");
    if (label !== "all") {
      params.set("label", label);
    }

    const response = await fetch(`/api/admin/abuse?${params.toString()}`);
    if (!response.ok) {
      throw new Error("fetch_failed");
    }
    const payload = (await response.json()) as AdminData;
    setData(payload);
  };

  const bootstrap = async () => {
    setLoading(true);
    try {
      await fetchData("all");
      setLoginState("loggedIn");
    } catch (err) {
      setLoginState("loggedOut");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrap();
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
        setError("Invalid credentials.");
        setLoading(false);
        return;
      }

      setLoginState("loggedIn");
      setUsername("");
      setPassword("");
      await fetchData("all");
    } catch (err) {
      setError("Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setLoginState("loggedOut");
    setData(null);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchData(filter);
    } catch (err) {
      setError("Failed to refresh data.");
    } finally {
      setLoading(false);
    }
  };

  if (loginState === "checking") {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
        <div className="text-neutral-300">Loading admin session...</div>
      </div>
    );
  }

  if (loginState === "loggedOut") {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8">
          <h1 className="text-2xl font-bold mb-6">Admin Login</h1>
                  {error && (
                    <div className="mb-4 rounded-lg border border-orange-600 bg-orange-950/60 p-3 text-sm text-orange-200">
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#121212] px-3 py-2"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-orange-600 py-2 font-semibold hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <a
            href="/"
            className="mt-4 inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
          >
            <FiHome size={16} />
            Back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Abuse Monitor</h1>
            <p className="text-sm text-neutral-400">Review free-trial abuse signals.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-sm"
            >
              <FiRefreshCw size={16} />
              Refresh
            </button>
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm"
                          >              <FiLogOut size={16} />
              Logout
            </button>
          </div>
        </header>

              {error && (
                <div className="rounded-lg border border-orange-600 bg-orange-950/60 p-3 text-sm text-orange-200">
                  {error}
                </div>
              )}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(data?.summary || {}).map(([label, count]) => (
            <div key={label} className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <div className="text-xs uppercase text-neutral-400">{label}</div>
              <div className="text-2xl font-semibold mt-2">{count}</div>
            </div>
          ))}
        </section>

        <section className="flex items-center gap-3">
          <label className="text-sm text-neutral-300">Filter</label>
          <select
            value={filter}
            onChange={(event) => {
              const nextValue = event.target.value as FilterLabel;
              setFilter(nextValue);
              fetchData(nextValue).catch(() => setError("Failed to load filter."));
            }}
            className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="normal">Normal</option>
            <option value="suspicious">Suspicious</option>
            <option value="abusive">Abusive</option>
            <option value="pending">Pending</option>
            <option value="unknown">Unknown</option>
          </select>
        </section>

        <section className="overflow-x-auto rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
          <table className="min-w-full text-sm">
            <thead className="border-b border-[#2A2A2A] text-left text-xs uppercase text-neutral-400">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Browser</th>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {(data?.events || []).map((event) => (
                <tr key={event.id} className="border-b border-[#2A2A2A]">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(event.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {event.ip || event.reported_ip || event.ip_hash || "n/a"}
                  </td>
                  <td className="px-4 py-3">
                    {event.browser} / {event.os}
                  </td>
                  <td className="px-4 py-3 font-semibold">{event.risk_label}</td>
                  <td className="px-4 py-3">{event.risk_score ?? "-"}</td>
                  <td className="px-4 py-3">{event.action || "-"}</td>
                  <td className="px-4 py-3 text-neutral-300">{event.risk_reason || "-"}</td>
                </tr>
              ))}
              {!data?.events?.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-neutral-400" colSpan={7}>
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};

export default AdminPage;
