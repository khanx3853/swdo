import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Calendar,
  User,
  IdCard,
  Phone,
  MapPin,
  Briefcase,
  Coins,
  Hash,
  MessageSquare,
  Eye,
  FileCheck,
  X,
  Tag,
  Trash2,
  ShieldCheck,
  CopyPlus,
  UploadCloud,
  HeartPulse,
  FileDown,
  FileSpreadsheet,
} from 'lucide-react';
import Papa from 'papaparse';
import { Beneficiary, PortalSettings } from '../../types';
import { INITIAL_SETTINGS } from '../../data/initialData';
import {
  formatPKR,
  formatNIC,
  formatContact,
  parseAmount,
  exportBeneficiariesReportPDF,
  exportBeneficiariesCSV,
} from '../../utils/formatters';

const isWheelchairOrDisabled = (b: Beneficiary) => {
  const name = (b['Beneficiary Name'] || '').toLowerCase();
  if (
    name.includes('penaflex') ||
    name.includes('sweet') ||
    name.includes('cold drink') ||
    name.includes('decuration') ||
    name.includes('social media') ||
    name.includes('alam zaib qari')
  ) {
    return false;
  }
  const id = (b.id || '').toLowerCase();
  const tx = (b['Transaction ID'] || '').toLowerCase();
  const p = (b.Purpose || '').toLowerCase();
  const r = (b.Remarks || '').toLowerCase();

  if (
    id.startsWith('dir-') ||
    tx.startsWith('dir-') ||
    p.includes('direct financial')
  ) {
    return false;
  }

  return (
    id.startsWith('dis-') ||
    tx.startsWith('wheel-') ||
    p.includes('disabled') ||
    r.includes('disabled') ||
    p.includes('wheelchair') ||
    r.includes('wheelchair') ||
    r.includes('disability') ||
    r.includes('paralyzed') ||
    r.includes('spinal') ||
    id === 'dis-4' ||
    tx === 'wheel-04' ||
    name === 'muhammad zada' ||
    name === 'kamran ali' ||
    name === 'janan' ||
    name.includes('zia/rasheed sister') ||
    name.includes('safaid ahmed') ||
    name.includes('shafi ullah') ||
    name.includes('azaz')
  );
};

const isDirectFinancialAid = (b: Beneficiary) => {
  if (isWheelchairOrDisabled(b)) {
    return false;
  }
  const name = (b['Beneficiary Name'] || '').toLowerCase();
  if (
    name.includes('penaflex') ||
    name.includes('sweet') ||
    name.includes('cold drink') ||
    name.includes('decuration') ||
    name.includes('social media')
  ) {
    return false;
  }
  const p = (b.Purpose || '').toLowerCase();
  const r = (b.Remarks || '').toLowerCase();
  return (
    p.includes('direct financial') ||
    p.includes('patient') ||
    p.includes('incident') ||
    p.includes('accident') ||
    r.includes('patient') ||
    r.includes('accident') ||
    r.includes('incident')
  );
};

interface BeneficiariesTabProps {
  beneficiaries: Beneficiary[];
  isAdmin?: boolean;
  onRequestLogin?: () => void;
  onSaveBeneficiary: (beneficiary: Beneficiary) => void;
  onSelectBeneficiary: (beneficiary: Beneficiary) => void;
  onDeleteBeneficiary?: (id: string) => void;
  onDeleteMultipleBeneficiaries?: (ids: string[]) => void;
  onClearAllBeneficiaries?: () => void;
  onOpenMonkeyFileModal: (ben?: Beneficiary) => void;
  currentUsername: string;
  editingItem?: Beneficiary | null;
  onClearEdit?: () => void;
  settings?: PortalSettings;
}

const COMMON_PURPOSES = [
  'Direct financial beneficiaries patients, incidents, accidents',
  'Wheelchair Distribution & Expenses',
  'Medical Relief & Surgery Support',
  'Monthly Ration Pack / Food Package',
  'Education Scholarship & College Fee',
  'Widow Support & Orphan Subsistence',
  'Marriage Assistance / Dowry Aid',
  'Emergency Aid & Winter Blankets',
  'Clean Drinking Water Project',
];

const getWheelchairCountText = (b: Beneficiary) => {
  const rem = (b.Remarks || '').toLowerCase();
  const match = rem.match(/(\d+)\s*unit/);
  if (match && match[1]) {
    const num = parseInt(match[1]);
    return `${num} Wheel Chair${num > 1 ? 's' : ''}`;
  }
  const amt = Number(b.Amount) || 0;
  if (amt > 0 && amt % 15000 === 0) {
    const num = amt / 15000;
    return `${num} Wheel Chair${num > 1 ? 's' : ''}`;
  }
  return '1 Wheel Chair';
};

export const BeneficiariesTab: React.FC<BeneficiariesTabProps> = ({
  beneficiaries,
  isAdmin = false,
  onRequestLogin,
  onSaveBeneficiary,
  onSelectBeneficiary,
  onDeleteBeneficiary,
  onDeleteMultipleBeneficiaries,
  onClearAllBeneficiaries,
  onOpenMonkeyFileModal,
  currentUsername,
  editingItem,
  onClearEdit,
  settings = INITIAL_SETTINGS,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'disabled' | 'direct_financial'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const csvFileInputRef = React.useRef<HTMLInputElement>(null);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [nicNo, setNicNo] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [address, setAddress] = useState('');
  const [profession, setProfession] = useState('');
  const [purpose, setPurpose] = useState('Medical Relief & Surgery Support');
  const [amount, setAmount] = useState('');
  const [txId, setTxId] = useState(`BEN-${Math.floor(1000 + Math.random() * 9000)}`);
  const [remarks, setRemarks] = useState('');

  const [isEditingWcBanner, setIsEditingWcBanner] = useState(false);
  const [customWcCount, setCustomWcCount] = useState<string>(() => {
    const saved = localStorage.getItem('swdo_banner_wc_count');
    return saved !== null ? saved : '';
  });
  const [customWcAmount, setCustomWcAmount] = useState<string>(() => {
    const saved = localStorage.getItem('swdo_banner_wc_amount');
    if (saved === '135000' || !saved) {
      localStorage.removeItem('swdo_banner_wc_amount');
      return '';
    }
    return saved;
  });

  const [isEditingDfBanner, setIsEditingDfBanner] = useState(false);
  const [customDfCount, setCustomDfCount] = useState<string>(() => localStorage.getItem('swdo_banner_df_count') || '');
  const [customDfAmount, setCustomDfAmount] = useState<string>(() => localStorage.getItem('swdo_banner_df_amount') || '');



  React.useEffect(() => {
    if (editingItem) {
      setDate(editingItem.Date);
      setName(editingItem['Beneficiary Name']);
      setFatherName(editingItem['Father Name'] || '');
      setNicNo(editingItem['NIC No'] || '');
      setContactNo(editingItem['Contact No'] || '');
      setAddress(editingItem['Permanent Address'] || '');
      setProfession(editingItem.Profession || '');
      setPurpose(editingItem.Purpose || 'Medical Relief & Surgery Support');
      setAmount(editingItem.Amount.toString());
      setTxId(editingItem['Transaction ID'] || '');
      setRemarks(editingItem.Remarks || '');
      setEditingId(editingItem.id);
      setShowForm(true);
    }
  }, [editingItem]);

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setName('');
    setFatherName('');
    setNicNo('');
    setContactNo('');
    setAddress('');
    setProfession('');
    setPurpose('Medical Relief & Surgery Support');
    setAmount('');
    setTxId(`BEN-${Math.floor(1000 + Math.random() * 9000)}`);
    setRemarks('');
    setEditingId(null);
    if (onClearEdit) onClearEdit();
  };

  const handleToggleForm = () => {
    if (showForm) {
      resetForm();
      setShowForm(false);
    } else {
      resetForm();
      setShowForm(true);
    }
  };

  const handleDuplicateBeneficiary = (e: React.MouseEvent, item: Beneficiary) => {
    e.stopPropagation();
    setDate(new Date().toISOString().split('T')[0]);
    setName(item['Beneficiary Name']);
    setFatherName(item['Father Name'] || '');
    setNicNo(item['NIC No'] || '');
    setContactNo(item['Contact No'] || '');
    setAddress(item['Permanent Address'] || '');
    setProfession(item.Profession || '');
    setPurpose(item.Purpose || 'Medical Relief & Surgery Support');
    setAmount('');
    setTxId(`BEN-${Math.floor(1000 + Math.random() * 9000)}`);
    setRemarks(item.Remarks || '');
    setEditingId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    const parsedAmount = parseAmount(amount);

    const newBeneficiary: Beneficiary = {
      id: editingId || `ben-live-${Date.now()}`,
      Date: date,
      'Beneficiary Name': name.trim(),
      'Father Name': fatherName.trim(),
      'NIC No': nicNo.trim(),
      'Contact No': contactNo.trim(),
      'Permanent Address': address.trim(),
      Profession: profession.trim(),
      Purpose: purpose.trim(),
      Amount: parsedAmount,
      'Transaction ID': txId.trim() || `BEN-${Date.now().toString().slice(-4)}`,
      Remarks: remarks.trim(),
      VerifiedBy: 'Verification Committee',
      Status: 'Allotted',
      isLiveAdded: true,
    } as any;

    onSaveBeneficiary(newBeneficiary);
    resetForm();
    setShowForm(false);
  };

  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      const title =
        categoryFilter === 'disabled'
          ? 'Disabled Beneficiaries (Wheelchair Records) Report'
          : categoryFilter === 'direct_financial'
          ? 'Direct Financial Aid Beneficiaries Report'
          : 'All Beneficiaries & Welfare Relief Official Ledger Report';
      await exportBeneficiariesReportPDF(filtered, settings, title);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportCSV = () => {
    const prefix =
      categoryFilter === 'disabled'
        ? 'SWDO_Wheelchairs_Report'
        : categoryFilter === 'direct_financial'
        ? 'SWDO_Financial_Aid_Report'
        : 'SWDO_Beneficiaries_Report';
    exportBeneficiariesCSV(filtered, prefix);
  };



  // Filtered beneficiaries
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    let baseList = beneficiaries;
    if (categoryFilter === 'all') {
      // Exclude wheelchair / disabled beneficiaries from general list as requested
      baseList = baseList.filter((b) => !isWheelchairOrDisabled(b));
    } else if (categoryFilter === 'disabled') {
      baseList = baseList.filter(isWheelchairOrDisabled);
    } else if (categoryFilter === 'direct_financial') {
      baseList = baseList.filter(isDirectFinancialAid);
    }

    let list = !q ? baseList : baseList.filter((b) => {
      const name = (b['Beneficiary Name'] || '').toLowerCase();
      const father = (b['Father Name'] || '').toLowerCase();
      const nic = (b['NIC No'] || '').toLowerCase();
      const contact = (b['Contact No'] || '').toLowerCase();
      const purpose = (b.Purpose || '').toLowerCase();
      const addr = (b['Permanent Address'] || '').toLowerCase();
      const tx = (b['Transaction ID'] || '').toLowerCase();
      const prof = (b.Profession || '').toLowerCase();
      const rem = (b.Remarks || '').toLowerCase();

      const numQ = Number(q);
      const isNum = !isNaN(numQ) && q.length > 0 && numQ > 0;
      const matchAmt = isNum && Number(b.Amount) === numQ;

      return (
        name.includes(q) ||
        father.includes(q) ||
        nic.includes(q) ||
        contact.includes(q) ||
        purpose.includes(q) ||
        addr.includes(q) ||
        tx.includes(q) ||
        prof.includes(q) ||
        rem.includes(q) ||
        matchAmt
      );
    });

    if (q) {
      // Strict exact match override: if some records match the search term as a Name,
      // ONLY show those matching records (filters out unrelated records)
      const nameMatches = list.filter(b => (b['Beneficiary Name'] || '').toLowerCase().includes(q));
      if (nameMatches.length > 0) {
        const exact = nameMatches.filter(b => (b['Beneficiary Name'] || '').toLowerCase().trim() === q);
        list = exact.length > 0 ? exact : nameMatches;
      }
    }

    return [...list].sort((a, b) => {
      const dateA = new Date(a.Date).getTime();
      const dateB = new Date(b.Date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.id.localeCompare(a.id);
    });
  }, [beneficiaries, searchTerm, categoryFilter]);

  const totalDisbursed = useMemo(() => {
    return filtered.reduce((sum, b) => sum + parseAmount(b.Amount), 0);
  }, [filtered]);

  const nonWheelchairBeneficiaries = useMemo(() => {
    return beneficiaries.filter((b) => !isWheelchairOrDisabled(b));
  }, [beneficiaries]);

  const wheelchairBeneficiaries = useMemo(() => {
    return beneficiaries.filter(isWheelchairOrDisabled);
  }, [beneficiaries]);

  const directFinancialBeneficiaries = useMemo(() => {
    return beneficiaries.filter(isDirectFinancialAid);
  }, [beneficiaries]);

  const totalWheelchairsCount = wheelchairBeneficiaries.length;
  const totalWheelchairsAmount = wheelchairBeneficiaries.reduce((sum, b) => sum + parseAmount(b.Amount), 0);

  const effectiveWcCount = customWcCount !== '' ? Number(customWcCount) : totalWheelchairsCount;
  const effectiveWcAmount = customWcAmount !== '' ? Number(customWcAmount) : totalWheelchairsAmount;

  const totalDfCount = directFinancialBeneficiaries.length;
  const totalDfAmount = directFinancialBeneficiaries.reduce((sum, b) => sum + parseAmount(b.Amount), 0);

  const effectiveDfCount = customDfCount !== '' ? Number(customDfCount) : totalDfCount;
  const effectiveDfAmount = customDfAmount !== '' ? Number(customDfAmount) : totalDfAmount;

  // Bulk Actions Logic
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filtered.map((b) => b.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (!onDeleteMultipleBeneficiaries) return;
    onDeleteMultipleBeneficiaries(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        let importedCount = 0;
        let skippedCount = 0;

        data.forEach((row) => {
          const rawAmount = row.Amount || row['Amount'] || '0';
          const parsedAmount = parseAmount(rawAmount);
          const rawDate = row.Date || row['Date'] || new Date().toISOString().split('T')[0];
          const benName = (row['Beneficiary Name'] || row.Name || row.Beneficiary || '').toString().trim();
          const nic = (row['NIC No'] || row.NIC || '').toString().trim();
          
          if (!benName || parsedAmount <= 0) {
            skippedCount++;
            return;
          }

          // Deduplication check: Name, NIC (if exists), and Month/Year
          const monthYear = rawDate.slice(0, 7);
          const isDuplicate = beneficiaries.some(
            (b) =>
              b['Beneficiary Name'].toLowerCase() === benName.toLowerCase() &&
              (nic ? b['NIC No'] === nic : true) &&
              b.Date.slice(0, 7) === monthYear
          );

          if (isDuplicate) {
            skippedCount++;
            return;
          }

          const newBeneficiary: Beneficiary = {
            id: `ben-csv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            Date: rawDate,
            'Beneficiary Name': benName,
            'Father Name': (row['Father Name'] || row.Father || '').toString().trim(),
            'NIC No': nic,
            'Contact No': (row['Contact No'] || row.Contact || '').toString().trim(),
            'Permanent Address': (row['Permanent Address'] || row.Address || 'District Shangla, KP').toString().trim(),
            Profession: (row.Profession || 'Financial Aid Seeker').toString().trim(),
            Purpose: (row.Purpose || row.Category || 'Medical Relief & Surgery Support').toString().trim(),
            Amount: parsedAmount,
            'Transaction ID': (row['Transaction ID'] || row.TXID || row['Ref No'] || `BEN-CSV-${Math.floor(1000 + Math.random() * 9000)}`).toString().trim(),
            Remarks: (row.Remarks || 'Bulk CSV Import').toString().trim(),
            VerifiedBy: 'Verification Committee',
            Status: 'Allotted',
          };

          onSaveBeneficiary(newBeneficiary);
          importedCount++;
        });

        alert(`CSV Import Complete:\n- Imported: ${importedCount}\n- Skipped (Duplicates/Invalid): ${skippedCount}`);
        if (csvFileInputRef.current) csvFileInputRef.current.value = '';
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold dark:text-blue-300 text-blue-700 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            <span>Beneficiaries & Welfare Relief</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Disburse funds, maintain welfare records, and generate official allotment files
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all cursor-pointer border border-red-400/30"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Selected ({selectedIds.size})</span>
                </button>
              )}
              
              {beneficiaries.length > 0 && onClearAllBeneficiaries && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to remove all beneficiary records?')) {
                      onClearAllBeneficiaries();
                    }
                  }}
                  title="Remove all beneficiaries"
                  className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Remove All</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => onOpenMonkeyFileModal()}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold dark:bg-purple-950/60 bg-purple-100 text-purple-600 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 flex items-center gap-1.5 transition-all"
          >
            <FileCheck className="w-4 h-4 text-purple-400" />
            <span>Allotted Monkey File</span>
          </button>

          {/* Export Official PDF Report with Amount Consumed Totals */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Export official Beneficiaries Report with computed totals"
          >
            <FileDown className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>{isExportingPDF ? 'Generating...' : 'Export PDF'}</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 hover:bg-slate-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export CSV data with calculated totals"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {isAdmin && (
            <>
              <input
                type="file"
                ref={csvFileInputRef}
                onChange={handleCSVImport}
                accept=".csv"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => csvFileInputRef.current?.click()}
                className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-colors cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span className="hidden sm:inline">Import CSV</span>
              </button>
            </>
          )}



          {isAdmin ? (
            <button
              type="button"
              onClick={handleToggleForm}
              className="glow-button px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{showForm ? 'Close Form' : 'New Beneficiary'}</span>
            </button>
          ) : onRequestLogin ? (
            <button
              type="button"
              onClick={onRequestLogin}
              className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/40 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Admin Login</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Record Beneficiary Form */}
      {showForm && (
        <div className="glass-card p-4 sm:p-6 shadow-2xl transition-all border-purple-500/40">
          <div className="flex items-center justify-between pb-3 mb-4 border-b dark:border-purple-900/50 border-purple-200">
            <h3 className="text-sm sm:text-base font-bold dark:text-blue-400 text-blue-700 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              <span>{editingId ? 'Edit Beneficiary Record' : 'Record New Beneficiary'}</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              Verified Relief Committee Entry
            </span>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Date */}
            <div className="field-box">
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="field-input font-mono"
                placeholder="YYYY-MM-DD or Date Range"
              />
              <Calendar className="field-icon text-emerald-500 w-4 h-4" />
              <label className="field-label">Date</label>
            </div>

            {/* Name */}
            <div className="field-box">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="field-input"
                placeholder=" "
                autoComplete="off"
              />
              <User className="field-icon text-blue-500 w-4 h-4" />
              <label className="field-label">Beneficiary Name *</label>
            </div>

            {/* Father Name */}
            <div className="field-box">
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                className="field-input"
                placeholder=" "
                autoComplete="off"
              />
              <User className="field-icon text-purple-400 w-4 h-4" />
              <label className="field-label">Father / Husband Name</label>
            </div>

            {/* NIC */}
            <div className="field-box">
              <input
                type="text"
                value={nicNo}
                onChange={(e) => setNicNo(formatNIC(e.target.value))}
                maxLength={15}
                className="field-input font-mono"
                placeholder=" "
              />
              <IdCard className="field-icon text-emerald-500 w-4 h-4" />
              <label className="field-label">NIC No (xxxxx-xxxxxxx-x)</label>
            </div>

            {/* Contact */}
            <div className="field-box">
              <input
                type="text"
                value={contactNo}
                onChange={(e) => setContactNo(formatContact(e.target.value))}
                maxLength={12}
                className="field-input font-mono"
                placeholder=" "
              />
              <Phone className="field-icon text-purple-500 w-4 h-4" />
              <label className="field-label">Contact Phone No</label>
            </div>

            {/* Permanent Address */}
            <div className="field-box">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="field-input"
                placeholder=" "
              />
              <MapPin className="field-icon text-amber-500 w-4 h-4" />
              <label className="field-label">Permanent Address / Village</label>
            </div>

            {/* Profession */}
            <div className="field-box">
              <input
                type="text"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="field-input"
                placeholder=" "
              />
              <Briefcase className="field-icon text-blue-400 w-4 h-4" />
              <label className="field-label">Profession / Financial Status</label>
            </div>

            {/* Purpose */}
            <div className="field-box">
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="field-input text-xs"
              >
                {COMMON_PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <Tag className="field-icon text-fuchsia-400 w-4 h-4" />
              <label className="field-label">Relief Category / Purpose</label>
            </div>

            {/* Amount */}
            <div className="field-box">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1"
                className="field-input font-mono font-bold text-blue-500"
                placeholder=" "
              />
              <Coins className="field-icon text-blue-500 w-4 h-4" />
              <label className="field-label">Aid Amount (Rs.) *</label>
            </div>

            {/* TX ID */}
            <div className="field-box">
              <input
                type="text"
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                className="field-input font-mono"
                placeholder=" "
              />
              <Hash className="field-icon text-purple-400 w-4 h-4" />
              <label className="field-label">File / Docket Ref No</label>
            </div>

            {/* Remarks */}
            <div className="field-box md:col-span-2">
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="field-input"
                placeholder=" "
              />
              <MessageSquare className="field-icon text-slate-400 w-4 h-4" />
              <label className="field-label">Verification Remarks & Approval Notes</label>
            </div>

            {/* Buttons */}
            <div className="md:col-span-2 lg:col-span-3 flex items-center justify-end gap-3 pt-2">
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
                {editingId ? 'Update Beneficiary' : 'Save Beneficiary'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            categoryFilter === 'all'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'dark:bg-slate-900 bg-slate-100 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border dark:border-purple-900/40 border-purple-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span>All Beneficiaries</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-mono">
            {nonWheelchairBeneficiaries.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setCategoryFilter('disabled')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            categoryFilter === 'disabled'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'dark:bg-slate-900 bg-slate-100 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border dark:border-purple-900/40 border-purple-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-purple-400" />
          <span>Disabled Beneficiaries (Wheelchair Record)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 font-mono">
            {wheelchairBeneficiaries.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setCategoryFilter('direct_financial')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            categoryFilter === 'direct_financial'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'dark:bg-slate-900 bg-slate-100 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border dark:border-purple-900/40 border-purple-200'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
          <span>Direct financial beneficiaries (patients, incidents, accidents)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
            {directFinancialBeneficiaries.length}
          </span>
        </button>
      </div>

      {/* Search & Statistics Bar */}
      <div className="glass-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-purple-500/30">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by beneficiary name, NIC, purpose..."
            className="w-full pl-9 pr-4 py-2 rounded-xl dark:bg-slate-900/90 bg-white border dark:border-purple-900/40 border-purple-200 text-xs focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-red-500"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-400">Total Families: </span>
            <span className="font-bold dark:text-white text-slate-900 font-mono">
              {filtered.length}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <div>
            <span className="text-slate-400">Total Disbursed: </span>
            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
              {formatPKR(totalDisbursed)}
            </span>
          </div>
        </div>
      </div>

      {/* Empty State when no beneficiaries exist */}
      {beneficiaries.length === 0 ? (
        <div className="glass-card p-12 text-center border-purple-500/30 flex flex-col items-center justify-center my-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 dark:text-blue-400 mb-4 shadow-inner">
            <Users className="w-8 h-8 text-blue-500 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
            {isAdmin ? 'All Beneficiaries Removed' : 'No Beneficiary Records'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
            {isAdmin 
              ? 'The beneficiary ledger is clean and empty. Click below to add your own beneficiary records, grant relief aid, and generate official allotment files.'
              : 'There are currently no active welfare relief records to display in the public ledger.'}
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="glow-button px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Beneficiary</span>
            </button>
          )}
        </div>
      ) : (
        /* Table */
        <div className="glass-card shadow-2xl border-purple-500/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[620px]">
              <thead className="dark:bg-slate-900/90 bg-purple-100/60 border-b dark:border-purple-900/50 border-purple-200 text-slate-600 dark:text-slate-300">
                <tr>
                  {isAdmin && (
                    <th className="py-3 px-3 w-8">
                      <input
                        type="checkbox"
                        className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                  )}
                  <th className="py-3 px-3 font-semibold">Date</th>
                  <th className="py-3 px-3 font-semibold">Beneficiary Name</th>
                  <th className="py-3 px-3 font-semibold hidden md:table-cell">Father Name</th>
                  <th className="py-3 px-3 font-semibold hidden lg:table-cell">NIC No</th>
                  <th className="py-3 px-3 font-semibold">Relief Purpose</th>
                  <th className="py-3 px-3 font-semibold text-right">Aid Amount</th>
                  <th className="py-3 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-purple-900/30 divide-purple-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-slate-400">
                      No beneficiary records matching &quot;{searchTerm}&quot;
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => (
                    <tr
                      key={b.id}
                      className={`hover:bg-purple-500/10 transition-colors cursor-pointer ${
                        selectedIds.has(b.id) ? 'bg-blue-500/10' : ''
                      }`}
                      onClick={() => onSelectBeneficiary(b)}
                    >
                      {isAdmin && (
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                            checked={selectedIds.has(b.id)}
                            onChange={() => handleToggleSelect(b.id)}
                          />
                        </td>
                      )}
                      <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {b.Date}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold dark:text-slate-200 text-slate-800">
                          {b['Beneficiary Name']}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">
                          {b['Permanent Address']}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400 hidden md:table-cell">
                        {b['Father Name'] || '-'}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400 hidden lg:table-cell">
                        {b['NIC No'] || '-'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs leading-snug font-medium bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20 max-w-[220px]">
                          {b.Purpose}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {((b.Purpose || '').toLowerCase().includes('wheelchair') || (b.Remarks || '').toLowerCase().includes('wheelchair') || (b.Purpose || '').toLowerCase().includes('disabled')) ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {getWheelchairCountText(b)}
                          </span>
                        ) : (
                          formatPKR(b.Amount)
                        )}
                      </td>
                      <td
                        className="py-3 px-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin && onDeleteBeneficiary && (
                            <button
                              type="button"
                              onClick={() => onDeleteBeneficiary(b.id)}
                              title="Delete Beneficiary"
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:text-red-500 hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenMonkeyFileModal(b)}
                            title="Generate Allotment Monkey File"
                            className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => handleDuplicateBeneficiary(e, b)}
                              title="Add Another Record for this Person"
                              className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors"
                            >
                              <CopyPlus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectBeneficiary(b)}
                            title="View Details"
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}

              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Banners based on Active Tab */}
      {categoryFilter === 'disabled' && (
        <div className="glass-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-slate-900/40 to-blue-900/20 shadow-lg mt-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">Wheelchair Distribution Summary</h4>
              <p className="text-xs text-slate-400">Auto-calculated from live records</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {isEditingWcBanner ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <label className="text-[10px] text-slate-400 block font-medium">Units</label>
                  <input
                    type="number"
                    className="w-20 px-2 py-1 text-sm font-mono font-bold bg-slate-800 text-purple-300 rounded border border-purple-500/40 text-right"
                    value={customWcCount !== '' ? customWcCount : totalWheelchairsCount}
                    onChange={(e) => setCustomWcCount(e.target.value)}
                  />
                </div>
                <div className="text-right">
                  <label className="text-[10px] text-slate-400 block font-medium">Total (Rs.)</label>
                  <input
                    type="number"
                    className="w-32 px-2 py-1 text-sm font-mono font-bold bg-slate-800 text-emerald-400 rounded border border-emerald-500/40 text-right"
                    value={customWcAmount !== '' ? customWcAmount : totalWheelchairsAmount}
                    onChange={(e) => setCustomWcAmount(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('swdo_banner_wc_count', customWcCount);
                    localStorage.setItem('swdo_banner_wc_amount', customWcAmount);
                    setIsEditingWcBanner(false);
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-[11px] text-slate-400 font-medium">Number of Wheelchairs</div>
                  <div className="text-lg font-mono font-bold text-purple-300">{effectiveWcCount} Units</div>
                </div>
                <div className="h-8 w-px bg-slate-700/60 hidden sm:block"></div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400 font-medium">Total Amount</div>
                  <div className="text-lg font-mono font-bold text-emerald-400">{formatPKR(effectiveWcAmount)}</div>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (customWcCount === '') setCustomWcCount(totalWheelchairsCount.toString());
                      if (customWcAmount === '') setCustomWcAmount(totalWheelchairsAmount.toString());
                      setIsEditingWcBanner(true);
                    }}
                    title="Edit Banner Values"
                    className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors text-xs font-bold cursor-pointer ml-2"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {categoryFilter === 'direct_financial' && (
        <div className="glass-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-emerald-500/30 bg-gradient-to-r from-emerald-900/20 via-slate-900/40 to-teal-900/20 shadow-lg mt-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Direct Financial Aid Summary (Patients, Incidents, Accidents)</h4>
              <p className="text-xs text-slate-400">Auto-calculated from live records</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {isEditingDfBanner ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <label className="text-[10px] text-slate-400 block font-medium">Beneficiaries</label>
                  <input
                    type="number"
                    className="w-20 px-2 py-1 text-sm font-mono font-bold bg-slate-800 text-emerald-300 rounded border border-emerald-500/40 text-right"
                    value={customDfCount !== '' ? customDfCount : totalDfCount}
                    onChange={(e) => setCustomDfCount(e.target.value)}
                  />
                </div>
                <div className="text-right">
                  <label className="text-[10px] text-slate-400 block font-medium">Total (Rs.)</label>
                  <input
                    type="number"
                    className="w-32 px-2 py-1 text-sm font-mono font-bold bg-slate-800 text-emerald-400 rounded border border-emerald-500/40 text-right"
                    value={customDfAmount !== '' ? customDfAmount : totalDfAmount}
                    onChange={(e) => setCustomDfAmount(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('swdo_banner_df_count', customDfCount);
                    localStorage.setItem('swdo_banner_df_amount', customDfAmount);
                    setIsEditingDfBanner(false);
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-[11px] text-slate-400 font-medium">Number of Beneficiaries</div>
                  <div className="text-lg font-mono font-bold text-emerald-300">{effectiveDfCount} Individuals</div>
                </div>
                <div className="h-8 w-px bg-slate-700/60 hidden sm:block"></div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400 font-medium">Total Amount</div>
                  <div className="text-lg font-mono font-bold text-emerald-400">{formatPKR(effectiveDfAmount)}</div>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (customDfCount === '') setCustomDfCount(totalDfCount.toString());
                      if (customDfAmount === '') setCustomDfAmount(totalDfAmount.toString());
                      setIsEditingDfBanner(true);
                    }}
                    title="Edit Banner Values"
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors text-xs font-bold cursor-pointer ml-2"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {categoryFilter === 'all' && (
        <div className="glass-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-blue-500/30 bg-gradient-to-r from-blue-900/20 via-slate-900/40 to-slate-900/20 shadow-lg mt-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">All Beneficiaries Summary</h4>
              <p className="text-xs text-slate-400">Total records & live disbursements (excluding wheelchair members)</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[11px] text-slate-400 font-medium">Total Beneficiaries</div>
              <div className="text-lg font-mono font-bold text-blue-300">{filtered.length} Records</div>
            </div>
            <div className="h-8 w-px bg-slate-700/60 hidden sm:block"></div>
            <div className="text-right">
              <div className="text-[11px] text-slate-400 font-medium">Total Amount Disbursed</div>
              <div className="text-lg font-mono font-bold text-emerald-400">{formatPKR(totalDisbursed)}</div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
