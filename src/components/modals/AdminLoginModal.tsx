import React, { useState } from 'react';
import {
  X,
  Lock,
  User,
  KeyRound,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { UserAccount, PortalSettings } from '../../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  settings?: PortalSettings;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  users,
  onLoginSuccess,
  settings,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);

    // Verify against existing users list or default admin fallback
    const matchedUser = users.find(
      (u) =>
        u.username.toLowerCase() === trimmedUser.toLowerCase() &&
        u.password === trimmedPass
    );

    if (matchedUser) {
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess(matchedUser);
        onClose();
      }, 300);
    } else if (
      (trimmedUser.toLowerCase() === 'admin' && trimmedPass === 'admin123') ||
      (trimmedUser.toLowerCase() === 'admin' && trimmedPass === 'admin')
    ) {
      // Fallback default admin
      const defaultAdmin: UserAccount = {
        id: 'user-admin',
        username: 'admin',
        password: trimmedPass,
        Rights: 'Admin',
        Access: ['Home', 'Donations', 'Beneficiaries', 'Members', 'Users', 'Settings', 'Statement'],
        Theme: 'Dark',
      };
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess(defaultAdmin);
        onClose();
      }, 300);
    } else {
      setTimeout(() => {
        setIsLoading(false);
        setError('Invalid username or password. Please verify credentials.');
      }, 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="glass-card max-w-md w-full p-5 sm:p-6 shadow-2xl relative border-purple-500/50 my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 pb-3 border-b dark:border-purple-900/40 border-purple-200">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg text-white">
            <Lock className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-base font-bold dark:text-slate-100 text-slate-900">
              Admin Portal Login
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {settings?.['Foundation Name'] || 'SWDO Shangla'} Management
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full py-2.5 pl-9 pr-3 rounded-xl bg-slate-900/80 border border-purple-900/50 text-white text-xs focus:border-purple-500 focus:outline-none"
              />
              <User className="w-4 h-4 text-purple-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full py-2.5 pl-9 pr-3 rounded-xl bg-slate-900/80 border border-purple-900/50 text-white text-xs font-mono focus:border-purple-500 focus:outline-none"
              />
              <KeyRound className="w-4 h-4 text-purple-400 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>{isLoading ? 'Authenticating...' : 'Sign In as Admin'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
