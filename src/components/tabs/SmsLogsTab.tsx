import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Phone,
  Clock,
  Send,
  Key,
  Info,
  Loader2,
  Save,
  ShieldAlert
} from 'lucide-react';
import { SmsLog, PortalSettings } from '../../types';
import { fetchCollection } from '../../lib/firestoreSync';

interface SmsLogsTabProps {
  isAdmin?: boolean;
  settings: PortalSettings;
  onSaveSettings: (settings: PortalSettings) => void;
}

export const SmsLogsTab: React.FC<SmsLogsTabProps> = ({
  isAdmin = false,
  settings,
  onSaveSettings
}) => {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formData, setFormData] = useState<PortalSettings>({ ...settings });
  const [testPhone, setTestPhone] = useState('');
  const [testStatus, setTestStatus] = useState<{ loading?: boolean; success?: boolean; lowBalance?: boolean; message?: string }>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      let combined: SmsLog[] = [];
      try {
        const data = await fetchCollection<SmsLog>('sms_logs');
        if (data && data.length > 0) {
          combined = [...data];
        }
      } catch (e) {
        // Table might not exist yet
      }

      // Also get any local logs
      try {
        const local = localStorage.getItem('swdo_sms_logs');
        if (local) {
          const parsed: SmsLog[] = JSON.parse(local);
          const existingIds = new Set(combined.map(l => l.id));
          parsed.forEach(p => {
            if (!existingIds.has(p.id)) {
              combined.push(p);
            }
          });
        }
      } catch (e) {}

      if (combined.length === 0) {
        const sampleLog: SmsLog = {
          id: 'sms_sample_' + Date.now(),
          recipient: '03472021703',
          message: 'Assalamu Alaikum! Test SMS log from SWDO Relief Portal.',
          type: 'System Test',
          status: 'Delivered',
          timestamp: new Date().toISOString(),
        };
        combined = [sampleLog];
      }

      const sorted = combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(sorted);
    } catch (err) {
      console.error('Failed to load SMS logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

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
          type: 'Gateway Test'
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
        loadLogs(); // Refresh logs
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
        loadLogs();
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

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.type?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || log.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalSent = logs.length;
  const deliveredCount = logs.filter(l => l.status === 'Delivered').length;
  const failedCount = logs.filter(l => l.status === 'Failed').length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                SMS Hub & Delivery Logs
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage Veevo Tech SMS gateway configuration, automated triggers, templates, and audit history.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved!</span>
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
            className="glow-button px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save SMS Config</span>
          </button>
        </div>
      </div>

      {/* Gateway Configuration & Templates Section */}
      <div className="glass-card p-6 shadow-xl border-purple-500/40 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b dark:border-purple-900/40 border-purple-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span>Veevo Tech Gateway & Automation Hub</span>
          </h3>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-semibold">
            api.veevotech.com active
          </span>
        </div>

        {/* Triggers and Credentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* 1. Submission */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                const nextVal = !(formData.AutoSmsSubmission !== false);
                setFormData((prev) => ({ ...prev, AutoSmsSubmission: nextVal }));
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
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    formData.AutoSmsSubmission !== false ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-700 text-slate-400 border border-slate-600'
                  }`}>
                    {formData.AutoSmsSubmission !== false ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
                  Immediately sends an SMS acknowledgment when donation proof is uploaded.
                </span>
              </div>
              <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                formData.AutoSmsSubmission !== false ? 'bg-emerald-500' : 'bg-slate-600'
              }`}>
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                  formData.AutoSmsSubmission !== false ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </div>

            {/* 2. Approval */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                const nextVal = !(formData.AutoSmsApproval !== false);
                setFormData((prev) => ({ ...prev, AutoSmsApproval: nextVal }));
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
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    formData.AutoSmsApproval !== false ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-700 text-slate-400 border border-slate-600'
                  }`}>
                    {formData.AutoSmsApproval !== false ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
                  Sends confirmation SMS once admin approves donation into ledger.
                </span>
              </div>
              <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                formData.AutoSmsApproval !== false ? 'bg-emerald-500' : 'bg-slate-600'
              }`}>
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                  formData.AutoSmsApproval !== false ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </div>

            {/* 3. Beneficiary */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                const nextVal = !(formData.AutoSmsBeneficiary !== false);
                setFormData((prev) => ({ ...prev, AutoSmsBeneficiary: nextVal }));
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                formData.AutoSmsBeneficiary !== false
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800/40 border-slate-700/60 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Send SMS upon Beneficiary Registration
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    formData.AutoSmsBeneficiary !== false ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-700 text-slate-400 border border-slate-600'
                  }`}>
                    {formData.AutoSmsBeneficiary !== false ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
                  Sends SMS notification when relief record is added and saved.
                </span>
              </div>
              <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                formData.AutoSmsBeneficiary !== false ? 'bg-emerald-500' : 'bg-slate-600'
              }`}>
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                  formData.AutoSmsBeneficiary !== false ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </div>
          </div>

          {/* Gateway Credentials */}
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
                <span>Veevo Tech Balance Guide:</span>
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[10.5px] opacity-90">
                <li>Funds must be allocated in the <strong>SMS Service / CPaaS</strong> wallet at oneid.veevotech.com.</li>
                <li>If using Masked SMS, replace <code className="font-mono bg-blue-500/20 px-1 rounded">Default</code> with your approved brand name.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Custom Message Templates */}
        <div className="space-y-3 p-4 rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-900/40 bg-slate-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              SMS Text Templates
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Tags: <code className="text-emerald-500">{`{donor}`}</code>, <code className="text-emerald-500">{`{beneficiary}`}</code>, <code className="text-emerald-500">{`{amount}`}</code>, <code className="text-emerald-500">{`{txn}`}</code>, <code className="text-emerald-500">{`{org}`}</code>
            </span>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Submission SMS Template:
            </label>
            <textarea
              rows={2}
              value={formData.SmsSubmissionTemplate || ''}
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
              value={formData.SmsApprovalTemplate || ''}
              onChange={(e) =>
                setFormData({ ...formData, SmsApprovalTemplate: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none font-sans"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Beneficiary Registration SMS Template:
            </label>
            <textarea
              rows={2}
              value={formData.SmsBeneficiaryTemplate || ''}
              onChange={(e) =>
                setFormData({ ...formData, SmsBeneficiaryTemplate: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none font-sans"
            />
          </div>
        </div>

        {/* Live Veevo Tech Gateway Tester */}
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
            <div className={`mt-3 p-3 rounded-xl text-xs border ${
              testStatus.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : testStatus.lowBalance
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}>
              <div className="flex items-start gap-2.5">
                {testStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                ) : testStatus.lowBalance ? (
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">{testStatus.success ? 'Success!' : testStatus.lowBalance ? 'Low Balance Notice' : 'Gateway Error'}</p>
                  <p className="mt-0.5 leading-relaxed">{testStatus.message}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onSaveSettings(formData);
              setSavedSuccess(true);
              setTimeout(() => setSavedSuccess(false), 3000);
            }}
            className="glow-button px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>Save All SMS Hub Configuration</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total SMS Dispatched</span>
            <Send className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">{totalSent}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Successfully Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{deliveredCount}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Failed / Low Balance</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">{failedCount}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by phone, message, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={loadLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
          >
            <option value="all">All Statuses</option>
            <option value="Delivered">Delivered</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
            Loading delivery logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-xs">
            <MessageSquare className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            No SMS logs found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Recipient</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Message Content</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredLogs.map((log) => {
                  const isDelivered = log.status === 'Delivered';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3 h-3 text-emerald-500" />
                          {log.recipient}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          {log.type || 'Automated SMS'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700 dark:text-slate-300 max-w-md font-sans">
                        <p className="whitespace-pre-wrap leading-relaxed text-xs">{log.message}</p>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isDelivered
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}>
                          {isDelivered ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
