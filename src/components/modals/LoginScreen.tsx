import React, { useState } from 'react';
import {
  Shield,
  Key,
  Sun,
  Moon,
  ArrowRight,
  UserCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UserAccount, PortalSettings } from '../../types';
import { Logo } from '../Logo';

interface LoginScreenProps {
  users: UserAccount[];
  settings: PortalSettings;
  theme: 'Dark' | 'Light';
  onToggleTheme: () => void;
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  settings,
  theme,
  onToggleTheme,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const found = users.find(
      (u) =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        (u.password === password || !u.password)
    );

    if (found) {
      onLoginSuccess(found);
    } else {
      setErrorMessage('Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden dark:bg-slate-950 bg-slate-50 dark:text-slate-100 text-slate-800 transition-colors">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 dark:bg-purple-600/15 bg-purple-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 dark:bg-emerald-600/15 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="glass-card max-w-md w-full p-6 sm:p-8 shadow-2xl relative border-purple-500/40 z-10">
        {/* Top bar with Theme Switcher */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
            Official Web Portal v2.0
          </span>
          <button
            type="button"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'Dark' ? 'Light' : 'Dark'} Mode`}
            className="px-2.5 py-1 rounded-xl dark:bg-slate-900 bg-purple-50 border dark:border-purple-500/30 border-purple-200 flex items-center gap-1.5 text-xs font-semibold dark:text-slate-200 text-slate-700 hover:text-emerald-500 transition-colors"
          >
            {theme === 'Dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-amber-300">Dark</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-[11px] text-purple-700">Light</span>
              </>
            )}
          </button>
        </div>

        {/* Logo & Headline */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Logo size="xl" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-blue-400 to-fuchsia-400 tracking-tight leading-tight">
            {settings['Foundation Name']}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {settings.SubTitle}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username */}
          <div className="field-box">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="field-input text-sm"
              placeholder=" "
              autoComplete="username"
            />
            <Shield className="field-icon text-emerald-400 w-4 h-4" />
            <label className="field-label">Portal Username</label>
          </div>

          {/* Password */}
          <div className="field-box relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="field-input text-sm font-mono pr-10"
              placeholder=" "
              autoComplete="current-password"
            />
            <Key className="field-icon text-purple-400 w-4 h-4" />
            <label className="field-label">Security Password</label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
              {errorMessage}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="glow-button w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <span>Sign In to System</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
