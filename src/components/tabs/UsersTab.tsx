import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Shield,
  Key,
  Copy,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Search,
} from 'lucide-react';
import { UserAccount } from '../../types';

interface UsersTabProps {
  users: UserAccount[];
  onSaveUser: (user: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
}

const ALL_TABS = ['Home', 'Donations', 'Beneficiaries', 'Members', 'Users', 'Settings', 'Statement'];

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  onSaveUser,
  onDeleteUser,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rights, setRights] = useState<'Admin' | 'Checker' | 'Operator' | 'Viewer'>('Operator');
  const [access, setAccess] = useState<string[]>(['Home', 'Donations', 'Beneficiaries', 'Members']);
  const [theme, setTheme] = useState<'Dark' | 'Light'>('Dark');

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
    let p = '';
    for (let i = 0; i < 10; i++) {
      p += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(p);
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setRights('Operator');
    setAccess(['Home', 'Donations', 'Beneficiaries', 'Members']);
    setTheme('Dark');
    setEditingId(null);
  };

  const handleToggleForm = () => {
    if (showForm) {
      resetForm();
      setShowForm(false);
    } else {
      resetForm();
      generatePassword();
      setShowForm(true);
    }
  };

  const handleEdit = (u: UserAccount) => {
    setEditingId(u.id);
    setUsername(u.username);
    setPassword(u.password || 'password123');
    setRights(u.Rights);
    setAccess(u.Access || []);
    setTheme(u.Theme);
    setShowForm(true);
  };

  const handleToggleAccess = (tabName: string) => {
    if (access.includes(tabName)) {
      setAccess(access.filter((t) => t !== tabName));
    } else {
      setAccess([...access, tabName]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    const updatedUser: UserAccount = {
      id: editingId || `usr-${Date.now()}`,
      username: username.trim(),
      password: password || 'password123',
      Rights: rights,
      Access: rights === 'Admin' ? ALL_TABS : access,
      Theme: theme,
    };

    onSaveUser(updatedUser);
    resetForm();
    setShowForm(false);
  };

  const filteredUsers = React.useMemo(() => {
    if (!searchTerm.trim()) return users;
    const q = searchTerm.toLowerCase().trim();
    return users.filter((u) => {
      const uname = (u.username || '').toLowerCase();
      const role = (u.Rights || '').toLowerCase();
      const accessTabs = (u.Access || []).join(', ').toLowerCase();
      return uname.includes(q) || role.includes(q) || accessTabs.includes(q);
    });
  }, [users, searchTerm]);

  const handleCopyCredentials = (u: UserAccount) => {
    const text = `SWDO Portal Credentials:\nUsername: ${u.username}\nPassword: ${u.password || 'password123'}\nRole: ${u.Rights}`;
    navigator.clipboard.writeText(text);
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold dark:text-purple-300 text-purple-700 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-purple-500" />
            <span>Users & Access Control</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define operator accounts, role permissions, and access privileges
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleForm}
          className="glow-button px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showForm ? 'Close Form' : 'New User'}</span>
        </button>
      </div>
      
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 glass-card border-purple-500/30">
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2 rounded-xl dark:bg-slate-900/90 bg-white border dark:border-purple-900/40 border-purple-200 text-xs focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          System Accounts: {users.length} | Matches: {filteredUsers.length}
        </div>
      </div>

      {/* User Form */}
      {showForm && (
        <div className="glass-card p-4 sm:p-6 shadow-2xl transition-all border-purple-500/40">
          <div className="flex items-center justify-between pb-3 mb-4 border-b dark:border-purple-900/50 border-purple-200">
            <h3 className="text-sm sm:text-base font-bold dark:text-purple-400 text-purple-700 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>{editingId ? 'Edit User Privileges' : 'Create User Account'}</span>
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Username */}
              <div className="field-box">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="field-input"
                  placeholder=" "
                />
                <Shield className="field-icon text-purple-500 w-4 h-4" />
                <label className="field-label">User Name *</label>
              </div>

              {/* Password */}
              <div className="field-box relative">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="field-input font-mono"
                  placeholder=" "
                />
                <Key className="field-icon text-emerald-500 w-4 h-4" />
                <label className="field-label">Password *</label>
                <button
                  type="button"
                  onClick={generatePassword}
                  title="Auto generate password"
                  className="absolute right-2 top-2.5 px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-[10px] hover:bg-purple-500/30 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Gen</span>
                </button>
              </div>

              {/* Role */}
              <div className="field-box">
                <select
                  value={rights}
                  onChange={(e) => {
                    const r = e.target.value as UserAccount['Rights'];
                    setRights(r);
                    if (r === 'Admin') setAccess(ALL_TABS);
                    else if (r === 'Checker') setAccess(['Home', 'Donations', 'Beneficiaries', 'Members', 'Statement']);
                    else if (r === 'Operator') setAccess(['Home', 'Donations', 'Beneficiaries', 'Members']);
                    else setAccess(['Home', 'Statement']);
                  }}
                  className="field-input text-xs"
                >
                  <option value="Admin">Admin (Full Control)</option>
                  <option value="Checker">Checker (Relief Verification)</option>
                  <option value="Operator">Operator (Data Entry)</option>
                  <option value="Viewer">Viewer (Read Only)</option>
                </select>
                <Shield className="field-icon text-blue-500 w-4 h-4" />
                <label className="field-label">Account Role</label>
              </div>
            </div>

            {/* Access Matrix Checkboxes */}
            <div className="p-3.5 rounded-xl dark:bg-slate-900/60 bg-purple-50/50 border dark:border-purple-900/30 border-purple-100">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Accessible Modules / Permissions:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {ALL_TABS.map((tab) => (
                  <label
                    key={tab}
                    className="flex items-center gap-2 p-2 rounded-lg dark:bg-slate-800 bg-white border dark:border-purple-900/40 border-purple-100 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={access.includes(tab)}
                      onChange={() => handleToggleAccess(tab)}
                      className="rounded accent-emerald-500"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">{tab}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleToggleForm}
                className="px-4 py-2 rounded-xl text-xs font-semibold dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="glow-button px-6 py-2 rounded-xl text-xs font-bold"
              >
                {editingId ? 'Update User' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-card shadow-2xl border-purple-500/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="dark:bg-slate-900/90 bg-purple-100/60 border-b dark:border-purple-900/50 border-purple-200 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Role / Rights</th>
                <th className="py-3 px-4 font-semibold">Allowed Modules</th>
                <th className="py-3 px-4 font-semibold">Theme</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-purple-900/30 divide-purple-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                    No matching accounts found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleColors: Record<string, string> = {
                  Admin: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
                  Checker: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
                  Operator: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                  Viewer: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
                };

                return (
                  <tr key={u.id} className="hover:bg-purple-500/10 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold dark:text-slate-200 text-slate-800 flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-purple-400" />
                        <span>{u.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          roleColors[u.Rights] || roleColors.Operator
                        }`}
                      >
                        {u.Rights}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {u.Access?.map((tab) => (
                          <span
                            key={tab}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          >
                            {tab}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {u.Theme || 'Dark'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(u)}
                          title="Copy User Credentials"
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                        >
                          {copiedId === u.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(u)}
                          title="Edit User"
                          className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.username !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => onDeleteUser(u.id)}
                            title="Delete User"
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
