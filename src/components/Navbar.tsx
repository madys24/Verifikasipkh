import { User } from 'firebase/auth';
import { LogOut, FileSpreadsheet, Activity, ChevronDown, CheckCircle2, Lock, LogIn } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  spreadsheetId: string | null;
  folderId: string | null;
  onLogout: () => void;
  syncing: boolean;
  onSync: () => void;
  activeTab: 'dashboard' | 'form' | 'history' | 'queue' | 'families';
  setActiveTab: (tab: 'dashboard' | 'form' | 'history' | 'queue' | 'families') => void;
  queueCount?: number;
  onAdminLoginClick?: () => void;
}

export default function Navbar({
  user,
  spreadsheetId,
  folderId,
  onLogout,
  syncing,
  onSync,
  activeTab,
  setActiveTab,
  queueCount = 0,
  onAdminLoginClick,
}: NavbarProps) {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm" id="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Brand header */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Activity className="w-5.5 h-5.5 animate-pulse" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900 tracking-tight font-sans block">
                  Sistem Verifikasi PKH
                </span>
                <span className="block text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                  Health Commitment Tracker
                </span>
              </div>
            </div>
          </div>

          {/* Nav Tabs - Hide dashboard/history if public/KPM */}
          <div className="hidden md:flex space-x-1 items-center">
            {user && (
              <button
                id="tab-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Dashboard
              </button>
            )}

            <button
              id="tab-form"
              onClick={() => setActiveTab('form')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'form'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Formulir Lapor KPM
            </button>

            {user && (
              <>
                <button
                  id="tab-queue"
                  onClick={() => setActiveTab('queue')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 relative flex items-center gap-1.5 ${
                    activeTab === 'queue'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span>Antrean Laporan</span>
                  {queueCount > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-4 text-center animate-bounce">
                      {queueCount}
                    </span>
                  )}
                </button>

                <button
                  id="tab-history"
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'history'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Riwayat Data
                </button>

                <button
                  id="tab-families"
                  onClick={() => setActiveTab('families')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'families'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Data Keluarga (KPM)
                </button>
              </>
            )}
          </div>

          {/* Sync status & User controls */}
          <div className="flex items-center gap-4">
            {/* Real-time Google Workspace Status Indicator */}
            {user && (
              <div className="hidden lg:flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-700">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Database Terpusat Aktif</span>
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <span className="block text-xs font-bold text-slate-900">
                    {user.displayName || 'Petugas'} (Admin)
                  </span>
                  <span className="block text-[10px] text-slate-500 max-w-[120px] truncate">
                    {user.email}
                  </span>
                </div>

                <div className="relative group">
                  <img
                    className="h-9 w-9 rounded-full border-2 border-indigo-500 shadow-xs hover:border-indigo-600 transition-all cursor-pointer"
                    src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName || 'P'}`}
                    alt="User photo"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Hover dropdown logout button */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 hidden group-hover:block hover:block z-50">
                    <button
                      id="btn-logout"
                      onClick={onLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-rose-50 flex items-center gap-2 transition-colors font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      Keluar Admin
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={onAdminLoginClick}
                className="inline-flex items-center gap-1.5 bg-slate-905 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Masuk Admin
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav Sticky footer or sub-menu */}
      <div className="md:hidden flex border-t border-slate-100" id="mobile-tabs">
        {user && (
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 text-center py-3 text-xs font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
                : 'text-slate-500'
            }`}
          >
            Dashboard
          </button>
        )}
        <button
          onClick={() => setActiveTab('form')}
          className={`flex-1 text-center py-3 text-xs font-bold transition-all ${
            activeTab === 'form'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
              : 'text-slate-500'
          }`}
        >
          Form Lapor
        </button>
        {user && (
          <>
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 text-center py-3 text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'queue'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
                  : 'text-slate-500'
              }`}
            >
              <span>Antrean</span>
              {queueCount > 0 && (
                <span className="bg-amber-500 text-white text-[9px] font-bold px-1 rounded-full">
                  {queueCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 text-center py-3 text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
                  : 'text-slate-500'
              }`}
            >
              Riwayat
            </button>
            <button
              onClick={() => setActiveTab('families')}
              className={`flex-1 text-center py-3 text-xs font-bold transition-all ${
                activeTab === 'families'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
                  : 'text-slate-500'
              }`}
            >
              Keluarga
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
