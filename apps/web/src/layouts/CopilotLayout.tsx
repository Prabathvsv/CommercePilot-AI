import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Sparkles, Target, Activity, BarChart3, Megaphone, LogOut } from 'lucide-react';
import Copilot from '../components/Copilot';
import { getMerchant, logout } from '../services/auth';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/opportunities', label: 'Opportunities', icon: Sparkles },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/campaigns/builder', label: 'Campaign Builder', icon: Target },
  { to: '/agents', label: 'Agent Activity', icon: Activity },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function CopilotLayout() {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const navigate = useNavigate();
  const merchant = getMerchant();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white leading-tight">CommercePilot</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Agentic Growth Engine</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500 dark:text-slate-400">{merchant?.businessName ?? 'BrewHaus Coffee Co.'}</div>
          <div className="text-xs font-medium text-slate-700 dark:text-slate-200">{merchant?.email ?? 'merchant@commercepilot.ai'}</div>
          <button
            onClick={handleLogout}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-red-300 hover:text-red-600"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6">
          <h1 className="font-semibold text-slate-800 dark:text-white">Merchant Dashboard</h1>
          <button
            onClick={() => setCopilotOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-slate-700 text-white px-3 py-1.5 text-sm font-medium hover:bg-slate-700 dark:hover:bg-slate-600"
          >
            <Sparkles className="w-4 h-4" />
            Ask Copilot
          </button>
        </header>
        <div className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Floating copilot button */}
      <button
        onClick={() => setCopilotOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-brand-600 text-white shadow-lg flex items-center justify-center hover:bg-brand-700 transition-transform hover:scale-105 z-40"
        aria-label="Open CommercePilot AI"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {copilotOpen && <Copilot onClose={() => setCopilotOpen(false)} />}
    </div>
  );
}
