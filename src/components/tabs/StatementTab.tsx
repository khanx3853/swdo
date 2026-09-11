import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  FileDown,
  Calendar,
  Filter,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Scale,
} from 'lucide-react';
import { Donation, Beneficiary, PortalSettings } from '../../types';
import { formatPKR, parseAmount, parseDateRange, getLogoDataUrl, addPdfWatermark } from '../../utils/formatters';
import { getRealTimeFinancialMetrics, OFFICIAL_AUDIT_REPORT } from '../../utils/auditData';
import { jsPDF } from 'jspdf';
import { NOTO_SANS_ARABIC_BASE64 } from '../../utils/fonts';
import { Logo } from '../Logo';
import { JunaidSignature } from '../JunaidSignature';

interface StatementTabProps {
  donations: Donation[];
  beneficiaries: Beneficiary[];
  settings: PortalSettings;
  isAdmin?: boolean;
}

export const StatementTab: React.FC<StatementTabProps> = ({
  donations,
  beneficiaries,
  settings,
  isAdmin = false,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [fromDate, setFromDate] = useState(() => {
    return '2024-08-01';
  });
  const [toDate, setToDate] = useState(() => {
    // Default to current date or end of month
    return new Date().toISOString().split('T')[0];
  });
  const [includeDonations, setIncludeDonations] = useState(true);
  const [includeBeneficiaries, setIncludeBeneficiaries] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamically extract all unique years from donations, beneficiaries, and base years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>(['2024', '2025', '2026']);
    const currentYear = new Date().getFullYear().toString();
    yearsSet.add(currentYear);

    // Extract years from donations
    donations.forEach((d) => {
      if (d.Date) {
        const matches = d.Date.match(/\b(20\d\d)\b/g);
        if (matches) {
          matches.forEach((y) => yearsSet.add(y));
        }
      }
    });

    // Extract years from beneficiaries
    beneficiaries.forEach((b) => {
      if (b.Date) {
        const matches = b.Date.match(/\b(20\d\d)\b/g);
        if (matches) {
          matches.forEach((y) => yearsSet.add(y));
        }
      }
    });

    return Array.from(yearsSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [donations, beneficiaries]);

  // Preset Date Filter Handlers
  const handleSetAllTime = () => {
    setFromDate('');
    setToDate('');
  };

  const handleSelectYear = (year: string) => {
    setFromDate(`${year}-01-01`);
    setToDate(`${year}-12-31`);
  };

  const handleSetThisMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    setFromDate(`${year}-${month}-01`);
    setToDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
  };

  const handleSetThisYear = () => {
    const year = new Date().getFullYear();
    setFromDate(`${year}-01-01`);
    setToDate(`${year}-12-31`);
  };

  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
    setToDate(today);
  };

  // Combined ledger entries
  const ledgerEntries = useMemo(() => {
    type LedgerRow = {
      id: string;
      date: string;
      party: string;
      ref: string;
      type: 'Donation' | 'Beneficiary';
      credit: number;
      debit: number;
      remarks: string;
      timestamp?: string;
    };

    const rows: LedgerRow[] = [];

    if (includeDonations) {
      donations
        .filter((d) => d.Status !== 'Rejected')
        .forEach((d) => {
          rows.push({
            id: `don-${d.id}`,
            date: d.Date || todayStr,
            party: d['Donor Name'] || 'Anonymous Donor',
            ref: d['Transaction ID'] || 'TXN',
            type: 'Donation',
            credit: parseAmount(d.Amount),
            debit: 0,
            remarks: d.Remarks || 'Contribution',
            timestamp: d.ApprovedAt,
          });
        });
    }

    if (includeBeneficiaries) {
      beneficiaries.forEach((b) => {
        rows.push({
          id: `ben-${b.id}`,
          date: b.Date || todayStr,
          party: b['Beneficiary Name'],
          ref: b['Transaction ID'] || 'BEN',
          type: 'Beneficiary',
          credit: 0,
          debit: parseAmount(b.Amount),
          remarks: b.Purpose || 'Relief assistance',
        });
      });
    }

    // Sort chronologically descending (newest first)
    rows.sort((a, b) => {
      const infoA = parseDateRange(a.date);
      const infoB = parseDateRange(b.date);
      if (infoB.sortTimestamp !== infoA.sortTimestamp) return infoB.sortTimestamp - infoA.sortTimestamp;
      
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;

      return b.id.localeCompare(a.id);
    });

    // Filter by date range and search query
    let filtered = rows.filter((r) => {
      const { start, end } = parseDateRange(r.date);
      const matchDate =
        (!fromDate || (end || start) >= fromDate) && (!toDate || (start || end) <= toDate);
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchDate;

      const partyStr = (r.party || '').toLowerCase();
      const refStr = (r.ref || '').toLowerCase();
      const remarksStr = (r.remarks || '').toLowerCase();
      const dateStr = (r.date || '').toLowerCase();

      const numQ = Number(q);
      const isNum = !isNaN(numQ) && q.length > 0 && numQ > 0;
      const matchAmount = isNum ? (r.credit === numQ || r.debit === numQ) : false;

      const matchQuery =
        partyStr.includes(q) ||
        refStr.includes(q) ||
        remarksStr.includes(q) ||
        dateStr.includes(q) ||
        matchAmount;

      return matchDate && matchQuery;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      // If searching for a person/party name, strictly show only matching name records
      const partyMatches = filtered.filter((r) => (r.party || '').toLowerCase().includes(q));
      if (partyMatches.length > 0) {
        const exactPartyMatches = partyMatches.filter(
          (r) => (r.party || '').toLowerCase().trim() === q
        );
        filtered = exactPartyMatches.length > 0 ? exactPartyMatches : partyMatches;
      }
    }

    // Compute running balance
    let currentBal = 0;
    return filtered.map((row) => {
      currentBal += row.credit - row.debit;
      return {
        ...row,
        runningBalance: currentBal,
      };
    });
  }, [donations, beneficiaries, fromDate, toDate, includeDonations, includeBeneficiaries, searchQuery, todayStr]);

  // Totals
  const { totalInflow, totalOutflow, netBalance } = useMemo(() => {
    const isAllTime = !fromDate && !toDate;

    if (isAllTime && !searchQuery.trim()) {
      const metrics = getRealTimeFinancialMetrics(donations, beneficiaries);
      const inflow = includeDonations ? metrics.totalDonation : 0;
      const outflow = includeBeneficiaries ? metrics.totalExpenses : 0;
      return { totalInflow: inflow, totalOutflow: outflow, netBalance: inflow - outflow };
    }

    if (!searchQuery.trim()) {
      const matchedYear = OFFICIAL_AUDIT_REPORT.yearlyStats.find(
        (s) => fromDate === `${s.year}-01-01` && toDate === `${s.year}-12-31`
      );
      if (matchedYear) {
        const newlyApprovedDonations = donations.filter(
          (d) =>
            d.Status === 'Approved' &&
            (d.Source === 'Live' ||
              (d as any).isLiveAdded === true) &&
            (d.Date || '').includes(matchedYear.year)
        );
        const newBeneficiaries = beneficiaries.filter(
          (b) =>
            (b.Source === 'Live' ||
              (b as any).isLiveAdded === true) &&
            (b.Date || '').includes(matchedYear.year)
        );
        const liveDonationDelta = newlyApprovedDonations.reduce((sum, d) => sum + parseAmount(d.Amount), 0);
        const liveExpenseDelta = newBeneficiaries.reduce((sum, b) => sum + parseAmount(b.Amount), 0);

        const inflow = includeDonations ? matchedYear.donations + liveDonationDelta : 0;
        const outflow = includeBeneficiaries ? matchedYear.expenses + liveExpenseDelta : 0;
        return { totalInflow: inflow, totalOutflow: outflow, netBalance: inflow - outflow };
      }
    }

    const inflow = ledgerEntries.reduce((sum, r) => sum + r.credit, 0);
    const outflow = ledgerEntries.reduce((sum, r) => sum + r.debit, 0);
    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      netBalance: inflow - outflow,
    };
  }, [
    ledgerEntries,
    fromDate,
    toDate,
    searchQuery,
    includeDonations,
    includeBeneficiaries,
    donations,
    beneficiaries,
  ]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const logoData = await getLogoDataUrl();

    // Register Urdu Font
    doc.addFileToVFS('NotoSansArabic.ttf', NOTO_SANS_ARABIC_BASE64);
    doc.addFont('NotoSansArabic.ttf', 'NotoSansArabic', 'normal');
    
    // Add watermark on first page
    addPdfWatermark(doc, logoData, 110, 110, 50, 93.5, 0.08);

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129);
    doc.text(settings['Foundation Name'].toUpperCase(), 105, 16, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(settings.SubTitle, 105, 22, { align: 'center' });
    doc.text(`Official Financial Statement (${fromDate} to ${toDate})`, 105, 27, { align: 'center' });

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 33, 182, 22, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 33, 182, 22, 2, 2, 'S');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('TOTAL INFLOWS (DONATIONS)', 20, 41);
    doc.text('TOTAL OUTFLOWS (RELIEF)', 85, 41);
    doc.text('NET PERIOD BALANCE', 150, 41);

    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129);
    doc.text(formatPKR(totalInflow), 20, 48);
    doc.setTextColor(59, 130, 246);
    doc.text(formatPKR(totalOutflow), 85, 48);
    doc.setTextColor(15, 23, 42);
    doc.text(formatPKR(netBalance), 150, 48);

    // Table Header
    let y = 64;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 5, 182, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    doc.text('Date', 14, y);
    doc.text('Particulars / Party', 30, y);
    doc.text('Type', 64, y);
    doc.text('Ref ID', 82, y);
    doc.text('Credit (+)', 118, y, { align: 'right' });
    doc.text('Debit (-)', 155, y, { align: 'right' });
    doc.text('Balance', 192, y, { align: 'right' });

    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    ledgerEntries.forEach((row) => {
      if (y > 260) {
        doc.addPage();
        addPdfWatermark(doc, logoData, 110, 110, 50, 93.5, 0.08);
        y = 20;
      }
      doc.setTextColor(71, 85, 105);
      doc.text(row.date, 14, y);
      
      const containsUrdu = /[\u0600-\u06FF]/.test(row.party);
      if (containsUrdu) {
        doc.setFont('NotoSansArabic', 'normal');
        doc.text(row.party, 30, y, { align: 'left' });
        doc.setFont('helvetica', 'normal'); // Switch back
      } else {
        doc.text(doc.splitTextToSize(row.party, 32)[0] || '', 30, y);
      }

      if (row.type === 'Donation') {
        doc.setTextColor(16, 185, 129);
        doc.text('Donated', 64, y);
      } else {
        doc.setTextColor(59, 130, 246);
        doc.text('Relief', 64, y);
      }

      doc.setTextColor(71, 85, 105);
      doc.text(row.ref, 82, y);

      doc.setTextColor(16, 185, 129);
      doc.text(row.credit > 0 ? formatPKR(row.credit) : '-', 118, y, { align: 'right' });

      doc.setTextColor(59, 130, 246);
      doc.text(row.debit > 0 ? formatPKR(row.debit) : '-', 155, y, { align: 'right' });

      doc.setTextColor(15, 23, 42);
      doc.text(formatPKR(row.runningBalance), 192, y, { align: 'right' });

      y += 6;
    });

    // Total Calculation Row
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 4, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('PERIOD TOTALS', 16, y);
    doc.text(formatPKR(totalInflow), 118, y, { align: 'right' });
    doc.text(formatPKR(totalOutflow), 155, y, { align: 'right' });
    doc.text(formatPKR(netBalance), 192, y, { align: 'right' });
    
    y += 15;

    // Signatures
    const sigY = Math.min(y + 20, 270);
    doc.setDrawColor(203, 213, 225);
    doc.line(20, sigY, 65, sigY);
    doc.text(settings.Treasurer || 'Junaid Khan', 42.5, sigY + 5, { align: 'center' });
    doc.text('Accountant / Operator', 42.5, sigY + 10, { align: 'center' });

    doc.line(80, sigY, 130, sigY);
    doc.text(settings.Secretary || 'Muhammad Parvez', 105, sigY + 5, { align: 'center' });
    doc.text('General Secretary', 105, sigY + 10, { align: 'center' });

    doc.line(145, sigY, 190, sigY);
    doc.text(settings.Chairperson || 'Ali Bahadur', 167.5, sigY + 5, { align: 'center' });
    doc.text('President / Treasurer', 167.5, sigY + 10, { align: 'center' });

    doc.save(`SWDO_Statement_${fromDate}_to_${toDate}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls (no-print) */}
      <div className="glass-card p-4 sm:p-6 shadow-2xl border-purple-500/40 no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b dark:border-purple-900/40 border-purple-200">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold dark:text-emerald-300 text-emerald-700 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
              <span>Official Financial Statement</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generate date-range financial audits, ledger histories, and signed accounts
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl text-xs font-bold dark:bg-slate-800 bg-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-500" />
                <span>Print Statement</span>
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="glow-button px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-white" />
                <span>Export PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* Date Filter Controls with Quick Presets */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-400">Statement Period & Range:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleSetAllTime}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  !fromDate && !toDate
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'dark:bg-slate-800 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                All Time
              </button>
              {availableYears.map((year) => {
                const isSelected = fromDate === `${year}-01-01` && toDate === `${year}-12-31`;
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => handleSelectYear(year)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                        : 'dark:bg-slate-800 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {year}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleSetThisMonth}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold dark:bg-slate-800 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={handleSetThisYear}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold dark:bg-slate-800 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                This Year
              </button>
              <button
                type="button"
                onClick={handleSetToday}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold dark:bg-slate-800 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                Today
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* From Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                From Date:
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full p-2 pl-8 rounded-xl dark:bg-slate-900 bg-white border dark:border-purple-900/40 border-purple-200 font-mono"
                />
                <Calendar className="w-3.5 h-3.5 text-emerald-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* To Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                To Date:
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full p-2 pl-8 rounded-xl dark:bg-slate-900 bg-white border dark:border-purple-900/40 border-purple-200 font-mono"
                />
                <Calendar className="w-3.5 h-3.5 text-blue-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Search Party */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Filter by Party / Keyword:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Qayyum, Medical, TXN..."
                  className="w-full p-2 pl-8 rounded-xl dark:bg-slate-900 bg-white border dark:border-purple-900/40 border-purple-200"
                />
                <Filter className="w-3.5 h-3.5 text-purple-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Type Filter Buttons */}
            <div className="md:col-span-4 border-t dark:border-purple-900/40 border-purple-200 pt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-400">Transaction Filter:</span>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-purple-200 dark:border-purple-900/40">
                <button
                  type="button"
                  onClick={() => {
                    setIncludeDonations(true);
                    setIncludeBeneficiaries(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    includeDonations && includeBeneficiaries
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Transactions (Combined)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIncludeDonations(true);
                    setIncludeBeneficiaries(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    includeDonations && !includeBeneficiaries
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-emerald-500/80 hover:text-emerald-400'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Donated Funds Only (Inflow)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIncludeDonations(false);
                    setIncludeBeneficiaries(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    !includeDonations && includeBeneficiaries
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-blue-500/80 hover:text-blue-400'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Disbursed Funds Only (Outflow)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Statement Document */}
      <div
        id="statement-printable"
        className="glass-card p-6 shadow-2xl border-purple-500/40 space-y-6 relative overflow-hidden"
      >
        {/* Background Watermark Logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] dark:opacity-[0.06] z-0 select-none">
          <img src="/logo.png" alt="SWDO Watermark" className="w-80 h-80 sm:w-96 sm:h-96 object-contain" />
        </div>

        <div className="relative z-10 space-y-6">
        {/* Document Letterhead */}
        <div className="text-center pb-4 border-b dark:border-purple-900/50 border-purple-200">
          <div className="flex justify-center mb-2">
            <Logo size="lg" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-blue-400 to-fuchsia-400 uppercase tracking-tight">
            {settings['Foundation Name']}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {settings.SubTitle} • {settings.Address}
          </p>
          <div className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-bold text-xs">
            Official Audit Statement: {fromDate || 'Inception'} to {toDate || 'Present'}
          </div>
        </div>

        {/* 3 Summary Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl dark:bg-slate-900/80 bg-white border border-emerald-500/30 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Total Inflow (Donations):</span>
              </p>
              <h3 className="text-base sm:text-lg font-bold text-emerald-500 font-mono mt-0.5">
                {formatPKR(totalInflow)}
              </h3>
            </div>
          </div>

          <div className="p-3.5 rounded-xl dark:bg-slate-900/80 bg-white border border-blue-500/30 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-blue-500" />
                <span>Total Outflow (Relief):</span>
              </p>
              <h3 className="text-base sm:text-lg font-bold text-blue-500 font-mono mt-0.5">
                {formatPKR(totalOutflow)}
              </h3>
            </div>
          </div>

          {isAdmin && (
            <div className="p-3.5 rounded-xl dark:bg-slate-900/80 bg-white border border-purple-500/30 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-purple-400" />
                  <span>Net Audit Balance:</span>
                </p>
                <h3 className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-300 font-mono mt-0.5">
                  {formatPKR(netBalance)}
                </h3>
              </div>
            </div>
          )}
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-xl border dark:border-purple-900/40 border-purple-200">
          <table className="w-full text-left text-xs">
            <thead className="dark:bg-slate-900 bg-purple-50 text-slate-600 dark:text-slate-300 border-b dark:border-purple-900/50 border-purple-200 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Particulars / Party</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Ref ID</th>
                <th className="py-2.5 px-3">Purpose / Remarks</th>
                <th className="py-2.5 px-3 text-right">Inflow (+)</th>
                <th className="py-2.5 px-3 text-right">Outflow (-)</th>
                <th className="py-2.5 px-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-purple-900/20 divide-purple-100 font-mono">
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 font-sans">
                    No transactions recorded within selected criteria.
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((row) => (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      row.type === 'Donation'
                        ? 'hover:bg-emerald-500/5 bg-emerald-500/[0.01]'
                        : 'hover:bg-blue-500/5 bg-blue-500/[0.01]'
                    }`}
                  >
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{row.date}</td>
                    <td className="py-2 px-3 font-sans font-semibold dark:text-slate-200 text-slate-800">
                      {row.party}
                    </td>
                    <td className="py-2 px-3 font-sans">
                      {row.type === 'Donation' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 whitespace-nowrap">
                          <TrendingUp className="w-3 h-3" />
                          Donated Fund
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 whitespace-nowrap">
                          <TrendingDown className="w-3 h-3" />
                          Disbursed Aid
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{row.ref}</td>
                    <td className="py-2 px-3 font-sans text-[11px] text-slate-500 truncate max-w-xs">
                      {row.remarks}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-500 font-bold whitespace-nowrap">
                      {row.credit > 0 ? formatPKR(row.credit) : '-'}
                    </td>
                    <td className="py-2 px-3 text-right text-blue-500 font-bold whitespace-nowrap">
                      {row.debit > 0 ? formatPKR(row.debit) : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold dark:text-slate-200 text-slate-900 whitespace-nowrap">
                      {formatPKR(row.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
              {ledgerEntries.length > 0 && (
                <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                  <td colSpan={5} className="py-4 px-3 text-right">
                    <span className="text-slate-700 dark:text-slate-300 text-sm font-bold uppercase tracking-wider">Total</span>
                  </td>
                  <td className="py-4 px-3 text-right">
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base whitespace-nowrap">
                      {formatPKR(totalInflow)}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-right">
                    <span className="text-red-600 dark:text-red-400 font-mono text-base whitespace-nowrap">
                      {formatPKR(totalOutflow)}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-right">
                    <span className={`font-mono text-base whitespace-nowrap ${netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatPKR(netBalance)}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Signatures Block */}
        <div className="pt-10 grid grid-cols-3 gap-4 text-center text-xs">
          <div className="space-y-1 relative">
            <div className="h-12 flex items-end justify-center mb-1">
              {settings.TreasurerSignature ? (
                <img
                  src={settings.TreasurerSignature}
                  alt="Junaid Khan Signature"
                  className="h-14 max-w-[130px] object-contain"
                />
              ) : (
                <JunaidSignature className="h-14 max-w-[130px] object-contain" />
              )}
            </div>
            <div className="h-0.5 w-32 mx-auto bg-slate-300 dark:bg-slate-700" />
            <p className="font-bold dark:text-slate-300 text-slate-700">{settings.Treasurer || 'Junaid Khan'}</p>
            <p className="text-[10px] text-slate-500">Accountant / Operator</p>
          </div>
          <div className="space-y-1">
            <div className="h-12" />
            <div className="h-0.5 w-32 mx-auto bg-slate-300 dark:bg-slate-700" />
            <p className="font-bold dark:text-slate-300 text-slate-700">{settings.Secretary || 'Muhammad Parvez'}</p>
            <p className="text-[10px] text-slate-500">General Secretary</p>
          </div>
          <div className="space-y-1">
            <div className="h-12" />
            <div className="h-0.5 w-32 mx-auto bg-slate-300 dark:bg-slate-700" />
            <p className="font-bold dark:text-slate-300 text-slate-700">{settings.Chairperson || 'Ali Bahadur'}</p>
            <p className="text-[10px] text-slate-500">President / Treasurer</p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
