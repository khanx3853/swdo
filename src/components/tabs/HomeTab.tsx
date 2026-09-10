import React, { useState, useMemo } from 'react';
import {
  Scale,
  Users,
  Landmark,
  HandHeart,
  TrendingDown,
  Trophy,
  ArrowRight,
  HandCoins,
  FileSpreadsheet,
  FileCheck,
  HeartHandshake,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  MessageCircle,
  Facebook,
  Mail,
  ExternalLink,
  BarChart3,
  HelpCircle,
  ShieldCheck,
  FileText,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Donation, Beneficiary, TabType, PortalSettings } from '../../types';
import { formatPKR, parseAmount } from '../../utils/formatters';
import { getRealTimeFinancialMetrics } from '../../utils/auditData';
import { DonateModal } from '../modals/DonateModal';

interface HomeTabProps {
  donations: Donation[];
  beneficiaries: Beneficiary[];
  isAdmin?: boolean;
  onNavigate: (tab: TabType) => void;
  onOpenDonationModal?: () => void;
  onOpenBeneficiaryModal?: () => void;
  onSaveDonation?: (donation: Donation) => void;
  settings?: PortalSettings;
  currentUsername?: string;
  onExportReceipt?: (donation: Donation) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  donations,
  beneficiaries,
  isAdmin = false,
  onNavigate,
  onSaveDonation,
  settings,
  currentUsername,
  onExportReceipt,
}) => {
  const [showDonateModal, setShowDonateModal] = useState(false);

  // Filter approved donations for official financial balance calculations
  const approvedDonations = useMemo(() => {
    return donations.filter((d) => d.Status !== 'Pending' && d.Status !== 'Rejected');
  }, [donations]);

  const pendingDonations = useMemo(() => {
    return donations.filter((d) => d.Status === 'Pending');
  }, [donations]);

  // Monthly Data Calculation
  const monthlyData = useMemo(() => {
    const monthMap: { [key: string]: number } = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      monthMap[key] = 0;
    }

    approvedDonations.forEach(d => {
      const date = new Date(d.Date);
      if (isNaN(date.getTime())) return;
      const key = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
      if (monthMap[key] !== undefined || true) { // We want to show all months present in data or at least the last 6
        monthMap[key] = (monthMap[key] || 0) + (Number(d.Amount) || 0);
      }
    });

    return Object.entries(monthMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => {
        const [m1, y1] = a.name.split(' ');
        const [m2, y2] = b.name.split(' ');
        const d1 = new Date(parseInt(`20${y1}`), months.indexOf(m1));
        const d2 = new Date(parseInt(`20${y2}`), months.indexOf(m2));
        return d1.getTime() - d2.getTime();
      })
      .slice(-6); // Show only last 6 months for clean UI
  }, [approvedDonations]);

  // Real-time financial metrics reconciled with official audit report
  const financialMetrics = useMemo(() => {
    return getRealTimeFinancialMetrics(donations, beneficiaries);
  }, [donations, beneficiaries]);

  const totalCollections = financialMetrics.totalDonation;
  const amountConsumed = financialMetrics.totalExpenses;
  const balanceLeft = financialMetrics.remainingBalance;

  // Filtered genuine approved donations excluding summary headers
  const genuineApprovedDonations = useMemo(() => {
    return approvedDonations.filter((d) => {
      const name = (d['Donor Name'] || '').toLowerCase().trim();
      return (
        !name.includes('direct financial') &&
        !name.includes('beneficiar') &&
        !name.includes('wheelchair donation') &&
        !name.includes('total collection') &&
        !name.includes('total donation')
      );
    });
  }, [approvedDonations]);

  // Unique donors count (Official baseline 327 active contributors + live new approved)
  const uniqueDonors = useMemo(() => {
    const baseCount = 327;
    const liveNewApprovedDonors = donations.filter(
      (d) =>
        d.Status === 'Approved' &&
        (d.id.startsWith('don-live-') ||
          d.id.startsWith('live-') ||
          (d as any).isLiveAdded === true)
    );
    const liveUnique = new Set(
      liveNewApprovedDonors.map((d) => d['Donor Name'].trim().toLowerCase())
    );
    return baseCount + liveUnique.size;
  }, [donations]);

  // Beneficiaries count (Official baseline 124 assisted families + live new)
  const totalBeneficiariesCount = useMemo(() => {
    const baseCount = 124;
    const liveNewBeneficiaries = beneficiaries.filter(
      (b) =>
        b.id.startsWith('ben-live-') ||
        b.id.startsWith('live-') ||
        (b as any).isLiveAdded === true
    );
    return baseCount + liveNewBeneficiaries.length;
  }, [beneficiaries]);

  // Top 3 Donors (from approved records)
  const topDonors = useMemo(() => {
    const donorMap: { [key: string]: { total: number; count: number; address: string } } = {};
    genuineApprovedDonations.forEach((d) => {
      const name = d['Donor Name'].trim();
      if (!donorMap[name]) {
        donorMap[name] = { total: 0, count: 0, address: d['Permanent Address'] };
      }
      donorMap[name].total += Number(d.Amount) || 0;
      donorMap[name].count += 1;
    });

    return Object.entries(donorMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [genuineApprovedDonations]);

  const recentDonations = useMemo(() => {
    const sorted = [...approvedDonations].sort((a, b) => {
      const dateA = new Date(a.Date).getTime();
      const dateB = new Date(b.Date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      
      const timeA = a.ApprovedAt ? new Date(a.ApprovedAt).getTime() : 0;
      const timeB = b.ApprovedAt ? new Date(b.ApprovedAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;

      return b.id.localeCompare(a.id);
    });
    return sorted.slice(0, 4);
  }, [approvedDonations]);

  const recentBeneficiaries = useMemo(() => {
    const sorted = [...beneficiaries].sort((a, b) => {
      const dateA = new Date(a.Date).getTime();
      const dateB = new Date(b.Date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.id.localeCompare(a.id);
    });
    return sorted.slice(0, 4);
  }, [beneficiaries]);

  return (
    <div className="space-y-4">
      {/* Official Social, WhatsApp & Contact Card at the Top */}
      <div className="glass-card p-5 sm:p-7 border-purple-500/35 shadow-2xl relative overflow-hidden bg-gradient-to-br from-purple-950/40 via-slate-900/80 to-slate-950">
        <div className="flex items-start gap-3.5 sm:gap-4 mb-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
            <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h3 className="text-sm sm:text-lg font-bold dark:text-white text-slate-900 leading-snug">
              Shangla Welfare And Development Organization (S.W.D.O) Registered
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Official Support, Verified Social Channels & Inquiries
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <a
            href="https://whatsapp.com/channel/0029Vb7MONCBadmeb7ZBAl1z"
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp Channel</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>

          <a
            href="https://www.facebook.com/share/18uLBeD7CH/?mibextid=wwXIfr"
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Facebook className="w-4 h-4 fill-current" />
            <span>Facebook Page</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>

        <div className="pt-4 border-t border-purple-900/40 flex flex-col items-center justify-center gap-2.5 text-center">
          <a
            href="mailto:Swdo.kpk@gmail.com"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 hover:text-purple-200 transition-all text-xs font-mono font-medium"
          >
            <Mail className="w-4 h-4 text-purple-400" />
            <span>Swdo.kpk@gmail.com</span>
          </a>
          <p className="text-[11px] sm:text-xs text-slate-400 font-medium mb-1">
            District Shangla, Khyber Pakhtunkhwa, Pakistan
          </p>
          <div className="w-full relative group mt-2">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-300"></div>
            <button
              type="button"
              onClick={() => setShowDonateModal(true)}
              className="relative w-full p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-600 text-white shadow-xl shadow-emerald-600/25 active:scale-[0.99] transition-all flex items-center justify-between border border-emerald-400/30 cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner text-white shrink-0">
                  <HeartHandshake className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-sm sm:text-base font-extrabold tracking-wide text-white">
                        Donate Now
                      </span>
                      <span className="font-urdu text-emerald-100 text-xs sm:text-sm font-normal" dir="rtl">
                        اپنا صدقہ ،ذکات یہاں جمع کریں
                      </span>
                    </div>
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/20 text-emerald-100 border border-white/20 hidden sm:inline-block">
                      Proof Required
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-emerald-100 font-medium line-clamp-1">
                    Easypaisa: 03472021703 (ALI BAHADUR) • Meezan Bank: 00300110485989
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white text-emerald-800 text-xs sm:text-sm font-bold shadow hover:bg-emerald-50 transition-colors shrink-0 ml-2">
                <span className="hidden sm:inline">Donate</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Admin Approval Banner (Admins Only) */}
      {isAdmin && pendingDonations.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 border-2 border-amber-500/50 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-2">
                <span>{pendingDonations.length} Pending Donation Approval{pendingDonations.length > 1 ? 's' : ''}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  Verification Needed
                </span>
              </h4>
              <p className="text-[11px] text-slate-300">
                Contributors have uploaded payment screenshots. Review and approve to add them to ledger data.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('donations')}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <span>Review & Approve</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Balance Left Main Card (Admin Only) */}
      {isAdmin && (
        <div className="glass-card p-3 sm:p-4 flex items-center justify-between border-emerald-500/30 shadow-md animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Net Balance In Hand:
              </p>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Available For Welfare Operations
              </span>
            </div>
          </div>
          <h3 className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatPKR(balanceLeft)}
          </h3>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Donors */}
        <div className="glass-card p-3 flex items-center gap-3 border-emerald-500/30 hover:border-emerald-500/60 transition-all">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                No of Donors
              </p>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Active Contributors
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold dark:text-white text-slate-900 font-mono">
              {uniqueDonors}
            </h3>
          </div>
        </div>

        {/* Total Collections */}
        <div className="glass-card p-3 flex items-center gap-3 border-blue-500/30 hover:border-blue-500/60 transition-all">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
            <Landmark className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Collections
              </p>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Approved Inflows
              </span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatPKR(totalCollections)}
            </h3>
          </div>
        </div>

        {/* No of Beneficiaries */}
        <div className="glass-card p-3 flex items-center gap-3 border-purple-500/30 hover:border-purple-500/60 transition-all">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <HandHeart className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Beneficiaries
              </p>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Families Assisted
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold dark:text-white text-slate-900 font-mono">
              {totalBeneficiariesCount}
            </h3>
          </div>
        </div>

        {/* Amount Consumed */}
        <div className="glass-card p-3 flex items-center gap-3 border-fuchsia-500/30 hover:border-fuchsia-500/60 transition-all animate-fadeIn">
          <div className="w-9 h-9 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Amount Consumed
              </p>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Disbursed Aid
              </span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
              {formatPKR(amountConsumed)}
            </h3>
          </div>
        </div>
      </div>

      {/* Top 3 Donors Board */}
      <div className="glass-card p-4 shadow-xl border-purple-500/40">
        <div className="pb-2.5 border-b dark:border-purple-900/50 border-purple-200 mb-3 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold tracking-tight dark:text-emerald-300 text-emerald-700 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Top 3 Donors Honor Board</span>
          </h3>
          <button
            onClick={() => onNavigate('donations')}
            className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
          >
            <span>View All Donors</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {topDonors.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            No approved donor contributions recorded yet. Contributions will appear once approved by admin.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topDonors.map((donor, idx) => {
              const medalColors = [
                'bg-amber-500/20 text-amber-400 border-amber-500/40',
                'bg-slate-400/20 text-slate-300 border-slate-400/40',
                'bg-amber-700/20 text-amber-600 border-amber-700/40',
              ];
              const rankLabel = ['1st Champion', '2nd Contributor', '3rd Supporter'][idx];

              return (
                <div
                  key={donor.name}
                  className="dark:bg-slate-900/80 bg-white/80 p-3.5 rounded-xl border dark:border-purple-900/40 border-purple-100 flex items-center gap-3 relative overflow-hidden"
                >
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-sm ${medalColors[idx]}`}
                  >
                    #{idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold dark:text-white text-slate-900 truncate">
                      {donor.name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {donor.address}
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {formatPKR(donor.total)}
                    </div>
                  </div>
                  <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 self-start">
                    {rankLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dynamic Yearly Financial Summary - Automatically reflects any new year (2024, 2025, 2026, 2027, 2028, etc.) */}
      <div className="glass-card p-4 shadow-xl border-emerald-500/30">
        <div className="pb-2.5 border-b dark:border-emerald-900/50 border-emerald-200 mb-3 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold tracking-tight dark:text-emerald-300 text-emerald-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Yearly Financial Summary</span>
          </h3>
          <button
            onClick={() => onNavigate('statement')}
            className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
          >
            <span>View Full Statement</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {financialMetrics.yearly.map((stat) => (
            <div
              key={stat.year}
              className="p-3.5 rounded-xl border dark:bg-slate-900/80 bg-white/80 dark:border-slate-800 border-slate-200 space-y-2 hover:border-emerald-500/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Year {stat.year}
                </span>
                {isAdmin && (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      stat.netBalance >= 0
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    Net: {formatPKR(stat.netBalance)}
                  </span>
                )}
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Donations:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatPKR(stat.donations)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Expenses:</span>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {formatPKR(stat.expenses)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action Navigation Bar & Featured Donate Button */}
      <div className="space-y-3">
        {/* Prominent Donate Button */}
        <button
          onClick={() => setShowDonateModal(true)}
          className="glow-button w-full px-8 py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 mb-2"
        >
          <HandHeart className="w-5 h-5 text-white" />
          <span className="font-urdu" dir="rtl">اپنا صدقہ ،ذکات یہاں جمع کریں</span>
        </button>

        {/* Quick Action Navigation Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setShowDonateModal(true)}
            className="p-3 rounded-xl dark:bg-slate-900/80 bg-white border dark:border-purple-900/40 border-purple-200 hover:border-emerald-500 text-left transition-all group cursor-pointer"
          >
            <HandCoins className="w-5 h-5 text-emerald-500 mb-1 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold dark:text-slate-200 text-slate-800">Donate / Submit Proof</p>
            <span className="text-[10px] text-slate-500">Upload screenshot</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('beneficiaries')}
            className="p-3 rounded-xl dark:bg-slate-900/80 bg-white border dark:border-purple-900/40 border-purple-200 hover:border-blue-500 text-left transition-all group cursor-pointer"
          >
            <Users className="w-5 h-5 text-blue-500 mb-1 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold dark:text-slate-200 text-slate-800">Beneficiaries Relief</p>
            <span className="text-[10px] text-slate-500">Relief / Medical aid</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('statement')}
            className="p-3 rounded-xl dark:bg-slate-900/80 bg-white border dark:border-purple-900/40 border-purple-200 hover:border-purple-500 text-left transition-all group cursor-pointer"
          >
            <FileSpreadsheet className="w-5 h-5 text-purple-500 mb-1 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold dark:text-slate-200 text-slate-800">Financial Statement</p>
            <span className="text-[10px] text-slate-500">Date-wise audit report</span>
          </button>

          {isAdmin ? (
            <button
              type="button"
              onClick={() => onNavigate('beneficiaries')}
              className="p-3 rounded-xl dark:bg-slate-900/80 bg-white border dark:border-purple-900/40 border-purple-200 hover:border-fuchsia-500 text-left transition-all group cursor-pointer"
            >
              <FileCheck className="w-5 h-5 text-fuchsia-500 mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold dark:text-slate-200 text-slate-800">Monkey File Slip</p>
              <span className="text-[10px] text-slate-500">Allotment dossiers</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowDonateModal(true)}
              className="p-3 rounded-xl dark:bg-slate-900/80 bg-white border dark:border-purple-900/40 border-purple-200 hover:border-amber-500 text-left transition-all group cursor-pointer"
            >
              <Landmark className="w-5 h-5 text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold dark:text-slate-200 text-slate-800">Bank & QR Details</p>
              <span className="text-[10px] text-slate-500">Official payment modes</span>
            </button>
          )}
        </div>
      </div>

      {/* Two Column Section: Recent Inflows and Outflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Donations */}
        <div className="glass-card p-4 shadow-xl border-purple-500/30">
          <div className="flex items-center justify-between pb-2 border-b dark:border-purple-900/40 border-purple-200 mb-3">
            <h4 className="text-xs font-bold dark:text-emerald-400 text-emerald-700 flex items-center gap-2">
              <HandCoins className="w-4 h-4 text-emerald-500" />
              <span>Approved Donations Inflow</span>
            </h4>
            <button
              onClick={() => onNavigate('donations')}
              className="text-[11px] text-purple-500 hover:underline flex items-center gap-1 cursor-pointer"
            >
              All Inflows <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {recentDonations.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                No approved donation records yet.
              </div>
            ) : (
              recentDonations.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-2.5 rounded-lg dark:bg-slate-900/60 bg-purple-50/60 border dark:border-purple-900/30 border-purple-100 text-xs"
                >
                  <div>
                    <p className="font-bold dark:text-slate-200 text-slate-800">{d['Donor Name']}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {d.Date} • {d['Transaction ID']}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatPKR(d.Amount)}
                    </p>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400">
                      {d.Profession || 'Contributor'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Beneficiaries Outflow */}
        <div className="glass-card p-4 shadow-xl border-purple-500/30">
          <div className="flex items-center justify-between pb-2 border-b dark:border-purple-900/40 border-purple-200 mb-3">
            <h4 className="text-xs font-bold dark:text-blue-400 text-blue-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span>Recent Welfare Disbursements</span>
            </h4>
            <button
              type="button"
              onClick={() => onNavigate('beneficiaries')}
              className="text-[11px] text-purple-500 hover:underline flex items-center gap-1 cursor-pointer"
            >
              All Outflows <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {recentBeneficiaries.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                No beneficiary disbursements yet.
              </div>
            ) : (
              recentBeneficiaries.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2.5 rounded-lg dark:bg-slate-900/60 bg-purple-50/60 border dark:border-purple-900/30 border-purple-100 text-xs"
                >
                  <div>
                    <p className="font-bold dark:text-slate-200 text-slate-800">
                      {b['Beneficiary Name']}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {b.Date} • {b.Purpose}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      -{formatPKR(b.Amount)}
                    </p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 font-semibold">
                      {b.Status || 'Allotted'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Monthly Collections Chart (Compact View) */}
      <div className="glass-card p-4 border-emerald-500/20 shadow-lg bg-slate-900/40 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <BarChart3 className="w-16 h-16 text-emerald-500" />
        </div>
        
        <div className="flex items-center justify-between gap-4 mb-4 relative z-10">
          <div>
            <h3 className="text-xs font-bold dark:text-emerald-400 text-emerald-700 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 rotate-180" />
              <span>Monthly Collections Growth</span>
            </h3>
          </div>
          <div className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Analytics</span>
          </div>
        </div>

        <div className="h-[160px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 500 }}
                dy={5}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 500 }}
                tickFormatter={(value) => `₨${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  border: '1px solid rgba(249, 115, 22, 0.2)',
                  borderRadius: '8px',
                  fontSize: '10px',
                  color: '#fff'
                }}
                itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                formatter={(value: number) => [formatPKR(value), 'Collections']}
              />
              <Bar 
                dataKey="total" 
                radius={[4, 4, 0, 0]}
                barSize={24}
              >
                {monthlyData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === monthlyData.length - 1 ? '#10b881' : '#1e293b'}
                    stroke={index === monthlyData.length - 1 ? '#10b881' : '#334155'}
                    strokeWidth={1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donate Modal */}
      <DonateModal
        isOpen={showDonateModal}
        onClose={() => setShowDonateModal(false)}
        settings={settings}
        onSaveDonation={onSaveDonation}
        currentUsername={currentUsername}
        onExportReceipt={onExportReceipt}
      />
    </div>
  );
};
