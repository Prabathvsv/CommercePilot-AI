import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Sparkles, Loader2, ArrowRight, LogIn } from 'lucide-react';
import { login, isAuthenticated } from '../services/auth';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('merchant@commercepilot.ai');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated()) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      setError('Invalid email or password. Use the demo account below.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="text-xl font-bold text-slate-900 dark:text-white">CommercePilot AI</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Autonomous Growth Intelligence</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-7">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Sign in to your store</h2>
          <p className="mt-1 text-sm text-slate-500">Your growth agents analyze your transactions and act on your behalf.</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="merchant@commercepilot.ai"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="••••••••"
                required
              />
            </label>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Sign In
            </button>
          </form>

          <button
            onClick={() => {
              setEmail('merchant@commercepilot.ai');
              setPassword('password123');
              setError(null);
            }}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-600"
          >
            Demo Merchant — merchant@commercepilot.ai
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          JWT-authenticated · each merchant only sees their own data
        </p>
      </div>
    </div>
  );
}
