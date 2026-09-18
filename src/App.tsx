/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Donation,
  Beneficiary,
  Member,
  UserAccount,
  PortalSettings,
  TabType,
} from './types';
import {
  INITIAL_DONATIONS,
  INITIAL_BENEFICIARIES,
  INITIAL_MEMBERS,
  INITIAL_USERS,
  INITIAL_SETTINGS,
} from './data/initialData';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { HomeTab } from './components/tabs/HomeTab';
import { DonationsTab } from './components/tabs/DonationsTab';
import { BeneficiariesTab, isDirectFinancialAid } from './components/tabs/BeneficiariesTab';
import { MembersTab } from './components/tabs/MembersTab';
import { UsersTab } from './components/tabs/UsersTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { StatementTab } from './components/tabs/StatementTab';
import { SmsLogsTab } from './components/tabs/SmsLogsTab';
import { AnalyticsTab } from './components/tabs/AnalyticsTab';
import { DetailModal } from './components/modals/DetailModal';
import { MonkeyFileModal } from './components/modals/MonkeyFileModal';
import { DeleteModal } from './components/modals/DeleteModal';
import { AdminLoginModal } from './components/modals/AdminLoginModal';
import { DonateModal } from './components/modals/DonateModal';
import { Toast, ToastMessage } from './components/Toast';
import {
  generateDonationReceiptPDF,
  generateMonkeyFilePDF,
} from './utils/formatters';
import { playSuccessChime } from './utils/audio';
import { checkSupabaseConnection, isSupabaseConfigured } from './lib/supabase';
import {
  subscribeCollection,
  subscribeDocument,
  fetchCollection,
  fetchDocument,
  saveToFirestore,
  deleteFromFirestore,
  saveDocToFirestore,
  isQuotaExceeded,
  resetQuotaFlag,
} from './lib/firestoreSync';
import { MessageCircle, ExternalLink, Mail, Facebook, Heart, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Theme state - defaults to 'Dark'
  const [theme, setTheme] = useState<'Dark' | 'Light'>(() => {
    const saved = localStorage.getItem('swdo_theme') || localStorage.getItem('alkhair_theme');
    return (saved as 'Dark' | 'Light') || 'Dark';
  });

  // Current logged in user (Defaults to null for public donator view, or restores saved session)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('alkhair_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const isAdmin = currentUser?.Rights === 'Admin';

  // Data collections - synced live with persistent server store and local cache
  const [donations, setDonations] = useState<Donation[]>(() => {
    try {
      const saved = localStorage.getItem('swdo_donations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  });

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(() => {
    try {
      const saved = localStorage.getItem('swdo_beneficiaries');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  });

  const [members, setMembers] = useState<Member[]>(() => {
    try {
      const saved = localStorage.getItem('swdo_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('swdo_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return INITIAL_USERS;
  });
  const [settings, setSettings] = useState<PortalSettings>(() => {
    try {
      const saved = localStorage.getItem('alkhair_settings');
      if (saved) {
        return { ...INITIAL_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return INITIAL_SETTINGS;
  });
  const [quotaExceeded, setQuotaExceeded] = useState(isQuotaExceeded());
  const [dbStatus, setDbStatus] = useState<{ ok: boolean; error?: string } | undefined>();

  // Firestore Data Initialization & Subscriptions
  useEffect(() => {
    // Check system connectivity
    const verifyConnection = async () => {
      const status = await checkSupabaseConnection();
      setDbStatus(status as any);
    };
    verifyConnection();

    const handleOnline = () => {
      setDbStatus({ ok: true });
      resetQuotaFlag();
      setQuotaExceeded(false);
    };

    const handleOffline = () => {
      setDbStatus({ ok: false, error: 'Network Offline' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    resetQuotaFlag(); 
    setQuotaExceeded(false);

    const unsubDonations = subscribeCollection<Donation>(
      'donations',
      (data) => setDonations(data)
    );

    const unsubBeneficiaries = subscribeCollection<Beneficiary>(
      'beneficiaries',
      (data) => setBeneficiaries(data)
    );

    const unsubMembers = subscribeCollection<Member>(
      'members',
      (data) => setMembers(data)
    );

    const unsubUsers = subscribeCollection<UserAccount>(
      'users',
      (data) => setUsers(data)
    );

    const unsubSettings = subscribeDocument<PortalSettings>(
      'settings',
      'portalSettings',
      (data) => {
        if (data) {
          setSettings(prev => ({
            ...prev,
            ...data,
          }));
        }
      },
      INITIAL_SETTINGS
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubDonations();
      unsubBeneficiaries();
      unsubMembers();
      unsubUsers();
      unsubSettings();
    };
  }, []);


  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = async () => {
    // Increment trigger to force re-fetch in components like HomeTab (Gallery)
    setRefreshTrigger(prev => prev + 1);
    
    // Also re-verify general connectivity
    const status = await checkSupabaseConnection();
    setDbStatus(status as any);
    
    // Reset quota flag in case it was a temporary glitch
    resetQuotaFlag();
    setQuotaExceeded(false);
    
    showToast('Data refresh triggered...', 'info');
  };

  // Modals state
  const [selectedDetail, setSelectedDetail] = useState<{
    item: any;
    type: 'donation' | 'beneficiary' | 'member' | null;
  }>({ item: null, type: null });

  const [editingItemState, setEditingItemState] = useState<{
    item: any;
    type: 'donation' | 'beneficiary' | 'member' | null;
  }>({ item: null, type: null });

  const [monkeyFileModalOpen, setMonkeyFileModalOpen] = useState(false);
  const [selectedBenForFile, setSelectedBenForFile] = useState<Beneficiary | null>(null);
  const [adminLoginModalOpen, setAdminLoginModalOpen] = useState(false);
  const [donateModalOpen, setDonateModalOpen] = useState(false);

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    item: any;
    type: string;
    title: string;
    message: string;
  }>({
    isOpen: false,
    item: null,
    type: '',
    title: '',
    message: '',
  });

  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({
      id: `toast-${Date.now()}`,
      message,
      type,
    });
  };

  // Sync theme with HTML & BODY classes
  useEffect(() => {
    if (theme === 'Dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('swdo_theme', theme);
  }, [theme]);

  // Sync settings and user session (these are small and safe)
  useEffect(() => {
    localStorage.setItem('alkhair_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('alkhair_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('alkhair_current_user');
    }
  }, [currentUser]);

  // Real-time synchronization across browser tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || !e.newValue) return;
      try {
        if (e.key === 'swdo_donations') {
          setDonations(JSON.parse(e.newValue));
        } else if (e.key === 'swdo_beneficiaries') {
          setBeneficiaries(JSON.parse(e.newValue));
        } else if (e.key === 'swdo_members') {
          setMembers(JSON.parse(e.newValue));
        } else if (e.key === 'swdo_users') {
          setUsers(JSON.parse(e.newValue));
        } else if (e.key === 'alkhair_settings') {
          setSettings(JSON.parse(e.newValue));
        } else if (e.key === 'swdo_theme') {
          setTheme(e.newValue as 'Dark' | 'Light');
        }
      } catch (err) {
        console.error('Storage sync error:', err);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'Dark' ? 'Light' : 'Dark'));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('home');
    showToast('Signed out of portal', 'info');
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.Theme) {
      setTheme(user.Theme);
    }
    showToast(`Welcome back, ${user.username}! Signed in as ${user.Rights}`, 'success');
  };

  // Save Handlers - persists live to Firestore
  const handleSaveDonation = async (donation: Donation) => {
    console.log('Saving donation:', donation);
    playSuccessChime();

    // Optimistic update
    setDonations(prev => {
      const index = prev.findIndex(d => d.id === donation.id);
      if (index >= 0) {
        const newDonations = [...prev];
        newDonations[index] = donation;
        return newDonations;
      }
      return [donation, ...prev];
    });

    try {
      // Trigger background email & SMS notification concurrently with database save for immediate delivery
      const isApproved = donation.Status === 'Approved';
      const isSmsPermittedBySetting = isApproved ? (settings?.AutoSmsApproval !== false) : (settings?.AutoSmsSubmission !== false);
      const shouldSendSms = donation.SendSms === true || (donation.SendSms !== false && isSmsPermittedBySetting);
      const isPublicSubmission = donation.Source === 'Live' && donation.Status === 'Pending';
      const hasPhone = Boolean(donation['Contact No'] && !donation['Contact No'].includes('@'));

      const notifPromise = (isPublicSubmission || shouldSendSms || hasPhone)
        ? fetch('/api/notify-donation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...donation,
              SendSms: shouldSendSms,
              VeevoSmsHash: settings?.VeevoSmsHash || 'd9eb3e26f4532bcbbca611804241635a',
              VeevoSenderNum: settings?.VeevoSenderNum || 'Default',
              SmsSubmissionTemplate: settings?.SmsSubmissionTemplate,
              SmsApprovalTemplate: settings?.SmsApprovalTemplate,
            }),
          })
            .then((res) => res.json())
            .catch((err) => {
              console.warn('Error dispatching notification email/sms:', err);
              return null;
            })
        : Promise.resolve(null);

      const [_, notifResult] = await Promise.all([
        saveToFirestore('donations', donation).catch((err) => {
          console.warn('saveToFirestore non-fatal warning:', err);
        }),
        notifPromise,
      ]);

      if (donation.Status === 'Pending') {
        showToast(`Donation proof from ${donation['Donor Name']} submitted for admin approval!`, 'info');
      } else {
        showToast(`Donation from ${donation['Donor Name']} saved!`, 'success');
      }

      return { success: true, notifResult };
    } catch (err: any) {
      console.error('Save error:', err);
      showToast(`Failed to save donation: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  const handleApproveDonation = async (id: string, customApprover?: string) => {
    const item = donations.find((d) => d.id === id);
    if (item) {
      try {
        // Default to 'Ali' if no specific username is provided
        const rawApprover = customApprover || 
                           (currentUser?.username && currentUser.username.toLowerCase() !== 'admin' 
                             ? currentUser.username 
                             : 'Ali');
        const formattedApprover = rawApprover.charAt(0).toUpperCase() + rawApprover.slice(1);
        const updated: Donation = {
          ...item,
          Status: 'Approved',
          ApprovedBy: formattedApprover,
          ApprovedAt: new Date().toISOString(),
        };
        
        // Update local state optimistically
        setDonations(prev => prev.map(d => d.id === id ? updated : d));
        
        // Update detail modal if currently viewing this donation
        setSelectedDetail(prev => {
          if (prev.item && (prev.item as Donation).id === id) {
            return { ...prev, item: updated };
          }
          return prev;
        });

        // Save to Firestore directly
        await saveToFirestore('donations', updated);

        // Trigger email & automated SMS notification for status change to Approved
        const shouldSendApprovalSms = updated.SendSms === true || (updated.SendSms !== false && settings?.AutoSmsApproval !== false);
        fetch('/api/notify-donor-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            donation: {
              ...updated,
              SendSms: shouldSendApprovalSms,
              VeevoSmsHash: settings?.VeevoSmsHash || 'd9eb3e26f4532bcbbca611804241635a',
              VeevoSenderNum: settings?.VeevoSenderNum || 'Default',
              SmsApprovalTemplate: settings?.SmsApprovalTemplate,
            },
            status: 'Approved'
          }),
        })
          .then(res => res.json())
          .then(data => {
            if (data?.sms?.sent) {
              showToast(`Approved! Official SMS receipt delivered to ${updated['Contact No']}`, 'success');
            } else if (data?.sms?.lowBalance) {
              showToast(`Approved! (Veevo Tech SMS gateway reported low balance)`, 'info');
            }
          })
          .catch((e) => console.error('Failed to trigger approval email/sms:', e));
        
        showToast(
          `Approved donation of Rs. ${Number(item.Amount || 0).toLocaleString()} from ${item['Donor Name']} (Approved by ${formattedApprover}).`,
          'success'
        );
      } catch (error) {
        console.error('Approval error:', error);
        // Revert local state on failure
        setDonations(prev => prev.map(d => d.id === id ? item : d));
        showToast('Failed to approve donation.', 'error');
      }
    }
  };

  const handleUpdateDonationApprover = async (id: string, newApprover: string) => {
    const item = donations.find((d) => d.id === id);
    if (item) {
      try {
        const trimmed = newApprover.trim();
        const formattedApprover = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        const updated: Donation = {
          ...item,
          ApprovedBy: formattedApprover,
        };
        
        setDonations(prev => prev.map(d => d.id === id ? updated : d));
        setSelectedDetail(prev => {
          if (prev.item && (prev.item as Donation).id === id) {
            return { ...prev, item: updated };
          }
          return prev;
        });
        await saveToFirestore('donations', updated);
        showToast(`Approver updated to "${formattedApprover}"`, 'success');
      } catch (error) {
        console.error('Failed to update approver:', error);
        showToast('Failed to update approver.', 'error');
      }
    }
  };

  const handleRejectDonation = async (id: string, reason?: string) => {
    const item = donations.find((d) => d.id === id);
    if (item) {
      try {
        const updated: Donation = {
          ...item,
          Status: 'Rejected',
          RejectionReason: reason || 'Declined during review',
        };
        
        // Update local state optimistically
        setDonations(prev => prev.map(d => d.id === id ? updated : d));
        
        await saveToFirestore('donations', updated);

        // Trigger email notification for status change to Rejected
        fetch('/api/notify-donor-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ donation: updated, status: 'Rejected', reason: updated.RejectionReason }),
        }).catch((e) => console.error('Failed to trigger rejection email:', e));

        showToast('Donation submission marked as rejected.', 'info');
      } catch (err: any) {
        console.error('Rejection error:', err);
        setDonations(prev => prev.map(d => d.id === id ? item : d));
        showToast('Failed to reject donation.', 'error');
      }
    }
  };

  const handleClearAllDonations = async () => {
    setDonations([]);
    try {
      localStorage.setItem('swdo_donations', JSON.stringify([]));
      await fetch('/api/clear-donations', { method: 'POST' });
    } catch (e) {}
    showToast('All donation and donator records have been removed.', 'info');
  };

  const handleSaveBeneficiary = async (beneficiary: Beneficiary) => {
    // Optimistic update
    setBeneficiaries(prev => {
      const index = prev.findIndex(b => b.id === beneficiary.id);
      if (index >= 0) {
        const newBeneficiaries = [...prev];
        newBeneficiaries[index] = beneficiary;
        return newBeneficiaries;
      }
      return [beneficiary, ...prev];
    });

    try {
      await saveToFirestore('beneficiaries', beneficiary);

      const shouldSendSms = beneficiary.SendSms !== false && (settings?.AutoSmsBeneficiary !== false);
      if (shouldSendSms && beneficiary['Contact No']) {
        try {
          const res = await fetch('/api/notify-beneficiary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...beneficiary,
              SendSms: shouldSendSms,
              VeevoSmsHash: settings?.VeevoSmsHash,
              VeevoSenderNum: settings?.VeevoSenderNum,
              SmsBeneficiaryTemplate: settings?.SmsBeneficiaryTemplate,
            }),
          });
          const data = await res.json().catch(() => null);
          if (data?.sms?.sent) {
            showToast(`Beneficiary record for ${beneficiary['Beneficiary Name']} saved & SMS dispatched!`, 'success');
          } else if (data?.sms?.lowBalance) {
            showToast(`Beneficiary saved, but SMS failed (Low balance).`, 'info');
          } else {
            showToast(`Beneficiary record for ${beneficiary['Beneficiary Name']} saved!`);
          }
        } catch (smsErr) {
          console.warn('Error dispatching beneficiary SMS:', smsErr);
          showToast(`Beneficiary record for ${beneficiary['Beneficiary Name']} saved!`);
        }
      } else {
        showToast(`Beneficiary record for ${beneficiary['Beneficiary Name']} saved!`);
      }
    } catch (err: any) {
      console.error('Failed to save beneficiary:', err);
      showToast(`Failed to save beneficiary: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  const handleClearAllBeneficiaries = async () => {
    setBeneficiaries([]);
    try {
      localStorage.setItem('swdo_beneficiaries', JSON.stringify([]));
      await fetch('/api/clear-beneficiaries', { method: 'POST' });
    } catch (e) {}
    showToast('All beneficiary records have been removed.', 'info');
  };

  const handleSaveMember = async (member: Member) => {
    // Optimistic update
    setMembers(prev => {
      const index = prev.findIndex(m => m.id === member.id);
      if (index >= 0) {
        const newMembers = [...prev];
        newMembers[index] = member;
        return newMembers;
      }
      return [member, ...prev];
    });

    await saveToFirestore('members', member);
    showToast(`Council member ${member.Name} updated!`);
  };

  const handleClearAllMembers = async () => {
    setMembers([]);
    try {
      localStorage.setItem('swdo_members', JSON.stringify([]));
      await fetch('/api/clear-members', { method: 'POST' });
    } catch (e) {}
    showToast('All members have been removed from the directory.', 'info');
  };

  const handleSaveUser = async (user: UserAccount) => {
    // Optimistic update
    setUsers(prev => {
      const index = prev.findIndex(u => u.id === user.id || (u.username && user.username && u.username.toLowerCase() === user.username.toLowerCase()));
      let nextUsers: UserAccount[];
      if (index >= 0) {
        nextUsers = [...prev];
        nextUsers[index] = user;
      } else {
        nextUsers = [user, ...prev];
      }
      try {
        localStorage.setItem('swdo_users', JSON.stringify(nextUsers));
      } catch (e) {}
      return nextUsers;
    });

    // If the updated user is the currently logged in user, update session immediately
    if (currentUser && (currentUser.id === user.id || (currentUser.username && user.username && currentUser.username.toLowerCase() === user.username.toLowerCase()))) {
      const updatedCurrent = { ...currentUser, ...user };
      setCurrentUser(updatedCurrent);
      try {
        localStorage.setItem('alkhair_current_user', JSON.stringify(updatedCurrent));
      } catch (e) {}
    }

    await saveToFirestore('users', user);
    showToast(`User login information for '${user.username}' updated successfully!`);
  };

  // Delete flow
  const handleDeleteTrigger = (item: any, type: string) => {
    let title = 'Delete Record?';
    let message = 'Are you sure you want to permanently delete this item?';

    if (type === 'donation') {
      title = 'Delete Donation Entry';
      message = `Permanently delete donation of Rs. ${item.Amount} by ${item['Donor Name']}?`;
    } else if (type === 'beneficiary') {
      title = 'Delete Beneficiary';
      message = `Permanently delete beneficiary record for ${item['Beneficiary Name']}?`;
    } else if (type === 'member') {
      title = 'Delete Member Record';
      message = `Permanently remove ${item.Name} from the directory?`;
    } else if (type === 'user') {
      title = 'Delete User Account';
      message = `Permanently delete operator account '${item.username}'?`;
    } else if (type === 'reject_donation') {
      title = 'Reject Donation';
      message = `Are you sure you want to reject the donation from ${item['Donor Name']} for Rs. ${item.Amount}?`;
    }

    setDeleteModalState({
      isOpen: true,
      item,
      type,
      title,
      message,
    });
  };

  const handleConfirmDelete = async () => {
    const { item, type } = deleteModalState;
    if (!item) {
      setDeleteModalState((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    if (type === 'donation') {
      setDonations(prev => prev.filter(d => d.id !== item.id));
      await deleteFromFirestore('donations', item.id);
      showToast('Donation record deleted.', 'info');
    } else if (type === 'beneficiary') {
      setBeneficiaries(prev => prev.filter(b => b.id !== item.id));
      await deleteFromFirestore('beneficiaries', item.id);
      showToast('Beneficiary record deleted.', 'info');
    } else if (type === 'member') {
      setMembers(prev => prev.filter(m => m.id !== item.id));
      await deleteFromFirestore('members', item.id);
      showToast('Member record deleted.', 'info');
    } else if (type === 'user') {
      setUsers(prev => {
        const nextUsers = prev.filter(u => u.id !== item.id);
        try {
          localStorage.setItem('swdo_users', JSON.stringify(nextUsers));
        } catch (e) {}
        return nextUsers;
      });
      await deleteFromFirestore('users', item.id);
      if (currentUser && currentUser.id === item.id) {
        setCurrentUser(null);
        localStorage.removeItem('alkhair_current_user');
      }
      showToast('User account deleted.', 'info');
    } else if (type === 'reject_donation') {
      await handleRejectDonation(item.id);
    }

    setDeleteModalState((prev) => ({ ...prev, isOpen: false }));
    setSelectedDetail({ item: null, type: null });
  };


  // PDF generation triggers
  const handleExportDonationReceipt = (donation: Donation) => {
    generateDonationReceiptPDF(donation, settings);
    showToast(`PDF Receipt generated for ${donation['Donor Name']}`);
  };

  const handleExportDetailPDF = (item: any, type: string) => {
    if (type === 'donation') {
      generateDonationReceiptPDF(item as Donation, settings);
      showToast(`PDF Receipt generated for ${item['Donor Name']}`);
    } else if (type === 'beneficiary') {
      generateMonkeyFilePDF(item as Beneficiary, settings);
      showToast(`Monkey File PDF generated for ${item['Beneficiary Name']}`);
    }
  };

  // Reset settings
  const handleResetSettings = () => {
    setSettings(INITIAL_SETTINGS);
    showToast('Settings reset to system defaults');
  };

  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetQuota = () => {
    resetQuotaFlag();
    setQuotaExceeded(false);
    window.location.reload(); // Reload to retry everything
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Header (Pinned) */}
      <Header
        settings={settings}
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onLogout={handleLogout}
        onRequestLogin={() => setAdminLoginModalOpen(true)}
        isQuotaExceeded={quotaExceeded}
        onResetQuota={handleResetQuota}
        dbStatus={dbStatus}
        onRefresh={handleRefresh}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col lg:flex-row pb-16 lg:pb-0 relative">
        {/* Navigation Sidebar / Bottom bar */}
        <Navbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentUser={currentUser}
        />

        {/* Content Pane Wrapper */}
        <div className="flex-1 flex flex-col min-w-0">
          <main id="main-content" className="flex-1 p-3 sm:p-5 max-w-7xl mx-auto w-full scroll-smooth">
          {activeTab === 'home' && (
            <HomeTab
              donations={donations}
              beneficiaries={beneficiaries}
              isAdmin={isAdmin}
              onNavigate={setActiveTab}
              onSaveDonation={handleSaveDonation}
              settings={settings}
              currentUsername={currentUser?.username || 'Guest Donator'}
              onExportReceipt={handleExportDonationReceipt}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activeTab === 'donations' && (
            <DonationsTab
              donations={donations}
              beneficiaries={beneficiaries}
              isAdmin={isAdmin}
              onRequestLogin={() => setAdminLoginModalOpen(true)}
              onOpenDonateModal={() => setDonateModalOpen(true)}
              onSaveDonation={handleSaveDonation}
              onApproveDonation={handleApproveDonation}
              onRejectDonation={handleRejectDonation}
              onPromptRejectDonation={(d) => handleDeleteTrigger(d, 'reject_donation')}
              onSelectDonation={(d) => setSelectedDetail({ item: d, type: 'donation' })}
              onSelectBeneficiary={(b) => setSelectedDetail({ item: b, type: 'beneficiary' })}
              onDeleteDonation={(id) => {
                const d = donations.find((x) => x.id === id);
                if (d) handleDeleteTrigger(d, 'donation');
              }}
              onDeleteMultipleDonations={async (ids) => {
                if (window.confirm(`Permanently delete ${ids.length} selected records?`)) {
                  setDonations(prev => prev.filter(d => !ids.includes(d.id)));
                  for (const id of ids) {
                    await deleteFromFirestore('donations', id);
                  }
                  showToast(`${ids.length} records deleted successfully.`, 'info');
                }
              }}
              onClearAllDonations={handleClearAllDonations}
              onExportReceipt={handleExportDonationReceipt}
              currentUsername={currentUser?.username || 'Guest Donator'}
              editingItem={editingItemState.type === 'donation' ? editingItemState.item : null}
              onClearEdit={() => setEditingItemState({ item: null, type: null })}
              settings={settings}
            />
          )}

          {activeTab === 'beneficiaries' && (
            <BeneficiariesTab
              beneficiaries={beneficiaries.filter(b => !isDirectFinancialAid(b))}
              isAdmin={isAdmin}
              onRequestLogin={() => setAdminLoginModalOpen(true)}
              onSaveBeneficiary={handleSaveBeneficiary}
              onSelectBeneficiary={(b) => setSelectedDetail({ item: b, type: 'beneficiary' })}
              onDeleteBeneficiary={(id) => {
                const b = beneficiaries.find((x) => x.id === id);
                if (b) handleDeleteTrigger(b, 'beneficiary');
              }}
              onDeleteMultipleBeneficiaries={async (ids) => {
                if (window.confirm(`Permanently delete ${ids.length} beneficiary records?`)) {
                  setBeneficiaries(prev => prev.filter(b => !ids.includes(b.id)));
                  for (const id of ids) {
                    await deleteFromFirestore('beneficiaries', id);
                  }
                  showToast(`${ids.length} records deleted successfully.`, 'info');
                }
              }}
              onClearAllBeneficiaries={handleClearAllBeneficiaries}
              onOpenMonkeyFileModal={(ben) => {
                setSelectedBenForFile(ben || beneficiaries[0] || null);
                setMonkeyFileModalOpen(true);
              }}
              currentUsername={currentUser?.username || 'Guest Donator'}
              editingItem={editingItemState.type === 'beneficiary' ? editingItemState.item : null}
              onClearEdit={() => setEditingItemState({ item: null, type: null })}
              settings={settings}
            />
          )}

          {activeTab === 'members' && (
            isAdmin ? (
              <MembersTab
                members={members}
                isAdmin={isAdmin}
                onRequestLogin={() => setAdminLoginModalOpen(true)}
                onSaveMember={handleSaveMember}
                onSelectMember={(m) => setSelectedDetail({ item: m, type: 'member' })}
                onDeleteMember={(id) => {
                  const m = members.find((x) => x.id === id);
                  if (m) handleDeleteTrigger(m, 'member');
                }}
                onClearAllMembers={handleClearAllMembers}
                editingItem={editingItemState.type === 'member' ? editingItemState.item : null}
                onClearEdit={() => setEditingItemState({ item: null, type: null })}
              />
            ) : (
              <div className="glass-card p-8 text-center max-w-md mx-auto my-12 border-purple-500/30">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl">🔒</span>
                </div>
                <h3 className="text-base font-bold text-slate-100 mb-1">Administrator Access Required</h3>
                <p className="text-xs text-slate-400 mb-4">
                  The members and cabinet directory is restricted to authorized foundation administrators.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('home')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold dark:bg-slate-800 bg-purple-100 hover:bg-purple-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Return Home
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminLoginModalOpen(true)}
                    className="glow-button px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Admin Login
                  </button>
                </div>
              </div>
            )
          )}

          {activeTab === 'users' && (
            isAdmin ? (
              <UsersTab
                users={users}
                onSaveUser={handleSaveUser}
                onDeleteUser={(userId) => {
                  const u = users.find((x) => x.id === userId);
                  if (u) handleDeleteTrigger(u, 'user');
                }}
              />
            ) : (
              <div className="glass-card p-8 text-center max-w-md mx-auto my-12 border-purple-500/30">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl">🔒</span>
                </div>
                <h3 className="text-base font-bold text-slate-100 mb-1">Administrator Access Required</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Operator and user accounts management is restricted to authorized administrative personnel.
                </p>
                <button
                  type="button"
                  onClick={() => setAdminLoginModalOpen(true)}
                  className="glow-button px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Admin Login
                </button>
              </div>
            )
          )}

          {activeTab === 'settings' && (
            isAdmin ? (
              <SettingsTab
                settings={settings}
                onSaveSettings={(newSettings) => {
                  setSettings(newSettings);
                  try {
                    localStorage.setItem('alkhair_settings', JSON.stringify(newSettings));
                  } catch (e) {}
                  saveDocToFirestore('settings', 'portalSettings', newSettings);
                  showToast('Foundation settings saved!');
                }}
                onResetDefaults={() => {
                  setSettings(INITIAL_SETTINGS);
                  try {
                    localStorage.setItem('alkhair_settings', JSON.stringify(INITIAL_SETTINGS));
                  } catch (e) {}
                  saveDocToFirestore('settings', 'portalSettings', INITIAL_SETTINGS);
                  showToast('Settings reset to system defaults');
                }}
              />
            ) : (
              <div className="glass-card p-8 text-center max-w-md mx-auto my-12 border-purple-500/30">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl">🔒</span>
                </div>
                <h3 className="text-base font-bold text-slate-100 mb-1">Administrator Access Required</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Foundation bank accounts and portal configuration can only be edited by administrators.
                </p>
                <button
                  type="button"
                  onClick={() => setAdminLoginModalOpen(true)}
                  className="glow-button px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Admin Login
                </button>
              </div>
            )
          )}

          {activeTab === 'statement' && (
            <StatementTab
              donations={donations}
              beneficiaries={beneficiaries}
              settings={settings}
              isAdmin={isAdmin}
            />
          )}

          {activeTab === 'sms-logs' && (
            isAdmin ? (
              <SmsLogsTab
                isAdmin={isAdmin}
                settings={settings}
                onSaveSettings={(newSettings) => {
                  setSettings(newSettings);
                  try {
                    localStorage.setItem('alkhair_settings', JSON.stringify(newSettings));
                  } catch (e) {}
                  saveDocToFirestore('settings', 'portalSettings', newSettings);
                  showToast('SMS Hub settings saved successfully!');
                }}
              />
            ) : (
              <div className="glass-card p-8 text-center max-w-md mx-auto my-12 border-purple-500/30">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl">🔒</span>
                </div>
                <h3 className="text-base font-bold text-slate-100 mb-1">Administrator Access Required</h3>
                <p className="text-xs text-slate-400 mb-4">
                  SMS delivery logs and gateway audit history are restricted to administrators.
                </p>
                <button
                  type="button"
                  onClick={() => setAdminLoginModalOpen(true)}
                  className="glow-button px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Admin Login
                </button>
              </div>
            )
          )}

          {activeTab === 'analytics' && (
            isAdmin ? (
              <AnalyticsTab isAdmin={isAdmin} />
            ) : (
              <div className="glass-card p-8 text-center max-w-md mx-auto my-12 border-purple-500/30">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl">🔒</span>
                </div>
                <h3 className="text-base font-bold text-slate-100 mb-1">Administrator Access Required</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Traffic analytics and server gateway logs are restricted to administrators.
                </p>
                <button
                  type="button"
                  onClick={() => setAdminLoginModalOpen(true)}
                  className="glow-button px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Admin Login
                </button>
              </div>
            )
          )}

          {/* Global Footer (At end of content flow) */}
          <footer className="mt-12 pt-8 pb-12 border-t dark:border-purple-900/30 border-purple-200 px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 text-left">
              {/* Quick FAQ */}
              <div>
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">Common Questions</h4>
                <ul className="space-y-3">
                  {[
                    { q: "How to donate?", a: "Click 'Donate Now' & upload transfer proof." },
                    { q: "Who receives aid?", a: "Verified widows, orphans & extreme poverty cases." },
                    { q: "Is it transparent?", a: "Yes, all donations appear in live public ledger." }
                  ].map((faq, i) => (
                    <li key={i} className="space-y-1">
                      <p className="text-[11px] font-bold dark:text-slate-200 text-slate-700">Q: {faq.q}</p>
                      <p className="text-[10px] dark:text-slate-500 text-slate-400 font-medium leading-relaxed">{faq.a}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Policies */}
              <div>
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4">Trust & Policies</h4>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold dark:text-slate-200 text-slate-700">Privacy & Security</p>
                    <p className="text-[10px] dark:text-slate-500 text-slate-400 font-medium leading-relaxed">
                      Donor data is encrypted. Transparency is maintained via public logs.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold dark:text-slate-200 text-slate-700">Operational Standards</p>
                    <p className="text-[10px] dark:text-slate-500 text-slate-400 font-medium leading-relaxed">
                      Aid disbursed only after field verification & council consensus.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-4">Get In Touch</h4>
                <div className="space-y-3">
                  <p className="text-[10px] dark:text-slate-500 text-slate-400 font-medium flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-500" />
                    Office: {settings.Address}
                  </p>
                  <div className="flex flex-col gap-2">
                    <a 
                      href={`tel:${settings['Easypaisa No']}`} 
                      className="text-[11px] text-emerald-500 hover:text-emerald-400 font-bold flex items-center gap-2 transition-colors"
                    >
                      <span className="w-1 h-1 rounded-full bg-emerald-500" />
                      Call: {settings['Easypaisa No']}
                    </a>
                    <a 
                      href="mailto:swdo.kpk@gmail.com" 
                      className="text-[11px] text-blue-500 hover:text-blue-400 font-bold flex items-center gap-2 transition-colors"
                    >
                      <span className="w-1 h-1 rounded-full bg-blue-500" />
                      Email: swdo.kpk@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t dark:border-slate-900/50 border-slate-200/50 flex flex-col items-center justify-center gap-1">
              <p className="text-[10px] dark:text-slate-500 text-slate-400 font-medium">© {new Date().getFullYear()} {settings['Foundation Name']}. All rights reserved.</p>
              <p className="text-[10px] text-purple-400/80 font-black uppercase tracking-widest mt-1">Design By Junaid Khan</p>
            </div>
          </footer>
        </main>
      </div>
    </div>

    {/* Floating Back to Top Button */}
    <AnimatePresence>
      {showBackToTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          onClick={scrollToTop}
          className="fixed bottom-24 right-6 p-3 rounded-full bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 text-emerald-400 shadow-xl shadow-emerald-500/10 z-40 hover:bg-emerald-500 hover:text-white transition-all group"
          title="Back to Top"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
        </motion.button>
      )}
    </AnimatePresence>

    {/* Modals */}
      {selectedDetail.item && selectedDetail.type && (
        <DetailModal
          item={selectedDetail.item}
          type={selectedDetail.type}
          settings={settings}
          isAdmin={isAdmin}
          currentUser={currentUser}
          onUpdateDonationApprover={handleUpdateDonationApprover}
          onRequestLogin={() => setAdminLoginModalOpen(true)}
          onClose={() => setSelectedDetail({ item: null, type: null })}
          onApproveDonation={handleApproveDonation}
          onRejectDonation={handleRejectDonation}
          onEdit={(item, type) => {
            setSelectedDetail({ item: null, type: null });
            setEditingItemState({ item, type: type as any });
            if (type === 'donation') setActiveTab('donations');
            else if (type === 'beneficiary') setActiveTab('beneficiaries');
            else if (type === 'member') setActiveTab('members');
          }}
          onDelete={(item, type) => {
            handleDeleteTrigger(item, type);
          }}
          onExportPDF={handleExportDetailPDF}
        />
      )}

      {monkeyFileModalOpen && (
        <MonkeyFileModal
          beneficiaries={beneficiaries}
          selectedBeneficiary={selectedBenForFile}
          settings={settings}
          onClose={() => {
            setMonkeyFileModalOpen(false);
            setSelectedBenForFile(null);
          }}
        />
      )}

      <DeleteModal
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.title}
        message={deleteModalState.message}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={adminLoginModalOpen}
        onClose={() => setAdminLoginModalOpen(false)}
        users={users}
        settings={settings}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Donate Modal */}
      <DonateModal
        isOpen={donateModalOpen}
        onClose={() => setDonateModalOpen(false)}
        settings={settings}
        onSaveDonation={handleSaveDonation}
        currentUsername={currentUser?.username || 'Guest Donator'}
        onExportReceipt={handleExportDonationReceipt}
      />

      {/* Floating Notifications */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
