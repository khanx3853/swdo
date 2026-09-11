import React from 'react';
import { ShieldCheck, Sun, Moon, LogOut, CheckCircle2, Lock, Eye } from 'lucide-react';
import { PortalSettings, UserAccount } from '../types';
import { Logo } from './Logo';

interface HeaderProps {
  settings: PortalSettings;
  currentUser: UserAccount | null;
  theme: 'Dark' | 'Light';
  onToggleTheme: () => void;
  onLogout: () => void;
  onRequestLogin?: () => void;
  isQuotaExceeded?: boolean;
  onResetQuota?: () => void;
  dbStatus?: { ok: boolean; error?: string };
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentUser,
  theme,
  onToggleTheme,
  onLogout,
  onRequestLogin,
  isQuotaExceeded,
  onResetQuota,
  dbStatus,
}) => {
  return (
    <header className="sticky top-0 z-40 dark:bg-slate-950/90 bg-white/90 backdrop-blur-md dark:border-purple-500/30 border-purple-200 border-b px-3 sm:px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <Logo size="md" />
        <div>
          <h1 className="text-sm sm:text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-blue-400 to-fuchsia-400 leading-tight">
            {settings['Foundation Name']}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-[9px] sm:text-[10px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-[0.15em] bg-amber-500/5 dark:bg-amber-400/5 px-1.5 rounded-sm">
              ( Reg# 5514 )
            </p>
            <p className="text-[10px] sm:text-xs dark:text-slate-400 text-slate-500 hidden sm:block italic font-medium">
              {settings.SubTitle}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Quota Exceeded Warning / Retry */}
        {isQuotaExceeded && (
          <button
            type="button"
            onClick={onResetQuota}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-500 hover:bg-amber-500/20 transition-all cursor-pointer"
            title="Database limit reached. Click to try reconnecting."
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Limited Mode (Retry)</span>
          </button>
        )}

        {/* Sync Indicator */}
        {!isQuotaExceeded && dbStatus && (
          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold ${
            dbStatus.ok 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
              : 'bg-red-500/10 border-red-500/20 text-red-500'
          }`}>
            {dbStatus.ok ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
            )}
            <span className="text-[11px]">{dbStatus.ok ? 'System Live' : 'Offline Mode'}</span>
          </div>
        )}

        {!isQuotaExceeded && !dbStatus && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-500/10 border border-slate-500/20 text-xs font-semibold text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 animate-pulse" />
            <span className="text-[11px]">Syncing...</span>
          </div>
        )}

        {/* Dedicated Prominent Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'Dark' ? 'Light' : 'Dark'} Mode`}
          aria-label={`Current mode: ${theme}. Click to switch.`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 shadow-sm cursor-pointer dark:bg-slate-900/90 dark:border-purple-500/40 dark:text-slate-100 dark:hover:bg-slate-800 bg-white border-purple-200 text-slate-800 hover:bg-purple-50"
        >
          {theme === 'Dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] text-amber-300 font-semibold hidden md:inline">Dark</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-purple-600" />
              <span className="text-[11px] text-purple-700 font-semibold hidden md:inline">Light</span>
            </>
          )}
        </button>

        {/* User profile info & actions */}
        {currentUser ? (
          <div className="dark:bg-slate-900/90 bg-purple-50 border dark:border-purple-500/40 border-purple-200 rounded-xl px-2.5 py-1.5 flex items-center gap-2 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <div className="hidden md:block leading-tight text-left">
              <div className="text-xs font-bold dark:text-white text-slate-900">
                {currentUser.username}
              </div>
              <div className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold uppercase">
                {currentUser.Rights} Logged In
              </div>
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={onLogout}
              title="Sign Out / Switch to Donator View"
              className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-[11px] text-slate-300 font-medium">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Donator View</span>
            </div>
            {onRequestLogin && (
              <button
                type="button"
                onClick={onRequestLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md hover:shadow-purple-500/25 transition-all cursor-pointer border border-purple-400/40"
              >
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
