import React, { useState, useRef } from 'react';
import {
  X,
  HeartHandshake,
  Copy,
  Check,
  Building,
  Smartphone,
  ShieldCheck,
  CreditCard,
  FileText,
  Coins,
  User,
  Phone,
  ArrowRight,
  Sparkles,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Eye,
  AlertCircle,
  Clock,
  CheckCircle2,
  Maximize2,
} from 'lucide-react';
import { Donation, PortalSettings } from '../../types';
import { formatPKR } from '../../utils/formatters';
import { compressImageFile } from '../../utils/imageUtils';
import { playSuccessChime } from '../../utils/audio';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: PortalSettings;
  onSaveDonation?: (donation: Donation) => void;
  currentUsername?: string;
  onExportReceipt?: (donation: Donation) => void;
}

export const DonateModal: React.FC<DonateModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveDonation,
  currentUsername = 'Portal Donor',
  onExportReceipt,
}) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'record'>('accounts');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form states
  const [amount, setAmount] = useState<string>('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [purpose, setPurpose] = useState('Sadaqah');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [txnId, setTxnId] = useState('');
  const [remarks, setRemarks] = useState('');
  
  // Payment Proof Screenshot state (Required)
  const [paymentMethodError, setPaymentMethodError] = useState<string>('');
  const [proofImage, setProofImage] = useState<string>('');
  const [proofFileName, setProofFileName] = useState<string>('');
  const [proofFileSize, setProofFileSize] = useState<string>('');
  const [proofError, setProofError] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submittedDonation, setSubmittedDonation] = useState<Donation | null>(null);

  if (!isOpen) return null;

  const easypaisaNo = settings?.['Easypaisa No'] || '03472021703';
  const easypaisaTitle = settings?.['Easypaisa Title'] || 'ALI BAHADUR';
  const bankNo = settings?.['Bank No'] || 'PK34MEZN0000300110485989';
  const bankAccountNo = settings?.['Bank Account No'] || '00300110485989';
  const bankTitle = settings?.['Bank Title'] || 'MEEZAN BANK';
  const accountTitle = settings?.['Account Title'] || easypaisaTitle || 'ALI BAHADUR';
  const foundationName = settings?.['Foundation Name'] || 'Shangla Welfare & Development Organisation';

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const presetAmounts = [300, 500, 1000, 2500, 5000, 10000, 15000, 30000, 50000, 100000, 300000];

  const handleProcessFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProofError('Please upload a valid image file (JPG, PNG, WebP, etc.)');
      return;
    }

    try {
      setIsProcessingImage(true);
      setProofError('');
      const compressedDataUrl = await compressImageFile(file, 1400, 0.88);
      setProofImage(compressedDataUrl);
      setProofFileName(file.name);
      const sizeKb = (file.size / 1024).toFixed(0);
      setProofFileSize(`${sizeKb} KB`);
    } catch (err) {
      setProofError('Failed to process image screenshot. Please try another image.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleRemoveProof = () => {
    setProofImage('');
    setProofFileName('');
    setProofFileSize('');
    setProofError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) return;

    // Validate required payment method
    if (!paymentMethod) {
      setPaymentMethodError('Payment method is required. Please select how you transferred funds.');
      return;
    }

    // Validate required proof image
    if (!proofImage) {
      setProofError('Payment screenshot proof is required. Please upload the transaction receipt/screenshot.');
      return;
    }

    const generatedTxn = txnId.trim() || `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    const newDonation: Donation = {
      id: `don-live-${Date.now()}`,
      Date: new Date().toISOString().split('T')[0],
      'Donor Name': donorName.trim() || 'Anonymous (فی سبیل اللہ)',
      'NIC No': '',
      'Contact No': contactNo.trim(),
      DonorEmail: donorEmail.trim(),
      'Permanent Address': 'District Shangla, KP',
      Profession: 'Contributor / Philanthropist',
      Amount: numAmount,
      'Transaction ID': generatedTxn,
      Category: purpose || 'Sadaqah & Welfare',
      Remarks: `${purpose} • ${paymentMethod || 'Easypaisa'}${remarks ? ` • ${remarks}` : ''}`,
      EnteredBy: currentUsername,
      ProofImage: proofImage,
      Status: 'Pending',
      SubmittedAt: new Date().toISOString(),
      isLiveAdded: true,
    } as any;

    if (onSaveDonation) {
      onSaveDonation(newDonation);
    }

    // Play subtle notification chime for immediate audio feedback
    playSuccessChime();

    // Trigger automated admin email notification backend endpoint only for Pending status
    // We execute this asynchronously so it doesn't block the UI rendering the success state
    if (newDonation.Status === 'Pending') {
      const triggerNotification = async () => {
        try {
          const resp = await fetch('/api/notify-donation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newDonation),
          });
          const data = await resp.json();
          console.log("Email notification response from modal:", data);
        } catch (err) {
          console.error("Failed to trigger email notification:", err);
        }
      };
      
      void triggerNotification();
    }

    setSubmittedDonation(newDonation);
  };

  const handleResetModal = () => {
    setSubmittedDonation(null);
    setAmount('');
    setDonorName('');
    setDonorEmail('');
    setContactNo('');
    setPaymentMethod('');
    setPaymentMethodError('');
    setTxnId('');
    setRemarks('');
    setProofImage('');
    setProofFileName('');
    setProofFileSize('');
    setProofError('');
    setActiveTab('accounts');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="glass-card max-w-lg w-full p-4 sm:p-6 shadow-2xl relative border-emerald-500/40 my-auto max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleResetModal}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b dark:border-purple-900/40 border-purple-200">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Donate Now</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30">
                SWDO Relief
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
              {foundationName}
            </p>
          </div>
        </div>

        {/* If donation just submitted, show Verification Pending Confirmation */}
        {submittedDonation ? (
          <div className="py-2 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-500/30 shadow-lg">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold mb-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Status: Submitted for Admin Approval</span>
            </div>

            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              JazakAllah Khair!
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-3.5 leading-relaxed">
              Your contribution of{' '}
              <span className="font-bold text-emerald-400 font-mono">
                {formatPKR(submittedDonation.Amount)}
              </span>{' '}
              and payment screenshot have been submitted. Once verified by SWDO administration, it will be officially approved and added to the ledger data.
            </p>

            {/* Proof screenshot thumbnail */}
            {submittedDonation.ProofImage && (
              <div className="mb-3.5 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-left">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    Uploaded Proof of Payment:
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(true)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" /> View Full Image
                  </button>
                </div>
                <div 
                  onClick={() => setPreviewModalOpen(true)}
                  className="relative rounded-lg overflow-hidden border border-slate-700 bg-black cursor-pointer group max-h-36 flex items-center justify-center"
                >
                  <img
                    src={submittedDonation.ProofImage}
                    alt="Payment Proof"
                    className="w-full object-contain max-h-36 group-hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5">
                    <Maximize2 className="w-4 h-4" /> Click to enlarge
                  </div>
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-purple-900/40 text-left text-xs mb-4 space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="text-emerald-400 font-bold">{submittedDonation['Transaction ID']}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Donor Name:</span>
                <span className="text-slate-200 font-sans">{submittedDonation['Donor Name']}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="text-slate-300">{submittedDonation.Date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Remarks:</span>
                <span className="text-slate-300 truncate max-w-[200px]">{submittedDonation.Remarks}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              {onExportReceipt && (
                <button
                  type="button"
                  onClick={() => onExportReceipt(submittedDonation)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download Pending Receipt</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleResetModal}
                className="flex-1 py-2.5 px-4 rounded-xl dark:bg-slate-800 bg-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Close & Return
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* View Selector Tabs */}
            <div className="flex rounded-xl p-1 bg-slate-900/60 border dark:border-purple-900/40 border-purple-200 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('accounts')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'accounts'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Account Details</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('record')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'record'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Submit Contribution</span>
              </button>
            </div>

            {/* TAB 1: ACCOUNTS */}
            {activeTab === 'accounts' && (
              <div className="space-y-3.5">
                {/* Easypaisa Box */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-teal-950/30 border border-emerald-500/40 shadow-inner">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        EP
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Easypaisa Account
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Zero Transfer Fee
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Account Number */}
                    <div className="bg-black/30 p-2.5 rounded-xl border border-emerald-500/20 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Easypaisa Number</p>
                        <p className="text-base sm:text-lg font-mono font-bold text-emerald-300">
                          {easypaisaNo}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(easypaisaNo, 'ep-num')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow shrink-0 cursor-pointer"
                      >
                        {copiedKey === 'ep-num' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Account Title */}
                    <div className="bg-black/25 px-3 py-2 rounded-xl border border-emerald-500/15 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px] text-slate-400 shrink-0">Account Title:</span>
                        <span className="text-xs sm:text-sm font-bold text-white uppercase truncate">
                          {easypaisaTitle}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(easypaisaTitle, 'ep-title')}
                        className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                      >
                        {copiedKey === 'ep-title' ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Meezan Bank Box */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 to-indigo-950/30 border border-purple-500/40 shadow-inner">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <Building className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {bankTitle} (Islamic Banking)
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                      Shariah Compliant
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Account Title */}
                    <div className="bg-black/25 px-3 py-2 rounded-xl border border-purple-500/15 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px] text-slate-400 shrink-0">Account Title:</span>
                        <span className="text-xs sm:text-sm font-bold text-white uppercase truncate">
                          {accountTitle}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(accountTitle, 'bank-title')}
                        className="text-[11px] font-semibold text-purple-300 hover:text-purple-200 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                      >
                        {copiedKey === 'bank-title' ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Account Number */}
                    <div className="bg-black/30 p-2.5 rounded-xl border border-purple-500/20 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Account Number</p>
                        <p className="text-sm sm:text-base font-mono font-bold text-purple-300">
                          {bankAccountNo}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(bankAccountNo, 'bank-acct')}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow shrink-0 cursor-pointer"
                      >
                        {copiedKey === 'bank-acct' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* IBAN */}
                    <div className="bg-black/30 p-2.5 rounded-xl border border-purple-500/20 flex items-center justify-between gap-2">
                      <div className="min-w-0 pr-1">
                        <p className="text-[10px] text-slate-400 font-medium">Bank IBAN</p>
                        <p className="text-xs sm:text-sm font-mono font-bold text-purple-200 break-all">
                          {bankNo}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(bankNo, 'bank-iban')}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow shrink-0 cursor-pointer"
                      >
                        {copiedKey === 'bank-iban' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Transparency Guarantee */}
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong className="text-slate-200">100% Transparency:</strong> All funds are strictly audited and disbursed for local hospital medical relief, food distribution, and orphan dossiers across District Shangla.
                  </p>
                </div>

                {/* Switch to Record Donation */}
                <button
                  type="button"
                  onClick={() => setActiveTab('record')}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 flex items-center justify-center gap-2 transition-all group cursor-pointer"
                >
                  <span>Already Transferred? Upload Proof & Submit for Approval</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

            {/* TAB 2: RECORD DONATION FORM */}
            {activeTab === 'record' && (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Preset Amount Chips */}
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

                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Custom amount in PKR"
                      className="w-full py-2 px-3 pl-12 rounded-xl bg-slate-900/80 border border-purple-900/50 text-white font-mono font-bold text-sm focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-400 font-mono">
                      Rs.
                    </span>
                  </div>
                </div>

                {/* Donor Name, Contact & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-semibold text-slate-400">
                        Donor Name <span className="text-red-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setDonorName('Anonymous (فی سبیل اللہ)')}
                        className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                      >
                        Set Anonymous
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="e.g. Haji Sher Ali"
                      className="w-full py-2 px-3 rounded-xl bg-slate-900/80 border border-purple-900/50 text-white text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Contact / Mobile No
                    </label>
                    <input
                      type="tel"
                      value={contactNo}
                      onChange={(e) => setContactNo(e.target.value)}
                      placeholder="e.g. 0347-1234567"
                      className="w-full py-2 px-3 rounded-xl bg-slate-900/80 border border-purple-900/50 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Donor Email Address (Optional - receive email receipt & status alerts)
                  </label>
                  <input
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="e.g. donor@example.com"
                    className="w-full py-2 px-3 rounded-xl bg-slate-900/80 border border-purple-900/50 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Purpose and Payment Method */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Category / Cause</label>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900/80 border border-purple-900/50 text-white text-xs focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Masajid Donations">🕌 Masajid Donations (مسجد تعمیر و دیکھ بھال)</option>
                      <option value="Sadaqah">Sadaqah & Welfare</option>
                      <option value="Zakat">Zakat Fund</option>
                      <option value="Orphan Care">Orphan & Widow Relief</option>
                      <option value="Medical Relief">Emergency Medical Relief</option>
                      <option value="Ration Package">Ramadan / Food Ration</option>
                      <option value="General Donation">General Welfare Fund</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Payment Method <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value);
                        setPaymentMethodError('');
                      }}
                      className={`w-full py-2 px-3 rounded-xl bg-slate-900/80 border text-white text-xs focus:outline-none transition-all ${
                        paymentMethodError
                          ? 'border-rose-500 ring-1 ring-rose-500/50'
                          : 'border-purple-900/50 focus:border-emerald-500'
                      }`}
                    >
                      <option value="">-- Select Payment Method --</option>
                      <option value="Easypaisa">Easypaisa</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash / In-person">Cash / In-person</option>
                      <option value="Other / Cheque">Other / Cheque</option>
                    </select>
                    {paymentMethodError && (
                      <p className="text-[11px] text-rose-400 font-medium mt-1">{paymentMethodError}</p>
                    )}
                  </div>
                </div>

                {/* Transaction ID */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Transaction ID / Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={txnId}
                    onChange={(e) => setTxnId(e.target.value)}
                    placeholder="e.g. 2938491823 or TR-9821"
                    className="w-full py-2 px-3 rounded-xl bg-slate-900/80 border border-purple-900/50 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* PROOF OF PAYMENT SCREENSHOT UPLOAD (REQUIRED) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Upload Proof of Payment Screenshot</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                        Required
                      </span>
                    </label>
                    {proofImage && (
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    )}
                  </div>

                  {/* Hidden native input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {proofImage ? (
                    /* Uploaded preview box */
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 flex items-center gap-3">
                      <div 
                        onClick={() => setPreviewModalOpen(true)}
                        className="relative w-16 h-16 rounded-lg overflow-hidden border border-emerald-500/30 bg-black cursor-pointer shrink-0 group"
                      >
                        <img
                          src={proofImage}
                          alt="Screenshot Preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {proofFileName || 'payment_proof.jpg'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {proofFileSize || 'Image attached'} • Ready for admin review
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewModalOpen(true)}
                            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> View Large
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveProof}
                            className="text-[11px] font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Dropzone / Upload button */
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all text-center flex flex-col items-center justify-center gap-1.5 ${
                        isDragging
                          ? 'border-emerald-400 bg-emerald-500/10'
                          : proofError
                          ? 'border-red-500/60 bg-red-500/5 hover:border-red-400'
                          : 'border-slate-700 bg-slate-900/50 hover:border-emerald-500/60 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-0.5">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-200">
                        {isProcessingImage ? 'Compressing Screenshot...' : 'Click or Drag Payment Screenshot Here'}
                      </p>
                      <p className="text-[10px] text-slate-400 max-w-xs">
                        Easypaisa / Bank Transfer confirmation screenshot (JPG, PNG, WebP)
                      </p>
                    </div>
                  )}

                  {proofError && (
                    <p className="text-[11px] text-red-400 flex items-center gap-1 font-medium mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{proofError}</span>
                    </p>
                  )}
                </div>

                {/* Verification Notice */}
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-amber-300/90 text-xs">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Admin Verification:</strong> Once submitted, the admin council will review your payment screenshot and approve it to be added to the official SWDO portal data.
                  </p>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isProcessingImage}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Submit for Admin Approval</span>
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* Screenshot Lightbox Modal */}
      {previewModalOpen && (proofImage || submittedDonation?.ProofImage) && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4">
          <div className="relative max-w-3xl w-full flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewModalOpen(false)}
              className="absolute -top-10 right-0 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-red-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" /> Close Preview
            </button>
            <img
              src={submittedDonation?.ProofImage || proofImage}
              alt="Payment Proof Full"
              className="max-h-[80vh] w-auto max-w-full rounded-xl border border-slate-700 shadow-2xl object-contain"
            />
            <p className="text-xs text-slate-400 mt-2 font-mono">
              Proof of Payment Screenshot
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
