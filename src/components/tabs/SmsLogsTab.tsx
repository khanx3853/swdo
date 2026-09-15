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
  ShieldAlert,
  Eye,
  X,
  FileText,
  Tag,
  Copy,
  Check,
  Trash2
} from 'lucide-react';
import { SmsLog, PortalSettings } from '../../types';
import { fetchCollection, isTableNotFoundError, subscribeCollection, deleteFromFirestore } from '../../lib/firestoreSync';

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
  const [selectedLog, setSelectedLog] = useState<SmsLog | null>(null);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchServerLogs = async () => {
    setSyncing(true);
    try {
      let serverLogs: SmsLog[] = [];
      const res = await fetch('/api/sms_logs');
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          serverLogs = json.data;
        }
      }
      if (serverLogs.length === 0) {
        const diagRes = await fetch('/api/sms-diagnostic');
        if (diagRes.ok) {
          const diagJson = await diagRes.json();
          if (diagJson.logs && Array.isArray(diagJson.logs)) {
            serverLogs = diagJson.logs;
          }
        }
      }

      const existingIds = new Set<string>();
      const combined: SmsLog[] = [...serverLogs];
      combined.forEach(l => existingIds.add(l.id));

      // Merge any local offline logs
      try {
        const local = localStorage.getItem('swdo_sms_logs');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            parsed.forEach((p: any) => {
              if (p && p.id && !existingIds.has(p.id)) {
                combined.push(p);
                existingIds.add(p.id);
              }
            });
          }
        }
      } catch (e) {}

      const sorted = combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(sorted);
      try {
        localStorage.setItem('swdo_sms_logs', JSON.stringify(sorted));
      } catch (e) {}
    } catch (e) {
      console.warn('Failed to fetch server logs:', e);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this delivery log?')) return;
    try {
      setLogs(prev => prev.filter(l => l.id !== id));
      setSelectedLog(null);
      await deleteFromFirestore('sms_logs', id);
    } catch (e) {
      console.warn('Failed to delete SMS log:', e);
    }
  };

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  useEffect(() => {
    setLoading(true);

    // Initial server fetch
    fetchServerLogs();

    // Safety timeout: dismiss loading spinner within 1.5 seconds under all network conditions
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    const unsubscribe = subscribeCollection<SmsLog>('sms_logs', (data) => {
      clearTimeout(safetyTimer);
      let combined = [...data];
      
      // Also check any local logs for backward compatibility/redundancy
      try {
        const local = localStorage.getItem('swdo_sms_logs');
        if (local && local !== 'undefined' && local !== 'null') {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            const existingIds = new Set(combined.map(l => l.id));
            parsed.forEach(p => {
              if (p && p.id && !existingIds.has(p.id)) {
                combined.push(p);
              }
            });
          }
        }
      } catch (e) {
        console.warn('Failed to parse local SMS logs:', e);
      }

      const sorted = combined.sort((a, b) => {
        try {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        } catch (e) {
          return 0;
        }
      });
      
      setLogs(sorted);
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const handleSendTestSms = async () => {
    if (!testPhone.trim()) {
      setTestStatus({
        loading: false,
        success: false,
        message: 'Please enter a valid mobile number',
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
          message: `SWDO Test SMS: Assalam-o-Alaikum! Gateway is working. Time: ${new Date().toLocaleTimeString()}`,
          hash: formData.VeevoSmsHash || 'd9eb3e26f4532bcbbca611804241635a',
          senderNum: formData.VeevoSenderNum || 'Default',
          type: 'Manual Test'
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        // Optimistic local log in case DB cache is stale
        const newLog: SmsLog = {
          id: 'sms_local_' + Date.now(),
          recipient: testPhone.trim(),
          message: `SWDO Test SMS: Gateway is working. Time: ${new Date().toLocaleTimeString()}`,
          type: 'Manual Test',
          status: 'Delivered',
          timestamp: new Date().toISOString(),
          response: JSON.stringify(data)
        };
        
        // Skip local logging to prevent QuotaExceededError
        /*
        try {
          const local = localStorage.getItem('swdo_sms_logs');
          const logs = local ? JSON.parse(local) : [];
          localStorage.setItem('swdo_sms_logs', JSON.stringify([newLog, ...logs].slice(0, 50)));
        } catch (e) {}
        */

        setTestStatus({
          loading: false,
          success: true,
          message: 'SMS dispatched successfully!',
        });
      } else {
        const isLowBalance = !!data.lowBalance;
        setTestStatus({
          loading: false,
          success: false,
          lowBalance: isLowBalance,
          message: data.error || 'SMS delivery failed',
        });
      }
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: err.message || 'Failed to connect to backend',
      });
    }
  };

  const filteredLogs = logs.filter((log) => {
    try {
      const matchesSearch =
        (log.recipient || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.message || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.type || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || (log.status || '').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    } catch (e) {
      return false;
    }
  });

  const totalSent = logs.length;
  const deliveredCount = logs.filter(l => (l.status || '').toLowerCase() === 'delivered').length;
  const failedCount = logs.filter(l => (l.status || '').toLowerCase() === 'failed').length;

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
          <button
            type="button"
            onClick={fetchServerLogs}
            disabled={syncing}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Fetch most recent logs directly from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Logs'}</span>
          </button>
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
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, AutoSmsSubmission: !Boolean(prev.AutoSmsSubmission) }));
              }}
              className={`w-full p-3 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 text-left ${
                Boolean(formData.AutoSmsSubmission)
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800/40 border-slate-700/60 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Donation Submission SMS
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    Boolean(formData.AutoSmsSubmission) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-700 text-slate-400 border border-slate-600'
                  }`}>
                    {Boolean(formData.AutoSmsSubmission) ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
                  Instantly notify donor upon proof upload.
                </span>
              </div>
              <div className={`relative inline-flex h-5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                Boolean(formData.AutoSmsSubmission) ? 'bg-emerald-500' : 'bg-slate-600'
              }`}>
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                  Boolean(formData.AutoSmsSubmission) ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </button>

            {/* 2. Approval */}
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, AutoSmsApproval: !prev.AutoSmsApproval }));
              }}
              className={`w-full p-3 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 text-left ${
                formData.AutoSmsApproval
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800/40 border-slate-700/60 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Admin Approval SMS
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    formData.AutoSmsApproval ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-700 text-slate-400 border border-slate-600'
                  }`}>
                    {formData.AutoSmsApproval ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
                  Notify donor when payment is verified.
                </span>
              </div>
              <div className={`relative inline-flex h-5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                formData.AutoSmsApproval ? 'bg-emerald-500' : 'bg-slate-600'
              }`}>
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                  formData.AutoSmsApproval ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </button>

            {/* 3. Beneficiary */}
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, AutoSmsBeneficiary: !prev.AutoSmsBeneficiary }));
              }}
              className={`w-full p-3 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 text-left ${
                formData.AutoSmsBeneficiary
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800/40 border-slate-700/60 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Beneficiary SMS
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    formData.AutoSmsBeneficiary ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-700 text-slate-400 border border-slate-600'
                  }`}>
                    {formData.AutoSmsBeneficiary ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
                  Notify beneficiary on relief registration.
                </span>
              </div>
              <div className={`relative inline-flex h-5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                formData.AutoSmsBeneficiary ? 'bg-emerald-500' : 'bg-slate-600'
              }`}>
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                  formData.AutoSmsBeneficiary ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </button>
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
        <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Delivery Audit History</h3>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Click row for details</span>
        </div>
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
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    >
                      <td className="p-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
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
                      <td className="p-4 text-slate-600 dark:text-slate-400 max-w-[200px] hidden md:table-cell">
                        <p className="truncate leading-relaxed text-[11px]">{log.message}</p>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center justify-between gap-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isDelivered
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}>
                            {isDelivered ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {isDelivered ? 'Sent' : 'Failed'}
                          </span>
                          <Eye className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg shadow-2xl border-emerald-500/30 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">SMS Delivery Details</h3>
                  <p className="text-[10px] text-slate-500 font-mono">{selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-5">
              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Time Dispatched
                  </span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Recipient
                  </span>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {selectedLog.recipient}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Dispatch Type
                  </span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {selectedLog.type}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Final Status
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedLog.status === 'Delivered'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {selectedLog.status === 'Delivered' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                    {selectedLog.status}
                  </span>
                </div>
              </div>

              {/* Message Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Actual SMS Content
                  </span>
                  <button
                    onClick={() => handleCopy(selectedLog.message)}
                    className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans italic">
                    "{selectedLog.message}"
                  </p>
                </div>
              </div>

              {/* API Context */}
              {selectedLog.response && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gateway Response Payload</span>
                  <pre className="p-3 rounded-xl bg-slate-900 text-[10px] text-emerald-400 font-mono overflow-x-auto border border-slate-800 max-h-32">
                    {selectedLog.response}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t dark:border-slate-800 border-slate-200 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => handleDeleteLog(selectedLog.id)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Log
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setSelectedLog(null)}
                className="px-6 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
