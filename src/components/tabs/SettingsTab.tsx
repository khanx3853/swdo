import React, { useState, useRef } from 'react';
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
  Mail,
  Zap,
  Send,
  Loader2,
  AlertCircle,
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

  // Email diagnostic states
  const [testEmailAddress, setTestEmailAddress] = useState('khanx3853@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      setTestResult({ success: false, message: 'Please enter a valid email address.' });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch(`/api/test-email?to=${encodeURIComponent(testEmailAddress.trim())}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({ success: true, message: data.message || 'Test email delivered successfully!' });
      } else {
        setTestResult({ success: false, message: data.error || data.message || 'Failed to send test email.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Network error sending test email.' });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold dark:text-emerald-300 text-emerald-700 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-emerald-500" />
            <span>Portal & Foundation Configuration</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure official NGO titles, cabinet signatories, and payment accounts
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Changes Saved!</span>
          </div>
        )}
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

          {/* Email Service & High-Speed Delivery Diagnostics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3 pb-1 border-b dark:border-purple-900/40 border-purple-200 flex items-center justify-between">
              <span>4. High-Speed Email Service & Delivery Diagnostics</span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold lowercase">
                <Zap className="w-3.5 h-3.5 fill-emerald-500" /> Connection Pooling Active
              </span>
            </h3>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">SMTP Email Gateway Service</h4>
                    <p className="text-[11px] text-slate-400">
                      Host: <code className="text-emerald-400 font-mono">smtp.gmail.com:465</code> | Admin Alert Email: <code className="text-emerald-400 font-mono">swdo.kpk@gmail.com</code>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="Enter recipient email to test live delivery..."
                    className="w-full py-2.5 pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                </div>

                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all"
                >
                  {isSendingTest ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Sending Test Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>⚡ Dispatch Live Test Email</span>
                    </>
                  )}
                </button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
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
