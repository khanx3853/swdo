import React, { useState, useEffect, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Building,
  MapPin,
  User,
  CreditCard,
  Landmark,
  RotateCcw,
  CheckCircle2,
  MessageSquare,
  Key,
  Phone,
  Send,
  Loader2,
  AlertCircle,
  HelpCircle,
  AlertTriangle,
  ExternalLink,
  Info,
} from 'lucide-react';
import { PortalSettings } from '../../types';

interface SettingsTabProps {
  settings: PortalSettings;
  onSaveSettings: (settings: PortalSettings) => void;
  onResetDefaults: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onSaveSettings,
  onResetDefaults,
}) => {
  const [formData, setFormData] = useState<PortalSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync formData whenever settings prop updates from Firestore/Parent
  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  // SMS Test state
  const [testPhone, setTestPhone] = useState('');
  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    lowBalance?: boolean;
    message?: string;
    details?: string;
  }>({ loading: false });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSendTestSms = async () => {
    if (!testPhone.trim()) {
      setTestStatus({
        loading: false,
        success: false,
        message: 'Please enter a valid mobile number (e.g. 03472021703 or +923472021703)',
      });
      return;
    }

    setTestStatus({ loading: true });
    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhone.trim(),
          message: `SWDO Test SMS: Assalam-o-Alaikum! Your Veevo Tech SMS gateway is working perfectly. Time: ${new Date().toLocaleTimeString('en-US')}`,
          hash: formData.VeevoSmsHash || 'd9eb3e26f4532bcbbca611804241635a',
          senderNum: formData.VeevoSenderNum || 'Default',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus({
          loading: false,
          success: true,
          lowBalance: false,
          message: `SMS dispatched successfully! Message ID: ${data.messageId || 'Delivered'}${data.charged ? ` (Cost: ${data.charged})` : ''}`,
        });
      } else {
        const isLowBalance = !!data.lowBalance || 
          (typeof data.error === 'string' && data.error.includes('LOW_BALANCE')) ||
          (data.data && (data.data.ERROR_FILTER === 'LOW_BALANCE' || data.data.ERROR_CODE === 'TAPI-149730721'));

        setTestStatus({
          loading: false,
          success: false,
          lowBalance: isLowBalance,
          message: isLowBalance
            ? 'Required balance is not available in your Veevo Tech account (LOW_BALANCE). Please recharge credits at oneid.veevotech.com to resume SMS dispatches.'
            : (data.error || 'SMS delivery failed'),
        });
      }
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        lowBalance: false,
        message: err.message || 'Failed to connect to backend SMS service',
      });
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold dark:text-emerald-300 text-emerald-700 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-emerald-500" />
            <span>Portal & Foundation Configuration</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure official NGO titles, cabinet signatories, and payment accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold animate-pulse">
              <CheckCircle2 className="w-4 h-4" />
              <span>Changes Saved!</span>
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onSaveSettings(formData);
              setSavedSuccess(true);
              setTimeout(() => setSavedSuccess(false), 3000);
            }}
            className="glow-button px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-lg"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Settings Form Card */}
      <div className="glass-card p-4 sm:p-6 shadow-2xl border-purple-500/40">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3 pb-1 border-b dark:border-purple-900/40 border-purple-200">
              1. Foundation Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="field-box">
                <input
                  type="text"
                  value={formData['Foundation Name']}
                  onChange={(e) =>
                    setFormData({ ...formData, 'Foundation Name': e.target.value })
                  }
                  required
                  className="field-input font-semibold"
                  placeholder=" "
                />
                <Building className="field-icon text-emerald-500 w-4 h-4" />
                <label className="field-label">Foundation / Trust Name</label>
              </div>

              <div className="field-box">
                <input
                  type="text"
                  value={formData.SubTitle}
                  onChange={(e) =>
                    setFormData({ ...formData, SubTitle: e.target.value })
                  }
                  required
                  className="field-input"
                  placeholder=" "
                />
                <MapPin className="field-icon text-blue-500 w-4 h-4" />
                <label className="field-label">Branch / Region Subtitle</label>
              </div>

              <div className="field-box md:col-span-2">
                <input
                  type="text"
                  value={formData.Address}
                  onChange={(e) =>
                    setFormData({ ...formData, Address: e.target.value })
                  }
                  required
                  className="field-input"
                  placeholder=" "
                />
                <MapPin className="field-icon text-amber-500 w-4 h-4" />
                <label className="field-label">Full Head Office Address</label>
              </div>
            </div>
          </div>

          {/* Cabinet Signatories */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3 pb-1 border-b dark:border-purple-900/40 border-purple-200">
              2. Official Cabinet Signatories
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="field-box">
                <input
                  type="text"
                  value={formData.Chairperson}
                  onChange={(e) =>
                    setFormData({ ...formData, Chairperson: e.target.value })
                  }
                  required
                  className="field-input"
                  placeholder=" "
                />
                <User className="field-icon text-emerald-500 w-4 h-4" />
                <label className="field-label">President / Chairperson</label>
              </div>

              <div className="field-box">
                <input
                  type="text"
                  value={formData.Secretary}
                  onChange={(e) =>
                    setFormData({ ...formData, Secretary: e.target.value })
                  }
                  required
                  className="field-input"
                  placeholder=" "
                />
                <User className="field-icon text-blue-500 w-4 h-4" />
                <label className="field-label">General Secretary</label>
              </div>

              <div className="field-box">
                <input
                  type="text"
                  value={formData.Treasurer}
                  onChange={(e) =>
                    setFormData({ ...formData, Treasurer: e.target.value })
                  }
                  required
                  className="field-input"
                  placeholder=" "
                />
                <User className="field-icon text-purple-500 w-4 h-4" />
                <label className="field-label">Finance Secretary / Treasurer</label>
              </div>
            </div>
          </div>

          {/* Accounts for Donations */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3 pb-1 border-b dark:border-purple-900/40 border-purple-200">
              3. Donation Collection Accounts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="field-box">
                <input
                  type="text"
                  value={formData['Easypaisa No']}
                  onChange={(e) =>
                    setFormData({ ...formData, 'Easypaisa No': e.target.value })
                  }
                  className="field-input font-mono"
                  placeholder=" "
                />
                <CreditCard className="field-icon text-emerald-500 w-4 h-4" />
                <label className="field-label">Easypaisa / Mobile No</label>
              </div>

              <div className="field-box">
                <input
                  type="text"
                  value={formData['Easypaisa Title']}
                  onChange={(e) =>
                    setFormData({ ...formData, 'Easypaisa Title': e.target.value })
                  }
                  className="field-input"
                  placeholder=" "
                />
                <User className="field-icon text-emerald-500 w-4 h-4" />
                <label className="field-label">Easypaisa Account Title</label>
              </div>

              <div className="field-box">
                <input
                  type="text"
                  value={formData['Bank Title']}
                  onChange={(e) =>
                    setFormData({ ...formData, 'Bank Title': e.target.value })
                  }
                  className="field-input"
                  placeholder=" "
                />
                <Landmark className="field-icon text-purple-500 w-4 h-4" />
                <label className="field-label">Bank Name</label>
              </div>

              <div className="field-box">
                <input
                  type="text"
                  value={formData['Account Title'] || formData['Easypaisa Title'] || 'ALI BAHADUR'}
                  onChange={(e) =>
                    setFormData({ ...formData, 'Account Title': e.target.value })
                  }
                  className="field-input"
                  placeholder=" "
                />
                <User className="field-icon text-purple-500 w-4 h-4" />
                <label className="field-label">Bank Account Title</label>
              </div>

              <div className="field-box">
                <input
                  type="text"
                  value={formData['Bank Account No'] || '00300110485989'}
                  onChange={(e) =>
                    setFormData({ ...formData, 'Bank Account No': e.target.value })
                  }
                  className="field-input font-mono"
                  placeholder=" "
                />
                <Landmark className="field-icon text-purple-500 w-4 h-4" />
                <label className="field-label">Bank Account Number</label>
              </div>

              <div className="field-box">
                <input
                  type="text"
                  value={formData['Bank No']}
                  onChange={(e) =>
                    setFormData({ ...formData, 'Bank No': e.target.value })
                  }
                  className="field-input font-mono"
                  placeholder=" "
                />
                <Landmark className="field-icon text-blue-500 w-4 h-4" />
                <label className="field-label">Official Bank IBAN</label>
              </div>
            </div>
          </div>

          {/* 4. Automated SMS Gateway Configuration */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-1 border-b dark:border-purple-900/40 border-purple-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                <span>4. Automated SMS Notifications (Veevo Tech Gateway)</span>
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-semibold">
                api.veevotech.com active
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              When enabled, donators will automatically receive an instant SMS receipt on their mobile number as soon as their donation is submitted or verified.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Automation Toggles */}
              <div className="p-4 rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-900/60 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                    Automation Triggers
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Tap to toggle ON / OFF
                  </span>
                </div>

                {/* 1. Donation Submission SMS Trigger */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    const nextVal = !(formData.AutoSmsSubmission !== false);
                    setFormData((prev) => ({ ...prev, AutoSmsSubmission: nextVal }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      const nextVal = !(formData.AutoSmsSubmission !== false);
                      setFormData((prev) => ({ ...prev, AutoSmsSubmission: nextVal }));
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                    formData.AutoSmsSubmission !== false
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-800/40 border-slate-700/60 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Send SMS upon Donation Submission
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          formData.AutoSmsSubmission !== false
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-700 text-slate-400 border border-slate-600'
                        }`}
                      >
                        {formData.AutoSmsSubmission !== false ? 'ACTIVE' : 'OFF'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
                      Immediately sends an SMS acknowledgment to the donor when donation proof is uploaded.
                    </span>
                  </div>

                  {/* iOS Style Switch Pill */}
                  <div
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      formData.AutoSmsSubmission !== false ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        formData.AutoSmsSubmission !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* 2. Admin Approval SMS Trigger */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    const nextVal = !(formData.AutoSmsApproval !== false);
                    setFormData((prev) => ({ ...prev, AutoSmsApproval: nextVal }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      const nextVal = !(formData.AutoSmsApproval !== false);
                      setFormData((prev) => ({ ...prev, AutoSmsApproval: nextVal }));
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                    formData.AutoSmsApproval !== false
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-800/40 border-slate-700/60 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Send SMS upon Admin Approval
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          formData.AutoSmsApproval !== false
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-700 text-slate-400 border border-slate-600'
                        }`}
                      >
                        {formData.AutoSmsApproval !== false ? 'ACTIVE' : 'OFF'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
                      Sends a verified confirmation SMS once the admin reviews and approves the donation into ledger.
                    </span>
                  </div>

                  {/* iOS Style Switch Pill */}
                  <div
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      formData.AutoSmsApproval !== false ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        formData.AutoSmsApproval !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onSaveSettings(formData);
                      setSavedSuccess(true);
                      setTimeout(() => setSavedSuccess(false), 3000);
                    }}
                    className="px-3 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save Trigger Preferences</span>
                  </button>
                </div>
              </div>

              {/* API Credentials */}
              <div className="p-4 rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-900/60 bg-slate-50/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  Gateway Credentials
                </h4>

                <div className="field-box">
                  <input
                    type="password"
                    value={formData.VeevoSmsHash || 'd9eb3e26f4532bcbbca611804241635a'}
                    onChange={(e) =>
                      setFormData({ ...formData, VeevoSmsHash: e.target.value })
                    }
                    className="field-input font-mono text-xs"
                    placeholder=" "
                  />
                  <Key className="field-icon text-emerald-500 w-4 h-4" />
                  <label className="field-label">Veevo Tech API Hash</label>
                </div>

                <div className="field-box">
                  <input
                    type="text"
                    value={formData.VeevoSenderNum || 'Default'}
                    onChange={(e) =>
                      setFormData({ ...formData, VeevoSenderNum: e.target.value })
                    }
                    className="field-input font-mono"
                    placeholder=" "
                  />
                  <Phone className="field-icon text-purple-500 w-4 h-4" />
                  <label className="field-label">Masking / Sender ID (e.g. Default)</label>
                </div>

                <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-700 dark:text-blue-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Veevo Tech Balance & Service Guide:</span>
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[10.5px] opacity-90">
                    <li>
                      <strong>Service Allocation:</strong> In the Veevo Tech (OneID) portal, deposited funds often sit in <em>Main Wallet</em>. Allocate or assign funds to the <strong>SMS Service / CPaaS</strong>.
                    </li>
                    <li>
                      <strong>Masking vs Default:</strong> If you purchased <em>Masked SMS</em> (branded with your org name, e.g. SWDO), replace <code className="font-mono bg-blue-500/20 px-1 rounded">Default</code> with your approved brand name above.
                    </li>
                    <li>
                      <strong>API Key Match:</strong> Verify that the Hash above corresponds to the active account/project containing your SMS credits.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Custom Message Templates */}
            <div className="space-y-3 p-4 rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-900/40 bg-slate-50/40 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  SMS Text Templates
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Tags: <code className="text-emerald-500">{`{donor}`}</code>, <code className="text-emerald-500">{`{amount}`}</code>, <code className="text-emerald-500">{`{txn}`}</code>, <code className="text-emerald-500">{`{org}`}</code>
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Submission SMS Template:
                </label>
                <textarea
                  rows={2}
                  value={formData.SmsSubmissionTemplate || 'Dear {donor}, thank you for your donation of Rs. {amount} to Shangla Welfare & Development Org (REG# 5514). Trx ID: {txn}. Your contribution has been received for verification. May Allah reward you!'}
                  onChange={(e) =>
                    setFormData({ ...formData, SmsSubmissionTemplate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none font-sans"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Approval SMS Template:
                </label>
                <textarea
                  rows={2}
                  value={formData.SmsApprovalTemplate || 'Dear {donor}, your donation of Rs. {amount} (Trx ID: {txn}) has been verified & approved by Shangla Welfare & Development Org. Thank you for your support!'}
                  onChange={(e) =>
                    setFormData({ ...formData, SmsApprovalTemplate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none font-sans"
                />
              </div>
            </div>

            {/* Interactive Live SMS Test Utility */}
            <div className="p-4 rounded-xl border dark:border-emerald-900/40 border-emerald-200 bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Send className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  Live Veevo Tech Gateway Tester
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3">
                Send a real test SMS right now to verify that your Veevo Tech API hash and sender ID are operational.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Enter mobile number (e.g. 03472021703 or +923001234567)"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendTestSms}
                  disabled={testStatus.loading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {testStatus.loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Send Test SMS</span>
                </button>
              </div>

              {testStatus.message && (
                <div
                  className={`mt-3 p-3 rounded-xl text-xs border ${
                    testStatus.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : testStatus.lowBalance
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {testStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                    ) : testStatus.lowBalance ? (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                    )}
                    <div className="space-y-2 flex-1">
                      <p className="font-semibold leading-relaxed">{testStatus.message}</p>
                      {testStatus.lowBalance && (
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          <a
                            href="https://oneid.veevotech.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
                          >
                            <span>Recharge Account at oneid.veevotech.com</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="text-[11px] text-amber-700 dark:text-amber-300">
                            (Your portal database and donations operate normally)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit & Reset Buttons */}
          <div className="flex items-center justify-between pt-4 border-t dark:border-purple-900/40 border-purple-200">
            <button
              type="button"
              onClick={onResetDefaults}
              className="px-4 py-2 rounded-xl text-xs font-semibold dark:bg-slate-800 bg-slate-200 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default Settings</span>
            </button>

            <button
              type="submit"
              className="glow-button px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
