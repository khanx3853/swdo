import React, { useState } from 'react';
import {
  X,
  FileCheck,
  Copy,
  Printer,
  FileDown,
  Check,
  Building,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Beneficiary, PortalSettings } from '../../types';
import { formatPKR, generateMonkeyFilePDF } from '../../utils/formatters';
import { Logo } from '../Logo';

interface MonkeyFileModalProps {
  beneficiaries: Beneficiary[];
  selectedBeneficiary?: Beneficiary | null;
  settings: PortalSettings;
  onClose: () => void;
}

export const MonkeyFileModal: React.FC<MonkeyFileModalProps> = ({
  beneficiaries,
  selectedBeneficiary,
  settings,
  onClose,
}) => {
  const [activeId, setActiveId] = useState<string>(
    selectedBeneficiary?.id || (beneficiaries[0]?.id || '')
  );
  const [copied, setCopied] = useState(false);

  const ben = beneficiaries.find((b) => b.id === activeId) || selectedBeneficiary || beneficiaries[0];

  if (!ben) {
    return null;
  }

  const fileNo = `MK-${ben['Transaction ID'] || '2026-904'}`;

  const handleCopySummary = () => {
    const text = `==============================
${(settings['Foundation Name'] || 'SHANGLA WELFARE & DEVELOPMENT ORG').toUpperCase()}
WELFARE AID ALLOTMENT DOSSIER
==============================
File Ref: ${fileNo}
Date: ${ben.Date}
Beneficiary: ${ben['Beneficiary Name']}
s/o / w/o: ${ben['Father Name']}
CNIC: ${ben['NIC No']}
Contact: ${ben['Contact No']}
Address: ${ben['Permanent Address']}
Category: ${ben.Purpose}
Allotted Aid: ${formatPKR(ben.Amount)}
Sanctioned By: ${settings.Chairperson}
Status: Verified & Allotted
==============================`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleExportPDF = () => {
    generateMonkeyFilePDF(ben, settings);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="glass-card max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative border-purple-500/50 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b dark:border-purple-900/40 border-purple-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold dark:text-purple-300 text-purple-700">
                Allotted Monkey File Generator
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Official Case Docket & Welfare Allotment Slip
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full dark:bg-slate-800 bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Beneficiary Switcher */}
        <div className="mb-3 shrink-0">
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Select Case / Beneficiary:
          </label>
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            className="w-full p-2 text-xs rounded-xl dark:bg-slate-900 bg-white border dark:border-purple-900/50 border-purple-200 focus:outline-none focus:border-purple-500"
          >
            {beneficiaries.map((b) => (
              <option key={b.id} value={b.id}>
                {b['Beneficiary Name']} - {b.Purpose} ({formatPKR(b.Amount)})
              </option>
            ))}
          </select>
        </div>

        {/* File Preview */}
        <div
          id="monkey-file-content"
          className="dark:bg-slate-950/90 bg-white rounded-xl border dark:border-purple-900/50 border-purple-200 p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs"
        >
          {/* Letterhead */}
          <div className="text-center pb-3 border-b dark:border-purple-900/40 border-purple-100">
            <div className="flex justify-center mb-1.5">
              <Logo size="sm" />
            </div>
            <div className="flex items-center justify-center gap-1.5 mb-1 text-emerald-500">
              <span className="font-extrabold text-sm sm:text-base tracking-wide uppercase">
                {settings['Foundation Name']}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {settings.SubTitle} • {settings.Address}
            </p>
            <div className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20 text-[10px] font-bold">
              OFFICIAL WELFARE AID DOSSIER (MONKEY FILE)
            </div>
          </div>

          {/* Dossier Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 bg-purple-50/50 dark:bg-slate-900/60 p-3 rounded-lg border dark:border-purple-900/30 border-purple-100">
            <div>
              <span className="text-[10px] text-slate-400 block">File Docket No:</span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                {fileNo}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Sanction Date:</span>
              <span className="font-mono font-semibold">{ben.Date}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Verification Status:</span>
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Verified & Sanctioned
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Relief Category:</span>
              <span className="font-semibold text-blue-500">{ben.Purpose}</span>
            </div>
          </div>

          {/* Beneficiary Details Table */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
              <span className="text-slate-400">Beneficiary Name:</span>
              <span className="font-bold dark:text-slate-200 text-slate-800">{ben['Beneficiary Name']}</span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
              <span className="text-slate-400">Father / Husband Name:</span>
              <span>{ben['Father Name'] || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
              <span className="text-slate-400">Computerized NIC:</span>
              <span className="font-mono font-semibold">{ben['NIC No'] || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
              <span className="text-slate-400">Contact Number:</span>
              <span className="font-mono">{ben['Contact No'] || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
              <span className="text-slate-400">Permanent Station / Village:</span>
              <span className="text-right truncate ml-4">{ben['Permanent Address'] || 'Besham Shangla'}</span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
              <span className="text-slate-400">Verification Inspection Note:</span>
              <span className="text-right italic text-slate-500">{ben.Remarks || 'Case recommended by field team'}</span>
            </div>
          </div>

          {/* Amount Box */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                Total Allotted Relief Aid:
              </p>
              <p className="text-sm sm:text-base font-extrabold text-emerald-500 font-mono">
                {formatPKR(ben.Amount)}
              </p>
            </div>
            <div className="text-right text-[10px] text-slate-400">
              <span>Disbursed In Cash / Check</span>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[11px]">
            <div>
              <div className="h-0.5 w-24 mx-auto bg-slate-400 dark:bg-slate-600 mb-1" />
              <p className="font-bold dark:text-slate-300 text-slate-700">Junaid Khan</p>
              <p className="text-[9px] text-slate-500">Welfare Officer / Case Examiner</p>
            </div>
            <div>
              <div className="h-0.5 w-24 mx-auto bg-slate-400 dark:bg-slate-600 mb-1" />
              <p className="font-bold dark:text-slate-300 text-slate-700">{settings.Chairperson}</p>
              <p className="text-[9px] text-slate-500">President / Approver</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t dark:border-purple-900/40 border-purple-200 shrink-0">
          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold dark:bg-slate-800 bg-slate-200 text-slate-700 dark:text-slate-300 hover:opacity-80 flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Summary'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold dark:bg-slate-800 bg-purple-100 text-purple-600 dark:text-purple-300 hover:bg-purple-200 flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="glow-button px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5 text-white" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
