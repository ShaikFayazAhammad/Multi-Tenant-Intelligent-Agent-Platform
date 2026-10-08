import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  loginUser,
  createSessionFromAuthUser,
  updateStoredSession,
  getStoredSession,
} from "../services/apiClient";

const Login = () => {
  const navigate = useNavigate();

  // Auto-redirect if a valid session already exists
  useEffect(() => {
    const existing = getStoredSession();
    if (existing?.user?.access_token) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [room, setRoom] = useState<string>("Governance");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // data = { access_token, token_type, user: { id, email, full_name, ... } }
      const { data } = await loginUser({ email: email.trim(), password });
      console.log("Login response data:", data);

      const session = createSessionFromAuthUser(data, { room });
      if (!session) {
        setError("Login succeeded but session could not be created.");
        return;
      }
      updateStoredSession(session);
      console.log("Stored session:", getStoredSession());
      navigate("/", { replace: true });
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#eff6ff,_#f8fafc_45%,_#e2e8f0_100%)] px-6 py-12">
      <div className="grid w-full max-w-5xl gap-8 overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left panel */}
        <section className="bg-gradient-to-br from-slate-900 via-indigo-900 to-cyan-900 px-8 py-10 text-white sm:px-12">
          <div className="flex items-center gap-4">
            <img className="h-12 w-auto object-contain rounded-xl bg-white/90 p-2" src="/vms_logo.png" alt="BFSI logo" />
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Enterprise AI Orchestration</p>
              <h1 className="text-3xl font-semibold">BFSI Intelligent Agent Platform (SaaS)</h1>
            </div>
          </div>
          <div className="mt-12 max-w-xl space-y-5">
            <h2 className="text-2xl font-semibold leading-tight">
               Automate banking, finance, and insurance workflows with intelligent AI agents.
            </h2>
            <p className="text-sm leading-6 text-slate-200">
                Deploy domain-specific AI agents that leverage enterprise knowledge, execute core financial workflows, integrate with APIs, mask PII, and deliver seamless customer experiences across chat and voice channels.
            </p>
          </div>

          {/* Domain selector */}
          <p className="mt-10 text-xs uppercase tracking-widest text-cyan-300">Select BFSI Domain</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {["Governance", "Banking", "Finance", "Insurance"].map((r) => (
              <div
                key={r}
                className={`rounded-2xl border px-4 py-3 text-sm cursor-pointer transition-all ${
                  room === r
                    ? "border-indigo-400 bg-indigo-600 text-white font-semibold"
                    : "border-white/10 bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
                onClick={() => setRoom(r)}
              >
                {r}
              </div>
            ))}
          </div>
        </section>

        {/* Right panel */}
        <section className="px-8 py-10 sm:px-12">
          <div className="max-w-md">
            <h2 className="text-2xl font-semibold text-slate-900"> Welcome to BFSI Platform</h2>
            <p className="mt-2 text-sm text-slate-500">
              Secure access to your AI assistants, customer journeys, voicebots, and enterprise services.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                placeholder="you@example.com"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Password
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                placeholder="••••••••"
              />
            </label>

            <button
              id="login-submit"
              onClick={handleLogin}
              disabled={loading}
              className="mt-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Signing In…" : "Sign In"}
            </button>
               <p className="mt-2 text-center text-sm text-slate-500">
              Don't have an account?{" "}
              <span
                className="cursor-pointer font-medium text-indigo-600 underline"
                onClick={() => navigate("/signup")}
              >
                Sign up
              </span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
