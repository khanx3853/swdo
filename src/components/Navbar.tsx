import React from 'react';
import {
  Home,
  HandCoins,
  Users,
  IdCard,
  UserCheck,
  Settings,
  FileSpreadsheet,
  BookUser,
} from 'lucide-react';
import { TabType, UserAccount } from '../types';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  currentUser: UserAccount | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  currentUser,
}) => {
  const tabs: { id: TabType; label: string; accessName: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', accessName: 'Home', icon: Home },
    { id: 'donations', label: 'Donations', accessName: 'Donations', icon: HandCoins },
    { id: 'beneficiaries', label: 'Beneficiaries', accessName: 'Beneficiaries', icon: Users },
    { id: 'members', label: 'Members', accessName: 'Members', icon: IdCard },
    { id: 'users', label: 'Users', accessName: 'Users', icon: UserCheck },
    { id: 'settings', label: 'Settings', accessName: 'Settings', icon: Settings },
    { id: 'statement', label: 'Statement', accessName: 'Statement', icon: FileSpreadsheet },
  ];

  // Filter tabs according to user's permissions
  const visibleTabs = tabs.filter((t) => {
    // Only Admin users can view Beneficiaries & Welfare Relief, Members & Cabinet Directory, Users, and Settings
    if (!currentUser || currentUser.Rights !== 'Admin') {
      // Donators / public visitors see public modules only (Home, Donations, Statement, Beneficiaries)
      return ['home', 'donations', 'statement', 'beneficiaries'].includes(t.id);
    }
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 dark:bg-slate-950/95 bg-white/95 border-t dark:border-purple-500/30 border-purple-200 lg:relative lg:border-t-0 lg:bg-transparent lg:w-20 lg:h-auto shrink-0">
      <div className="glass-card h-full p-1.5 lg:p-2.5 flex items-center lg:flex-col justify-around lg:justify-start gap-1 lg:gap-3 shadow-2xl overflow-x-auto">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              title={tab.label}
              className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center p-2 lg:p-3 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-500 dark:text-emerald-400 bg-purple-500/20 shadow-inner'
                  : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-purple-500/10'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium lg:hidden mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
