import React, { useState, useMemo, useRef } from 'react';
import {
  HandCoins,
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
  FileText,
  X,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Check,
  UploadCloud,
  Image as ImageIcon,
  Maximize2,
  ShieldCheck,
  Sparkles,
  Filter,
  CopyPlus,
  Edit2,
  XCircle,
  Mail,
  Landmark,
  PlusCircle,
  Accessibility,
  Baby,
  Package,
  Droplets,
  DownloadCloud,
  RefreshCw,
  Link,
} from 'lucide-react';
import { generateUUID } from '../../utils/uuid';
import { Donation, Beneficiary, PortalSettings } from '../../types';
import { formatPKR, formatNIC, formatContact, exportBeneficiariesReportPDF, exportDonationsReportPDF, parseDateRange } from '../../utils/formatters';
import { compressImageFile } from '../../utils/imageUtils';
import { parsePhoneWithCountry } from '../../utils/countries';
import { CountrySelect } from '../CountrySelect';

const isMasajidBeneficiary = (b: Beneficiary) => {
  const name = (b['Beneficiary Name'] || '').toLowerCase();
  const purpose = (b.Purpose || '').toLowerCase();
  const remarks = (b.Remarks || '').toLowerCase();

  return (
    purpose.includes('masajid') ||
    purpose.includes('mosque') ||
    purpose.includes('masjid') ||
    remarks.includes('masajid') ||
    remarks.includes('mosque') ||
    remarks.includes('masjid') ||
    name.includes('masajid') ||
    name.includes('mosque') ||
    name.includes('masjid') ||
    name.includes('madrasah') ||
    purpose.includes('madrasah') ||
    remarks.includes('madrasah')
  );
};

const isWheelchairOrDisabled = (b: Beneficiary) => {
  if (isMasajidBeneficiary(b)) {
    return false;
  }
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
  if (isMasajidBeneficiary(b)) return false;
  if (isWheelchairOrDisabled(b)) return false;
  
  const name = (b['Beneficiary Name'] || '').toLowerCase();
  if (
    name.includes('penaflex') ||
    name.includes('sweet') ||
    name.includes('cold drink') ||
    name.includes('decuration') ||
    name.includes('social media')
  ) return false;

  const p = (b.Purpose || '').toLowerCase();
  const r = (b.Remarks || '').toLowerCase();
  
  // Exclude other specific categories
  if (p.includes('orphan') || r.includes('orphan') || p.includes('یتیم')) return false;
  if (p.includes('ration') || r.includes('ration') || p.includes('آٹا')) return false;
  if (p.includes('blood') || r.includes('blood')) return false;

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

const isOrphanBeneficiary = (b: Beneficiary) => {
  if (isMasajidBeneficiary(b)) return false;
  const p = (b.Purpose || '').toLowerCase();
  const r = (b.Remarks || '').toLowerCase();
  const n = (b['Beneficiary Name'] || '').toLowerCase();
  return p.includes('orphan') || r.includes('orphan') || n.includes('orphan') || p.includes('یتیم') || r.includes('یتیم');
};

const isRationBeneficiary = (b: Beneficiary) => {
  if (isMasajidBeneficiary(b)) return false;
  const p = (b.Purpose || '').toLowerCase();
  const r = (b.Remarks || '').toLowerCase();
  return p.includes('ration') || r.includes('ration') || p.includes('food') || r.includes('food') || p.includes('آٹا') || r.includes('راشن');
};

const isBloodBeneficiary = (b: Beneficiary) => {
  if (isMasajidBeneficiary(b)) return false;
  const p = (b.Purpose || '').toLowerCase();
  const r = (b.Remarks || '').toLowerCase();
  return p.includes('blood') || r.includes('blood') || p.includes('خون');
};

interface DonationsTabProps {
  donations: Donation[];
  beneficiaries?: Beneficiary[];
  isAdmin?: boolean;
  onRequestLogin?: () => void;
  onOpenDonateModal?: () => void;
  onSaveDonation: (donation: Donation) => void;
  onApproveDonation?: (id: string, approverName?: string) => void;
  onRejectDonation?: (id: string, reason?: string) => void;
  onPromptRejectDonation?: (donation: Donation) => void;
  onSelectDonation: (donation: Donation) => void;
  onSelectBeneficiary?: (beneficiary: Beneficiary) => void;
  onDeleteDonation?: (id: string) => void;
  onDeleteMultipleDonations?: (ids: string[]) => void;
  onClearAllDonations?: () => void;
  onExportReceipt: (donation: Donation) => void;
  currentUsername: string;
  editingItem?: Donation | null;
  onClearEdit?: () => void;
  settings?: PortalSettings;
}

export const DonationsTab: React.FC<DonationsTabProps> = ({
  donations,
  beneficiaries = [],
  isAdmin = false,
  onRequestLogin,
  onOpenDonateModal,
  onSaveDonation,
  onApproveDonation,
  onRejectDonation,
  onPromptRejectDonation,
  onSelectDonation,
  onSelectBeneficiary,
  onDeleteDonation,
  onDeleteMultipleDonations,
  onClearAllDonations,
  onExportReceipt,
  currentUsername,
  editingItem,
  onClearEdit,
  settings,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'approved' | 'pending' | 'rejected' | 'all'>('approved');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'masajid' | 'sadaqah' | 'zakat' | 'direct-aid' | 'wheelchairs' | 'orphans' | 'ration' | 'blood'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Screenshot Lightbox
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  const presetAmounts = [300, 500, 1000, 2500, 5000, 10000, 15000, 30000, 50000, 100000, 300000];

  // Category Helper Functions
  const isMasajidDonation = (d: Donation) => {
    const cat = (d.Category || '').toLowerCase();
    const rem = (d.Remarks || '').toLowerCase();

    if (d.Category) {
      return cat.includes('masajid') || cat.includes('mosque') || cat.includes('masjid') || cat.includes('مسجد');
    }

    return (
      rem.includes('masajid') ||
      rem.includes('masjid') ||
      rem.includes('mosque') ||
      rem.includes('مسجد')
    );
  };

  const isSadaqahDonation = (d: Donation) => {
    const cat = (d.Category || '').toLowerCase();
    const rem = (d.Remarks || '').toLowerCase();

    if (d.Category) {
      return cat.includes('sadaqah') || cat.includes('welfare') || cat.includes('صدقہ');
    }

    return rem.includes('sadaqah') || rem.includes('welfare') || rem.includes('صدقہ');
  };

  const isZakatDonation = (d: Donation) => {
    const cat = (d.Category || '').toLowerCase();
    const rem = (d.Remarks || '').toLowerCase();

    if (d.Category) {
      return cat.includes('zakat') || cat.includes('زکوۃ');
    }

    return rem.includes('zakat') || rem.includes('زکوۃ');
  };

  const isWheelchairDonation = (d: Donation) => {
    const cat = (d.Category || '').toLowerCase();
    const rem = (d.Remarks || '').toLowerCase();
    return cat.includes('wheelchair') || rem.includes('wheelchair') || cat.includes('disabled') || rem.includes('disabled');
  };

  const isOrphanDonation = (d: Donation) => {
    const cat = (d.Category || '').toLowerCase();
    const rem = (d.Remarks || '').toLowerCase();
    return cat.includes('orphan') || rem.includes('orphan') || cat.includes('یتیم') || rem.includes('یتیم');
  };

  const isRationDonation = (d: Donation) => {
    const cat = (d.Category || '').toLowerCase();
    const rem = (d.Remarks || '').toLowerCase();
    return cat.includes('ration') || rem.includes('ration') || cat.includes('food') || rem.includes('food') || rem.includes('راشن');
  };

  const isBloodDonation = (d: Donation) => {
    const cat = (d.Category || '').toLowerCase();
    const rem = (d.Remarks || '').toLowerCase();
    return cat.includes('blood') || rem.includes('blood');
  };

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Masajid Donations');
  const [donorName, setDonorName] = useState('');
  const [nicNo, setNicNo] = useState('');
  const [countryCode, setCountryCode] = useState('+92');
  const [contactNo, setContactNo] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [address, setAddress] = useState('');
  const [profession, setProfession] = useState('');
  const [amount, setAmount] = useState('');
  const [txId, setTxId] = useState(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [remarks, setRemarks] = useState('Sadaqah & Welfare');
  const [status, setStatus] = useState<'Approved' | 'Pending'>('Pending');
  const [approvedBy, setApprovedBy] = useState(
    currentUsername && !['admin', 'guest donator'].includes(currentUsername.toLowerCase()) 
      ? currentUsername.charAt(0).toUpperCase() + currentUsername.slice(1) 
      : 'Ali'
  );
  const [proofImage, setProofImage] = useState<string>('');
  const [sendSms, setSendSms] = useState<boolean>(Boolean(settings?.AutoSmsSubmission));
  const [isProcessingProof, setIsProcessingProof] = useState(false);
  const formFileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editingItem) {
      setDate(editingItem.Date);
      setDonorName(editingItem['Donor Name']);
      setNicNo(editingItem['NIC No'] || '');
      
      const parsedContact = parsePhoneWithCountry(editingItem['Contact No'] || '');
      setCountryCode(parsedContact.countryCode);
      setContactNo(parsedContact.number);
      
      setDonorEmail(editingItem.DonorEmail || '');
      setAddress(editingItem['Permanent Address'] || '');
      setProfession(editingItem.Profession || '');
      setAmount(editingItem.Amount.toString());
      setTxId(editingItem['Transaction ID'] || '');
      setRemarks(editingItem.Remarks || '');
      setStatus(editingItem.Status as any || 'Approved');
      setApprovedBy(editingItem.ApprovedBy || (
        currentUsername && !['admin', 'guest donator'].includes(currentUsername.toLowerCase()) 
          ? currentUsername.charAt(0).toUpperCase() + currentUsername.slice(1) 
          : 'Ali'
      ));
      setProofImage(editingItem.ProofImage || '');
      setEditingId(editingItem.id);
      setShowForm(true);
    }
  }, [editingItem]);

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setDonorName('');
    setNicNo('');
    setContactNo('');
    setDonorEmail('');
    setAddress('');
    setProfession('');
    setAmount('');
    setTxId(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
    setRemarks('');
    setStatus('Pending');
    setApprovedBy(
      currentUsername && !['admin', 'guest donator'].includes(currentUsername.toLowerCase()) 
        ? currentUsername.charAt(0).toUpperCase() + currentUsername.slice(1) 
        : 'Ali'
    );
    setProofImage('');
    setSendSms(Boolean(settings?.AutoSmsSubmission));
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

  const handleDuplicateDonation = (e: React.MouseEvent, item: Donation) => {
    e.stopPropagation();
    setDate(new Date().toISOString().split('T')[0]);
    setDonorName(item['Donor Name']);
    setNicNo(item['NIC No'] || '');
    setContactNo(item['Contact No'] || '');
    setAddress(item['Permanent Address'] || '');
    setProfession(item.Profession || '');
    setAmount('');
    setTxId(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
    setRemarks(item.Remarks || '');
    setStatus('Approved');
    setProofImage('');
    setEditingId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditDonation = (e: React.MouseEvent, item: Donation) => {
    e.stopPropagation();
    setDate(item.Date);
    setDonorName(item['Donor Name']);
    setNicNo(item['NIC No'] || '');
    const parsedContact = parsePhoneWithCountry(item['Contact No'] || '');
    setCountryCode(parsedContact.countryCode);
    setContactNo(parsedContact.number);
    setDonorEmail(item.DonorEmail || '');
    setAddress(item['Permanent Address'] || '');
    setProfession(item.Profession || '');
    setAmount(item.Amount.toString());
    setTxId(item['Transaction ID'] || '');
    setCategory(item.Category || 'Masajid Donations');
    setRemarks(item.Remarks || '');
    setStatus((item.Status as any) || 'Approved');
    setApprovedBy(item.ApprovedBy || (
      currentUsername && !['admin', 'guest donator'].includes(currentUsername.toLowerCase()) 
        ? currentUsername.charAt(0).toUpperCase() + currentUsername.slice(1) 
        : 'Ali'
    ));
    setProofImage(item.ProofImage || '');
    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessingProof(true);
      const compressed = await compressImageFile(file, 1400, 0.85);
      setProofImage(compressed);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingProof(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName.trim() || !amount) return;

    const parsedAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;

    // Check for duplicate (exclude current record if editing)
    const monthYear = date.slice(0, 7); // YYYY-MM
    const isDuplicate = donations.some(
      (d) =>
        d.id !== editingId &&
        d['Donor Name']?.trim().toLowerCase() === donorName.trim().toLowerCase() &&
        d.Amount === parsedAmount &&
        d.Date?.slice(0, 7) === monthYear
    );

    if (isDuplicate) {
      const proceed = window.confirm(
        'A donation for this donor with the same amount in the same month already exists. Do you want to proceed and save this record anyway?'
      );
      if (!proceed) {
        return;
      }
    }

    const newDonation: Donation = {
      id: editingId || generateUUID(),
      Date: date,
      'Donor Name': donorName.trim(),
      'NIC No': nicNo.trim(),
      'Contact No': `${countryCode} ${contactNo.trim()}`.trim(),
      DonorEmail: donorEmail.trim(),
      'Permanent Address': address.trim() || 'District Shangla, KP',
      Profession: profession.trim() || 'Contributor',
      Amount: parsedAmount,
      'Transaction ID': txId.trim() || `TXN-${Date.now().toString().slice(-6)}`,
      Category: category || 'Masajid Donations',
      Remarks: remarks.trim() || 'General Welfare Fund',
      EnteredBy: currentUsername || 'admin',
      Status: status,
      Source: 'Live',
      SendSms: sendSms,
      ...(proofImage ? { ProofImage: proofImage } : {}),
      ...(status === 'Approved' ? {
        ApprovedBy: approvedBy || (currentUsername && !['admin', 'guest donator'].includes(currentUsername.toLowerCase())
          ? (currentUsername.charAt(0).toUpperCase() + currentUsername.slice(1))
          : 'Ali'),
        ApprovedAt: new Date().toISOString(),
      } : {}),
    } as any;

    onSaveDonation(newDonation);

    resetForm();
    setShowForm(false);
  };

  
  const handlePDFExport = async () => {
    try {
      const isBeneficiaryView = ['direct-aid', 'wheelchairs', 'orphans', 'ration', 'blood'].includes(categoryFilter);
      
      if (isBeneficiaryView) {
        const title = `SWDO ${categoryFilter.replace('-', ' ').toUpperCase()} RELIEF REPORT`;
        await exportBeneficiariesReportPDF(filteredBeneficiaries, settings, title);
      } else {
        const title = `SWDO ${categoryFilter.toUpperCase()} DONATIONS LEDGER REPORT`;
        await exportDonationsReportPDF(filteredDonations, settings, title);
      }
    } catch (err) {
      console.error('PDF Export Error:', err);
    }
  };

  // Pending vs Approved lists
  const pendingDonations = useMemo(() => {
    return donations.filter((d) => d.Status?.toLowerCase() === 'pending');
  }, [donations]);

  const approvedDonations = useMemo(() => {
    return donations.filter((d) => {
      const s = (d.Status || '').toLowerCase();
      return s !== 'pending' && s !== 'rejected';
    });
  }, [donations]);

  const nonRejectedDonations = useMemo(() => {
    return donations.filter((d) => (d.Status || '').toLowerCase() !== 'rejected');
  }, [donations]);

  const rejectedDonations = useMemo(() => {
    return donations.filter((d) => (d.Status || '').toLowerCase() === 'rejected');
  }, [donations]);

  // Category Specific Sub-lists
  const masajidDonationsList = useMemo(() => {
    return approvedDonations.filter(isMasajidDonation);
  }, [approvedDonations]);

  const totalMasajidAmount = useMemo(() => {
    return masajidDonationsList.reduce((sum, d) => sum + (Number(d.Amount) || 0), 0);
  }, [masajidDonationsList]);

  // Filtered donations based on search, status, and category
  const handleExportDirectAidPDF = async () => {
    try {
      const title = 'Direct financial beneficiaries (patients, incidents, accidents) Report';
      await exportBeneficiariesReportPDF(filteredBeneficiaries, settings, title);
    } catch (err) {
      console.error('Failed to export Direct Aid PDF:', err);
    }
  };

  const filteredDonations = useMemo(() => {
    let list = isAdmin 
      ? (statusFilter === 'rejected'
          ? rejectedDonations
          : (statusFilter === 'pending'
              ? pendingDonations
              : approvedDonations))
      : approvedDonations;

    // Apply category sub-filter
    if (categoryFilter === 'masajid') {
      list = list.filter(isMasajidDonation);
    } else if (categoryFilter === 'sadaqah') {
      list = list.filter(isSadaqahDonation);
    } else if (categoryFilter === 'zakat') {
      list = list.filter(isZakatDonation);
    } else if (categoryFilter === 'wheelchairs') {
      list = list.filter(isWheelchairDonation);
    } else if (categoryFilter === 'orphans') {
      list = list.filter(isOrphanDonation);
    } else if (categoryFilter === 'ration') {
      list = list.filter(isRationDonation);
    } else if (categoryFilter === 'blood') {
      list = list.filter(isBloodDonation);
    }
    // categoryFilter === 'all': show all donations without excluding Masajid

    let result = list;

    if (fromDate || toDate) {
      result = result.filter(d => {
        const dateStr = (d.Date || '').replace(/\//g, '-');
        const { start, end } = parseDateRange(dateStr);
        return (!fromDate || (end || start) >= fromDate) && (!toDate || (start || end) <= toDate);
      });
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const numQ = Number(q);
      const isNum = !isNaN(numQ) && q.length > 0 && numQ > 0;

      result = list.filter((d) => {
        const name = (d['Donor Name'] || '').toLowerCase();
        const nic = (d['NIC No'] || '').toLowerCase();
        const contact = (d['Contact No'] || '').toLowerCase();
        const tx = (d['Transaction ID'] || '').toLowerCase();
        const addr = (d['Permanent Address'] || '').toLowerCase();
        const dateStr = (d.Date || '').toLowerCase();
        const rem = (d.Remarks || '').toLowerCase();
        const prof = (d.Profession || '').toLowerCase();
        const matchAmt = isNum && Number(d.Amount) === numQ;

        return (
          name.includes(q) ||
          nic.includes(q) ||
          contact.includes(q) ||
          tx.includes(q) ||
          addr.includes(q) ||
          dateStr.includes(q) ||
          rem.includes(q) ||
          prof.includes(q) ||
          matchAmt
        );
      });
      
      // Strict exact match override: if some records match the search term as a Name,
      // ONLY show those matching records (filters out unrelated records)
      const nameMatches = result.filter(d => (d['Donor Name'] || '').toLowerCase().includes(q));
      if (nameMatches.length > 0) {
        const exactNameMatches = nameMatches.filter(d => (d['Donor Name'] || '').toLowerCase().trim() === q);
        result = exactNameMatches.length > 0 ? exactNameMatches : nameMatches;
      }
    }

    return [...result].sort((a, b) => {
      // Primary sort: Date (Newest first)
      const dateA = new Date(a.Date).getTime();
      const dateB = new Date(b.Date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      
      // Secondary sort: Latest Approval / Entry
      const timeA = a.ApprovedAt ? new Date(a.ApprovedAt).getTime() : 0;
      const timeB = b.ApprovedAt ? new Date(b.ApprovedAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;

      return b.id.localeCompare(a.id);
    });
  }, [donations, statusFilter, categoryFilter, searchTerm, fromDate, toDate, pendingDonations, approvedDonations, nonRejectedDonations, isAdmin]);

  const filteredBeneficiaries = useMemo(() => {
    let list = beneficiaries;
    
    if (categoryFilter === 'direct-aid') list = list.filter(isDirectFinancialAid);
    else if (categoryFilter === 'wheelchairs') list = list.filter(isWheelchairOrDisabled);
    else if (categoryFilter === 'orphans') list = list.filter(isOrphanBeneficiary);
    else if (categoryFilter === 'ration') list = list.filter(isRationBeneficiary);
    else if (categoryFilter === 'blood') list = list.filter(isBloodBeneficiary);

    if (fromDate || toDate) {
      list = list.filter(b => {
        const { start, end } = parseDateRange(b.Date || '');
        return (!fromDate || (end || start) >= fromDate) && (!toDate || (start || end) <= toDate);
      });
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(b => 
        (b['Beneficiary Name'] || '').toLowerCase().includes(q) ||
        (b['Transaction ID'] || '').toLowerCase().includes(q) ||
        (b.Purpose || '').toLowerCase().includes(q) ||
        (b.Remarks || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
  }, [beneficiaries, categoryFilter, searchTerm, fromDate, toDate]);

  // Category scoped counts for status buttons
  const categoryScopedAllCount = useMemo(() => {
    if (categoryFilter === 'masajid') return donations.filter(isMasajidDonation).length;
    if (categoryFilter === 'sadaqah') return donations.filter(isSadaqahDonation).length;
    if (categoryFilter === 'zakat') return donations.filter(isZakatDonation).length;
    return donations.length;
  }, [donations, categoryFilter]);

  const categoryScopedApprovedCount = useMemo(() => {
    if (categoryFilter === 'masajid') return approvedDonations.filter(isMasajidDonation).length;
    if (categoryFilter === 'sadaqah') return approvedDonations.filter(isSadaqahDonation).length;
    if (categoryFilter === 'zakat') return approvedDonations.filter(isZakatDonation).length;
    return approvedDonations.length;
  }, [approvedDonations, categoryFilter]);

  const categoryScopedNonRejectedCount = useMemo(() => {
    if (categoryFilter === 'masajid') return nonRejectedDonations.filter(isMasajidDonation).length;
    if (categoryFilter === 'sadaqah') return nonRejectedDonations.filter(isSadaqahDonation).length;
    if (categoryFilter === 'zakat') return nonRejectedDonations.filter(isZakatDonation).length;
    return nonRejectedDonations.length;
  }, [nonRejectedDonations, categoryFilter]);

  const categoryScopedPendingCount = useMemo(() => {
    if (categoryFilter === 'masajid') return pendingDonations.filter(isMasajidDonation).length;
    if (categoryFilter === 'sadaqah') return pendingDonations.filter(isSadaqahDonation).length;
    if (categoryFilter === 'zakat') return pendingDonations.filter(isZakatDonation).length;
    return pendingDonations.length;
  }, [pendingDonations, categoryFilter]);

  const categoryScopedRejectedCount = useMemo(() => {
    if (categoryFilter === 'masajid') return rejectedDonations.filter(isMasajidDonation).length;
    if (categoryFilter === 'sadaqah') return rejectedDonations.filter(isSadaqahDonation).length;
    if (categoryFilter === 'zakat') return rejectedDonations.filter(isZakatDonation).length;
    return rejectedDonations.length;
  }, [rejectedDonations, categoryFilter]);

  const filteredPendingQueue = useMemo(() => {
    let list = pendingDonations;

    if (categoryFilter === 'masajid') {
      list = list.filter(isMasajidDonation);
    } else if (categoryFilter === 'sadaqah') {
      list = list.filter(isSadaqahDonation);
    } else if (categoryFilter === 'zakat') {
      list = list.filter(isZakatDonation);
    }

    const q = searchTerm.toLowerCase().trim();
    if (q) {
      list = list.filter((d) => {
        const name = (d['Donor Name'] || '').toLowerCase();
        const tx = (d['Transaction ID'] || '').toLowerCase();
        const amt = (d.Amount || 0).toString();
        const contact = (d['Contact No'] || '').toLowerCase();
        return name.includes(q) || tx.includes(q) || amt.includes(q) || contact.includes(q);
      });
    }
    
    return [...list].sort((a, b) => {
      const dateA = new Date(a.Date).getTime();
      const dateB = new Date(b.Date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.id.localeCompare(a.id);
    });
  }, [pendingDonations, categoryFilter, searchTerm]);

  const totalFilteredAmount = useMemo(() => {
    return filteredDonations.reduce((sum, d) => sum + (Number(d.Amount) || 0), 0);
  }, [filteredDonations]);

  // Bulk Actions Logic
  
  const renderContact = (contactNo: string | undefined) => {
    if (!contactNo || contactNo === '-') return <span className="text-slate-500 text-[10px]">-</span>;
    
    const cleanNumber = contactNo.replace(/[^0-9+]/g, '');
    let waNumber = contactNo.replace(/[^0-9]/g, '');
    if (waNumber.startsWith('0')) {
      waNumber = '92' + waNumber.substring(1);
    }
    
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-[10px] whitespace-nowrap">{contactNo}</span>
        <div className="flex items-center gap-1">
          <a 
            href={'tel:' + cleanNumber} 
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
            title="Call"
          >
            <Phone className="w-3 h-3" />
          </a>
          <a 
            href={'https://wa.me/' + waNumber} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
            title="WhatsApp"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
          </a>
        </div>
      </div>
    );
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredDonations.map(d => d.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (!onDeleteMultipleDonations) return;
    onDeleteMultipleDonations(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold dark:text-emerald-300 text-emerald-700 flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-emerald-500" />
            <span>{isAdmin ? 'Donations Management & Ledger' : 'Approved Donators & Collections'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAdmin
              ? 'Verify payment proofs, approve contributor submissions, and maintain ledger'
              : 'Browse transparent records of generous contributions and relief funds'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
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

              {donations.length > 0 && onDeleteDonation && onClearAllDonations && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to remove all donation records?')) {
                      onClearAllDonations();
                    }
                  }}
                  title="Remove all donations"
                  className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Remove All</span>
                </button>
              )}

              
              
              

              <button
                type="button"
                onClick={handlePDFExport}
                className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors cursor-pointer"
                title="Export Ledger to PDF"
              >
                <DownloadCloud className="w-4 h-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>

              

              <button
                type="button"
                onClick={handleToggleForm}
                className="glow-button px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{showForm ? 'Close Form' : 'Manual Entry'}</span>
              </button>
            </>
          ) : (
            <>
              {onOpenDonateModal && (
                <button
                  type="button"
                  onClick={onOpenDonateModal}
                  className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer border border-emerald-400/30"
                >
                  <HandCoins className="w-4 h-4" />
                  <span>Donate Now</span>
                </button>
              )}

              {onRequestLogin && (
                <button
                  type="button"
                  onClick={onRequestLogin}
                  className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 dark:bg-slate-800 bg-purple-100 dark:text-purple-300 text-purple-700 hover:bg-purple-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border dark:border-purple-900/40 border-purple-200"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Admin Login</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* PENDING APPROVAL VERIFICATION QUEUE (When pending donations exist & Admin is logged in) */}
      {isAdmin && pendingDonations.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-amber-950/30 border-2 border-amber-500/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-amber-300 flex items-center gap-2">
                  <span>Pending Admin Approvals ({filteredPendingQueue.length})</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                    Action Required
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Review the payment screenshots and approve contributions to add them to the ledger.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer hidden sm:block"
            >
              View In Filter
            </button>
          </div>

          {filteredPendingQueue.length === 0 && searchTerm ? (
            <div className="text-center py-4 text-slate-500 text-xs italic">
              No pending approvals match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {filteredPendingQueue.map((pending) => (
              <div
                key={pending.id}
                className="p-3.5 rounded-xl bg-black/40 border border-amber-500/30 hover:border-amber-500/60 transition-all flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm truncate">
                        {pending['Donor Name']}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                        Pending
                      </span>
                    </div>

                    <p className="text-xs font-mono font-bold text-emerald-400">
                      {formatPKR(pending.Amount)}
                    </p>

                    <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                      <p>Date: {pending.Date}</p>
                      <p className="truncate">Ref: {pending['Transaction ID'] || 'N/A'}</p>
                      {pending['Contact No'] && <p>Contact: {pending['Contact No']}</p>}
                      {pending.Remarks && (
                        <p className="text-[10px] text-slate-300 italic truncate max-w-[240px]">
                          Note: {pending.Remarks}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Payment Proof Screenshot Thumbnail */}
                  {pending.ProofImage ? (
                    <div
                      onClick={() =>
                        setLightboxImage({
                          url: pending.ProofImage!,
                          title: `Proof from ${pending['Donor Name']} (${formatPKR(pending.Amount)})`,
                        })
                      }
                      className="relative w-20 h-24 rounded-lg overflow-hidden border border-amber-500/40 bg-black shrink-0 cursor-pointer group shadow-md"
                      title="Click to zoom screenshot"
                    >
                      {!!pending.ProofImage && (
                        <img
                          src={pending.ProofImage || null}
                          alt="Payment Proof"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] gap-0.5">
                        <Eye className="w-4 h-4 text-amber-300" />
                        <span>Inspect</span>
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black/70 text-[8px] text-amber-300 px-1 rounded font-mono">
                        Screenshot
                      </span>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-slate-700 bg-slate-900/60 flex items-center justify-center text-slate-500 text-[10px] text-center p-1">
                      No image
                    </div>
                  )}
                </div>

                {/* Approve / Reject / Inspect Action Toolbar */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  {pending.ProofImage && (
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxImage({
                          url: pending.ProofImage!,
                          title: `Proof from ${pending['Donor Name']} (${formatPKR(pending.Amount)})`,
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      <span>View Proof</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (onApproveDonation) {
                        const approver = currentUsername && currentUsername !== 'Guest Donator'
                          ? (currentUsername.charAt(0).toUpperCase() + currentUsername.slice(1))
                          : 'Admin';
                        onApproveDonation(pending.id, approver);
                      }
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve{currentUsername && currentUsername !== 'Guest Donator' ? ` as ${currentUsername.charAt(0).toUpperCase() + currentUsername.slice(1)}` : ''} & Add to Ledger</span>
                  </button>

                  {onPromptRejectDonation && (
                    <button
                      type="button"
                      onClick={() => onPromptRejectDonation(pending)}
                      title="Reject submission"
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

      {/* Manual Entry Collapsible Form for Admins Only */}
      {isAdmin && showForm && (
        <div className="glass-card p-4 sm:p-6 shadow-2xl transition-all border-purple-500/40">
          <div className="flex items-center justify-between pb-3 mb-4 border-b dark:border-purple-900/50 border-purple-200">
            <h3 className="text-sm sm:text-base font-bold dark:text-emerald-400 text-emerald-700 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-500" />
              <span>{editingId ? 'Edit Donation Record' : 'Record Manual Donation'}</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              Admin Manual Entry
            </span>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Date */}
            <div className="field-box">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="field-input font-mono"
                placeholder=" "
              />
              <Calendar className="field-icon text-emerald-500 w-4 h-4" />
              <label className="field-label">Date</label>
            </div>

            {/* Donor Name */}
            <div className="field-box">
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                required
                className="field-input"
                placeholder=" "
                autoComplete="off"
              />
              <User className="field-icon text-blue-500 w-4 h-4" />
              <label className="field-label">Donor Name *</label>
            </div>

            {/* NIC No */}
            <div className="field-box">
              <input
                type="text"
                value={nicNo}
                onChange={(e) => setNicNo(formatNIC(e.target.value))}
                maxLength={15}
                className="field-input font-mono"
                placeholder=" "
                autoComplete="off"
              />
              <IdCard className="field-icon text-emerald-500 w-4 h-4" />
              <label className="field-label">NIC No (xxxxx-xxxxxxx-x)</label>
            </div>

            {/* Contact No */}
            <div className="flex gap-2 w-full">
              <div className="field-box w-28 mb-0 flex-shrink-0">
                <CountrySelect
                  value={countryCode}
                  onChange={setCountryCode}
                  className="field-input !pl-0 text-xs font-mono font-bold text-emerald-500"
                  style={{ paddingTop: '1.25rem' }}
                />
                <label className="field-label !left-3" style={{ left: '0.75rem', pointerEvents: 'none' }}>Code</label>
              </div>

              <div className="field-box flex-1 mb-0">
                <input
                  type="text"
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value.replace(/[^\d-]/g, '').slice(0, 15))}
                  className="field-input font-mono"
                  placeholder=" "
                  autoComplete="off"
                />
                <Phone className="field-icon text-purple-500 w-4 h-4" />
                <label className="field-label">Contact No</label>
              </div>
            </div>

            {/* Donor Email */}
            <div className="field-box">
              <input
                type="email"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                className="field-input"
                placeholder=" "
              />
              <Mail className="field-icon text-emerald-400 w-4 h-4" />
              <label className="field-label">Donor Email (Optional for receipt)</label>
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
              <label className="field-label">Profession / Occupation</label>
            </div>

            {/* Amount */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Donation Amount (PKR) <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mb-2">
                {presetAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt.toString())}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                      amount === amt.toString()
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                        : 'bg-slate-900/50 hover:bg-slate-800 text-slate-300 border-purple-900/40'
                    }`}
                  >
                    {formatPKR(amt)}
                  </button>
                ))}
              </div>
              <div className="field-box">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="1"
                  className="field-input font-mono font-bold text-emerald-500"
                  placeholder=" "
                />
                <Coins className="field-icon text-emerald-500 w-4 h-4" />
                <label className="field-label">Donation Amount (Rs.) *</label>
              </div>
            </div>

            {/* Transaction ID */}
            <div className="field-box">
              <input
                type="text"
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                className="field-input font-mono"
                placeholder=" "
              />
              <Hash className="field-icon text-purple-400 w-4 h-4" />
              <label className="field-label">Transaction ID / Slip No</label>
            </div>

            {/* Category / Cause Selector */}
            <div className="field-box">
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (e.target.value === 'Masajid Donations') {
                    setRemarks('Masajid Donations • Mosque Construction & Maintenance');
                  }
                }}
                className="field-input font-bold text-emerald-400"
              >
                <option value="Masajid Donations">🕌 Masajid Donations (مسجد فنڈ)</option>
                <option value="Sadaqah & Welfare">💚 Sadaqah & Welfare</option>
                <option value="Zakat Fund">📖 Zakat Fund</option>
                <option value="Emergency Medical Relief">🏥 Emergency Medical Relief</option>
                <option value="Wheelchairs / Disabled">♿ Wheelchairs / Disabled</option>
                <option value="Orphans Care">🧸 Orphans Care</option>
                <option value="Ration / Food">📦 Ration / Food</option>
                <option value="Blood Bank">🩸 Blood Bank</option>
                <option value="General Welfare">General Welfare</option>
              </select>
              <Landmark className="field-icon text-emerald-400 w-4 h-4" />
              <label className="field-label">Category / Cause</label>
            </div>

            {/* Approval Status Selector */}
            <div className="field-box">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="field-input"
              >
                <option value="Approved">Approved (Add to Ledger)</option>
                <option value="Pending">Pending (Requires Review)</option>
                <option value="Rejected">Rejected (Declined)</option>
              </select>
              <ShieldCheck className="field-icon text-emerald-400 w-4 h-4" />
              <label className="field-label">Approval Status</label>
            </div>

            {/* Remarks */}
            <div className="field-box md:col-span-2 lg:col-span-2">
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="field-input"
                placeholder=" "
              />
              <MessageSquare className="field-icon text-slate-400 w-4 h-4" />
              <label className="field-label">Remarks (Zakat, Sadaqah, Medical Relief)</label>
            </div>

            {/* Optional Proof Screenshot for Admin */}
            <div className="field-box md:col-span-2 lg:col-span-1">
              <input
                ref={formFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFormProofUpload}
                className="hidden"
              />
              <div
                onClick={() => formFileInputRef.current?.click()}
                className="field-input flex items-center justify-between cursor-pointer"
              >
                <span className="truncate text-slate-300">
                  {proofImage ? 'Screenshot Attached ✓' : 'Upload Proof (Optional)'}
                </span>
                <UploadCloud className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
              </div>
              <ImageIcon className="field-icon text-emerald-400 w-4 h-4" />
              <label className="field-label">Payment Screenshot (Optional)</label>
            </div>

            {/* Automated SMS Dispatch Option */}
            <div className="md:col-span-2 lg:col-span-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block">
                    Automated SMS Notification (Veevo Tech Gateway)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Automatically dispatch an official SMS receipt to the donor's mobile number
                  </span>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendSms}
                  onChange={(e) => setSendSms(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-400 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Send SMS to Donor</span>
              </label>
            </div>

            {/* Actions */}
            <div className="md:col-span-2 lg:col-span-3 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleToggleForm}
                className="px-4 py-2 rounded-xl text-xs font-semibold dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-700 hover:opacity-80 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="glow-button px-6 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                {editingId ? 'Update Donation' : 'Save & Record Donation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CATEGORY SECTIONS SUB-NAVBAR */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl dark:bg-slate-900/90 bg-white border dark:border-slate-800 border-purple-200 text-xs shadow-md">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            categoryFilter === 'all'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>All Collections</span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('masajid')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            categoryFilter === 'masajid'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-400/30'
              : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
          }`}
        >
          <Landmark className="w-3.5 h-3.5 text-emerald-400" />
          <span>🕌 Masajid Donations</span>
          <span className="ml-1 text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
            {masajidDonationsList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('sadaqah')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            categoryFilter === 'sadaqah'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/20'
              : 'text-blue-400 hover:text-blue-300 hover:bg-slate-800/50'
          }`}
        >
          <HandCoins className="w-3.5 h-3.5" />
          <span>💚 Sadaqah & Welfare</span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('zakat')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            categoryFilter === 'zakat'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-600/20'
              : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800/50'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>📖 Zakat Fund</span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('direct-aid')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            categoryFilter === 'direct-aid'
              ? 'bg-gradient-to-r from-amber-500 to-amber-700 text-white shadow-md shadow-amber-600/20 ring-2 ring-amber-400/30'
              : 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5 text-amber-500" />
          <span>🚑 Direct Financial Relief</span>
          <span className="ml-1 text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300">
            {beneficiaries.filter(isDirectFinancialAid).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('wheelchairs')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            categoryFilter === 'wheelchairs'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
              : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'
          }`}
        >
          <Accessibility className="w-3.5 h-3.5" />
          <span>♿ Wheelchairs / Disabled</span>
          <span className="ml-1 text-[10px] font-mono px-2 py-0.2 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
            {beneficiaries.filter(isWheelchairOrDisabled).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('orphans')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            categoryFilter === 'orphans'
              ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
              : 'text-pink-400 hover:text-pink-300 hover:bg-pink-500/10'
          }`}
        >
          <Baby className="w-3.5 h-3.5" />
          <span>🧸 Orphans Care</span>
          <span className="ml-1 text-[10px] font-mono px-2 py-0.2 rounded-full bg-pink-500/20 border border-pink-400/30 text-pink-300">
            {beneficiaries.filter(isOrphanBeneficiary).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('ration')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            categoryFilter === 'ration'
              ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md'
              : 'text-orange-400 hover:text-orange-300 hover:bg-orange-500/10'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>📦 Ration / Food</span>
          <span className="ml-1 text-[10px] font-mono px-2 py-0.2 rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300">
            {beneficiaries.filter(isRationBeneficiary).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('blood')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            categoryFilter === 'blood'
              ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md'
              : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
          }`}
        >
          <Droplets className="w-3.5 h-3.5" />
          <span>🩸 Blood Bank</span>
          <span className="ml-1 text-[10px] font-mono px-2 py-0.2 rounded-full bg-red-500/20 border border-red-400/30 text-red-300">
            {beneficiaries.filter(isBloodBeneficiary).length}
          </span>
        </button>
      </div>

      {/* DEDICATED MASAJID DONATIONS SECTION SPOTLIGHT */}
      {categoryFilter === 'masajid' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900/95 to-teal-950/50 border-2 border-emerald-500/40 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-lg">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-emerald-300">
                    Masajid Donations Section (مسجد کی تعمیر، توسیع و دیکھ بھال)
                  </h3>
                  <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    Official Mosque Ledger
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
                  Transparent record of contributions reserved for local Mosque construction, solar power installation, prayer carpets, sound equipment, and water filtration across District Shangla and KP.
                </p>
              </div>
            </div>

            {onOpenDonateModal && (
              <button
                type="button"
                onClick={onOpenDonateModal}
                className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 transition-all shrink-0 cursor-pointer border border-emerald-300/40"
              >
                <HandCoins className="w-4 h-4" />
                <span>Donate to Masajid Fund</span>
              </button>
            )}
          </div>

          {/* Stats Grid for Masajid Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Masajid Funds Collected</p>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
                {formatPKR(totalMasajidAmount)}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-teal-500/30">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Masajid Donators</p>
              <p className="text-lg sm:text-xl font-extrabold text-teal-300 font-mono mt-0.5">
                {masajidDonationsList.length} <span className="text-xs font-sans text-slate-400">Contributors</span>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Masajid Initiatives</p>
              <p className="text-xs font-bold text-cyan-300 mt-1 truncate">
                Solarization • Sound • Rugs • Water Systems
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED DIRECT AID SECTION SPOTLIGHT */}
      {categoryFilter === 'direct-aid' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-950/60 via-slate-900/95 to-orange-950/50 border-2 border-amber-500/40 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/25 to-orange-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-lg">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-amber-300">
                    Direct financial beneficiaries (patients, incidents, accidents)
                  </h3>
                  <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                    Emergency Relief Ledger
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
                  Disbursements and relief funds allocated for emergency medical aid, accident victims, and critical incidents across the community.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid for Direct Aid Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/30">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Emergency Disbursed</p>
              <p className="text-lg sm:text-xl font-extrabold text-amber-400 font-mono mt-0.5">
                {formatPKR(beneficiaries.filter(isDirectFinancialAid).reduce((sum, b) => sum + (b.Amount || 0), 0))}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-orange-500/30">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Beneficiaries Assisted</p>
              <p className="text-lg sm:text-xl font-extrabold text-orange-300 font-mono mt-0.5">
                {beneficiaries.filter(isDirectFinancialAid).length} <span className="text-xs font-sans text-slate-400">Critical Cases</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="glass-card p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-purple-500/30">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isAdmin ? (
            /* Status Filter Buttons (Admin Only) */
            <div className="flex rounded-xl p-1 bg-slate-900/80 border border-slate-800 text-xs w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setStatusFilter('approved')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  statusFilter === 'approved' || statusFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approved ({categoryScopedApprovedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  statusFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending ({categoryScopedPendingCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('rejected')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  statusFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Rejected ({categoryScopedRejectedCount})</span>
              </button>
            </div>
          ) : (
            /* Donators View Indicator */
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approved Records ({categoryScopedApprovedCount})</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          {/* Date Picker */}
          <div className="flex items-center gap-2 w-full sm:w-auto p-1 rounded-xl border dark:border-slate-800 bg-slate-900/40 shadow-inner">
            <div className="relative flex-1 sm:w-32">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full py-1.5 px-2 pl-8 rounded-lg dark:bg-slate-950 bg-white border dark:border-purple-900/40 border-purple-200 font-mono text-[11px] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none transition-all"
              />
              <div className="absolute left-2.5 top-2 text-emerald-500">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider px-1">TO</div>
            <div className="relative flex-1 sm:w-32">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full py-1.5 px-2 pl-8 rounded-lg dark:bg-slate-950 bg-white border dark:border-purple-900/40 border-purple-200 font-mono text-[11px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all"
              />
              <div className="absolute left-2.5 top-2 text-blue-500">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by donor, NIC, slip no, date..."
              className="w-full pl-9 pr-4 py-2 rounded-xl dark:bg-slate-900/90 bg-white border dark:border-purple-900/40 border-purple-200 text-xs focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-red-500 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Empty State when no donations exist */}
      {donations.length === 0 ? (
        <div className="glass-card p-12 text-center border-purple-500/30 flex flex-col items-center justify-center my-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-4 shadow-inner">
            <HandCoins className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
            No Donations in Record
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
            {isAdmin
              ? 'The donations ledger is currently empty. You can record manual donations or verify online contributor submissions.'
              : 'No public donations recorded yet. Be the first to support our welfare mission by making a contribution!'}
          </p>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="glow-button px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record First Donation</span>
            </button>
          ) : (
            onOpenDonateModal && (
              <button
                type="button"
                onClick={onOpenDonateModal}
                className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition-all cursor-pointer border border-emerald-400/30"
              >
                <HandCoins className="w-4 h-4" />
                <span>Donate Now</span>
              </button>
            )
          )}
        </div>
      ) : ['direct-aid', 'wheelchairs', 'orphans', 'ration', 'blood'].includes(categoryFilter) ? (
        /* Dynamic Beneficiary Ledger Table */
        <div className={`glass-card shadow-2xl border-${
          categoryFilter === 'direct-aid' ? 'amber' :
          categoryFilter === 'wheelchairs' ? 'indigo' :
          categoryFilter === 'orphans' ? 'pink' :
          categoryFilter === 'ration' ? 'orange' : 'red'
        }-500/30 overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[680px]">
              <thead className={`dark:bg-slate-900/90 bg-${
                categoryFilter === 'direct-aid' ? 'amber' :
                categoryFilter === 'wheelchairs' ? 'indigo' :
                categoryFilter === 'orphans' ? 'pink' :
                categoryFilter === 'ration' ? 'orange' : 'red'
              }-100/60 border-b dark:border-${
                categoryFilter === 'direct-aid' ? 'amber' :
                categoryFilter === 'wheelchairs' ? 'indigo' :
                categoryFilter === 'orphans' ? 'pink' :
                categoryFilter === 'ration' ? 'orange' : 'red'
              }-900/50 border-slate-200 text-slate-600 dark:text-slate-300 uppercase tracking-wider`}>
                <tr>
                  <th className="py-3 px-4 font-bold">Date</th>
                  <th className="py-3 px-4 font-bold">Beneficiary Name & Ref</th>
                  <th className="py-3 px-4 font-bold">Purpose / Details</th>
                  <th className="py-3 px-4 font-bold text-right">Amount Disbursed</th>
                </tr>
              </thead>
              <tbody className={`divide-y dark:divide-${
                categoryFilter === 'direct-aid' ? 'amber' :
                categoryFilter === 'wheelchairs' ? 'indigo' :
                categoryFilter === 'orphans' ? 'pink' :
                categoryFilter === 'ration' ? 'orange' : 'red'
              }-900/20 divide-slate-100`}>
                {(() => {
                  if (filteredBeneficiaries.length === 0) {
                    return (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-slate-500 italic">
                          No {categoryFilter.replace('-', ' ')} records found in this category.
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <>
                      {filteredBeneficiaries
                        .map((b) => (
                          <tr
                            key={b.id}
                            className={`hover:bg-${
                              categoryFilter === 'direct-aid' ? 'amber' :
                              categoryFilter === 'wheelchairs' ? 'indigo' :
                              categoryFilter === 'orphans' ? 'pink' :
                              categoryFilter === 'ration' ? 'orange' : 'red'
                            }-500/5 transition-colors cursor-pointer group`}
                            onClick={() => onSelectBeneficiary && onSelectBeneficiary(b)}
                          >
                            <td className="py-4 px-4 font-mono text-slate-500 dark:text-slate-400">
                              {b.Date}
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-extrabold dark:text-slate-200 text-slate-800 text-sm">
                                {b['Beneficiary Name']}
                              </div>
                              <div className={`text-[10px] text-${
                                categoryFilter === 'direct-aid' ? 'amber' :
                                categoryFilter === 'wheelchairs' ? 'indigo' :
                                categoryFilter === 'orphans' ? 'pink' :
                                categoryFilter === 'ration' ? 'orange' : 'red'
                              }-500/70 font-mono mt-0.5`}>
                                ID: {b['Transaction ID'] || b.id}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-slate-700 dark:text-slate-300 font-medium">
                                {b.Purpose}
                              </div>
                              {b.Remarks && (
                                <div className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1">
                                  {b.Remarks}
                                </div>
                              )}
                            </td>
                            <td className={`py-4 px-4 text-right font-mono font-black text-${
                              categoryFilter === 'direct-aid' ? 'amber' :
                              categoryFilter === 'wheelchairs' ? 'indigo' :
                              categoryFilter === 'orphans' ? 'pink' :
                              categoryFilter === 'ration' ? 'orange' : 'red'
                            }-500 text-sm`}>
                              {formatPKR(b.Amount)}
                            </td>
                          </tr>
                        ))}
                      <tr className={`bg-${
                        categoryFilter === 'direct-aid' ? 'amber' :
                        categoryFilter === 'wheelchairs' ? 'indigo' :
                        categoryFilter === 'orphans' ? 'pink' :
                        categoryFilter === 'ration' ? 'orange' : 'red'
                      }-500/10 dark:bg-${
                        categoryFilter === 'direct-aid' ? 'amber' :
                        categoryFilter === 'wheelchairs' ? 'indigo' :
                        categoryFilter === 'orphans' ? 'pink' :
                        categoryFilter === 'ration' ? 'orange' : 'red'
                      }-500/20 font-bold border-t-2 border-${
                        categoryFilter === 'direct-aid' ? 'amber' :
                        categoryFilter === 'wheelchairs' ? 'indigo' :
                        categoryFilter === 'orphans' ? 'pink' :
                        categoryFilter === 'ration' ? 'orange' : 'red'
                      }-500/30`}>
                        <td colSpan={2} className="py-4 px-4 text-right">
                          <span className={`text-${
                            categoryFilter === 'direct-aid' ? 'amber' :
                            categoryFilter === 'wheelchairs' ? 'indigo' :
                            categoryFilter === 'orphans' ? 'pink' :
                            categoryFilter === 'ration' ? 'orange' : 'red'
                          }-700 dark:text-${
                            categoryFilter === 'direct-aid' ? 'amber' :
                            categoryFilter === 'wheelchairs' ? 'indigo' :
                            categoryFilter === 'orphans' ? 'pink' :
                            categoryFilter === 'ration' ? 'orange' : 'red'
                          }-300 text-sm font-bold uppercase tracking-wider`}>
                            Total {categoryFilter.replace('-', ' ')} Relief
                          </span>
                        </td>
                        <td></td>
                        <td className="py-4 px-4 text-right">
                          <span className={`text-${
                            categoryFilter === 'direct-aid' ? 'amber' :
                            categoryFilter === 'wheelchairs' ? 'indigo' :
                            categoryFilter === 'orphans' ? 'pink' :
                            categoryFilter === 'ration' ? 'orange' : 'red'
                          }-600 dark:text-${
                            categoryFilter === 'direct-aid' ? 'amber' :
                            categoryFilter === 'wheelchairs' ? 'indigo' :
                            categoryFilter === 'orphans' ? 'pink' :
                            categoryFilter === 'ration' ? 'orange' : 'red'
                          }-400 font-mono text-base whitespace-nowrap`}>
                            {formatPKR(filteredBeneficiaries.reduce((sum, b) => sum + (b.Amount || 0), 0))}
                          </span>
                        </td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Donations Table */
        <div className="glass-card shadow-2xl border-purple-500/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[680px]">
              <thead className="dark:bg-slate-900/90 bg-purple-100/60 border-b dark:border-purple-900/50 border-purple-200 text-slate-600 dark:text-slate-300">
                <tr>
                  {isAdmin && (
                    <th className="py-3 px-3 w-8">
                      <input
                        type="checkbox"
                        className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                        checked={filteredDonations.length > 0 && selectedIds.size === filteredDonations.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                  )}
                  <th className="py-3 px-3 font-semibold">Date</th>
                  <th className="py-3 px-3 font-semibold">Donor Name</th>
                  <th className="py-3 px-3 font-semibold text-center">Status</th>
                  {isAdmin && <th className="py-3 px-3 font-semibold text-center">Proof</th>}
                  {isAdmin && <th className="py-3 px-3 font-semibold text-center">Contact</th>}
                  <th className="py-3 px-3 font-semibold text-right">Amount</th>
                  {isAdmin && <th className="py-3 px-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-purple-900/30 divide-purple-100">
                {filteredDonations.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 4} className="text-center py-8 text-slate-400">
                      No donations found for selected filter
                    </td>
                  </tr>
                ) : (
                  filteredDonations.map((d) => {
                    const statusVal = (d.Status || '').toLowerCase();
                    const isPending = statusVal === 'pending';
                    const isRejected = statusVal === 'rejected';

                    return (
                      <tr
                        key={d.id}
                        className={`transition-colors ${
                          isAdmin ? 'cursor-pointer hover:bg-purple-500/10' : ''
                        } ${
                          isPending
                            ? 'bg-amber-500/5 hover:bg-amber-500/15'
                            : isRejected
                            ? 'bg-red-500/5 hover:bg-red-500/15'
                            : ''
                        } ${selectedIds.has(d.id) ? 'bg-emerald-500/10' : ''}`}
                        onClick={() => {
                          if (isAdmin) {
                            onSelectDonation(d);
                          }
                        }}
                      >
                        {isAdmin && (
                          <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                              checked={selectedIds.has(d.id)}
                              onChange={() => handleToggleSelect(d.id)}
                            />
                          </td>
                        )}
                        <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {d.Date}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold dark:text-slate-200 text-slate-800">
                              {d['Donor Name']}
                            </span>
                            {isMasajidDonation(d) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded shadow-sm">
                                🕌 Masajid Fund
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-xs font-mono">
                            Ref: {d['Transaction ID'] || '-'} {d.Remarks ? `• ${d.Remarks}` : ''}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                              <Clock className="w-3 h-3 animate-pulse" /> Pending
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3" /> Approved
                              </span>
                              {d.ApprovedBy && (
                                <span className="text-[9px] text-emerald-400/90 font-medium mt-0.5" title={`Approved by ${d.ApprovedBy}`}>
                                  by {d.ApprovedBy.charAt(0).toUpperCase() + d.ApprovedBy.slice(1)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>



                        {/* Proof Thumbnail - Admin Only */}
                        {isAdmin && (
                          <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {d.ProofImage ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setLightboxImage({
                                    url: d.ProofImage!,
                                    title: `Proof: ${d['Donor Name']} (${formatPKR(d.Amount)})`,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-purple-900/40 text-emerald-400 text-[10px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                                title="Click to view screenshot"
                              >
                                <ImageIcon className="w-3 h-3" />
                                <span>View</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500">-</span>
                            )}
                          </td>
                        )}
                        {/* Contact No - Admin Only */}
                        {isAdmin && (
                          <td className="py-3 px-3 text-center align-middle">
                            {renderContact(d['Contact No'])}
                          </td>
                        )}


                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatPKR(d.Amount)}
                        </td>

                        {/* Actions - Admin Only */}
                        {isAdmin && (
                          <td
                            className="py-3 px-3 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && onApproveDonation && (
                                <button
                                  type="button"
                                  onClick={() => onApproveDonation(d.id)}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => onExportReceipt(d)}
                                title="Generate PDF Receipt"
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDuplicateDonation(e, d)}
                                title="Add Another Donation for this Person"
                                className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors cursor-pointer"
                              >
                                <CopyPlus className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleEditDonation(e, d)}
                                title="Edit Donation Record"
                                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => onSelectDonation(d)}
                                title="View Details"
                                className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {onDeleteDonation && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteDonation(d.id)}
                                  title="Delete Record"
                                  className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:text-red-500 hover:bg-red-500/20 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
                {filteredDonations.length > 0 && (
                  <tr className="bg-emerald-500/10 dark:bg-emerald-500/20 font-bold border-t-2 border-emerald-500/30">
                    {isAdmin && <td></td>}
                    <td colSpan={2} className="py-4 px-3 text-right">
                      <span className="text-emerald-700 dark:text-emerald-300 text-sm font-bold uppercase tracking-wider">Total</span>
                    </td>
                    <td className="py-4 px-3"></td>
                    {isAdmin && <td className="py-4 px-3"></td>}
                    {isAdmin && <td className="py-4 px-3"></td>}
                    <td className="py-4 px-3 text-right">
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base whitespace-nowrap">
                        {formatPKR(
                          filteredDonations.reduce((sum, d) => sum + (Number(d.Amount) || 0), 0)
                        )}
                      </span>
                    </td>
                    {isAdmin && <td className="py-4 px-3"></td>}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Screenshot Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn">
          <div className="relative max-w-3xl w-full flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-red-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" /> Close
            </button>
            {!!lightboxImage.url && (
              <img
                src={lightboxImage.url || null}
                alt="Payment Screenshot"
                className="max-h-[82vh] w-auto max-w-full rounded-xl border border-slate-700 shadow-2xl object-contain"
              />
            )}
            <p className="text-xs text-slate-300 mt-2.5 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{lightboxImage.title}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
