import React, { useState } from 'react';
import {
  X,
  MoreVertical,
  Edit2,
  Trash2,
  FileText,
  Info,
  Calendar,
  User,
  IdCard,
  Phone,
  MapPin,
  Briefcase,
  Coins,
  Hash,
  Award,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Check,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { Donation, Beneficiary, Member, PortalSettings, UserAccount } from '../../types';
import { formatPKR } from '../../utils/formatters';

interface DetailModalProps {
  item: Donation | Beneficiary | Member | null;
  type: 'donation' | 'beneficiary' | 'member' | 'swdo-member' | null;
  settings: PortalSettings;
  isAdmin?: boolean;
  currentUser?: UserAccount | null;
  onClose: () => void;
  onEdit: (item: any, type: string) => void;
  onDelete: (item: any, type: string) => void;
  onExportPDF: (item: any, type: string) => void;
  onApproveDonation?: (id: string, approverName?: string) => void;
  onRejectDonation?: (id: string) => void;
  onUpdateDonationApprover?: (id: string, newApprover: string) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  item,
  type,
  settings,
  isAdmin = false,
  currentUser,
  onClose,
  onEdit,
  onDelete,
  onExportPDF,
  onApproveDonation,
  onRejectDonation,
  onUpdateDonationApprover,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showProofLightbox, setShowProofLightbox] = useState(false);
  const [isEditingApprover, setIsEditingApprover] = useState(false);
  const [approverInput, setApproverInput] = useState('');

  if (!item || !type) return null;

  const getTitle = () => {
    if (type === 'donation') {
      return `Donation - ${(item as Donation)['Donor Name']}`;
    }
    if (type === 'beneficiary') {
      return `Beneficiary - ${(item as Beneficiary)['Beneficiary Name']}`;
    }
    if (type === 'swdo-member') {
      return `SWDO Member - ${(item as Member).Name}`;
    }
    return `Member - ${(item as Member).Name}`;
  };

  const donation = type === 'donation' ? (item as Donation) : null;
  const isPendingDonation = donation?.Status === 'Pending';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="glass-card max-w-md w-full p-4 sm:p-5 shadow-2xl relative border-purple-500/50 max-h-[92vh] overflow-y-auto my-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-3 pb-2.5 border-b dark:border-purple-900/40 border-purple-200">
          <div className="min-w-0 pr-2">
            <h3 className="text-sm sm:text-base font-bold dark:text-emerald-300 text-emerald-700 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="truncate">{getTitle()}</span>
            </h3>
            {donation && (
              <div className="mt-1 flex items-center gap-1.5">
                {isPendingDonation ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                    <Clock className="w-3 h-3 animate-pulse" /> Pending Admin Approval
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Approved & Added to Data
                  </span>
                )}
              </div>
            )}
            {((type === 'member' || type === 'swdo-member') && (item as Member).NICImage) && (
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3" /> Identity Verified (CNIC Attached)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Action Menu */}
            <div className="relative">
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowMenu(!showMenu)}
                    className="w-8 h-8 rounded-full dark:bg-slate-800 bg-purple-100 hover:bg-purple-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 top-9 w-40 dark:bg-slate-900 bg-white border dark:border-purple-900/50 border-purple-200 rounded-xl shadow-2xl overflow-hidden z-20 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onEdit(item, type);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-emerald-500/10 flex items-center gap-2 dark:text-slate-200 text-slate-700 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Edit Record</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onExportPDF(item, type);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-500/10 flex items-center gap-2 dark:text-slate-200 text-slate-700 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        <span>Export PDF</span>
                      </button>

                      <div className="border-t dark:border-purple-900/30 border-purple-100" />

                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onDelete(item, type);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-red-500/10 flex items-center gap-2 text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        <span>Delete Record</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onExportPDF(item, type)}
                  title="Export PDF Receipt"
                  className="w-8 h-8 rounded-full dark:bg-slate-800 bg-purple-100 hover:bg-purple-200 dark:hover:bg-slate-700 flex items-center justify-center text-blue-500 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full dark:bg-slate-800 bg-slate-100 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-red-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body Items */}
        <div className="space-y-2.5 text-xs">
          {type === 'donation' && donation && (
            <>
              {/* Payment Proof Screenshot Block */}
              {donation.ProofImage && (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                      Proof of Payment Screenshot
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowProofLightbox(true)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> View Large
                    </button>
                  </div>
                  <div
                    onClick={() => setShowProofLightbox(true)}
                    className="relative rounded-lg overflow-hidden border border-slate-700 bg-black cursor-pointer group max-h-40 flex items-center justify-center"
                  >
                    <img
                      src={donation.ProofImage}
                      alt="Payment Proof"
                      className="w-full object-contain max-h-40 group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                      <Eye className="w-4 h-4" /> Click to enlarge
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Approval Call to Action (Admin Only) */}
              {isPendingDonation && isAdmin && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/50 to-emerald-950/40 border border-amber-500/40 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-amber-300">Pending Review</p>
                    <p className="text-[10px] text-slate-400">Review submission status</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onRejectDonation && (
                      <button
                        type="button"
                        onClick={() => {
                          onRejectDonation(donation.id);
                          onClose();
                        }}
                        className="py-1.5 px-3 rounded-lg bg-red-600/80 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}
                    {onApproveDonation && (
                      <button
                        type="button"
                        onClick={() => {
                          const currentName = currentUser?.username
                            ? (currentUser.username.charAt(0).toUpperCase() + currentUser.username.slice(1))
                            : 'Admin';
                          onApproveDonation(donation.id, currentName);
                          onClose();
                        }}
                        className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve{currentUser?.username ? ` as ${currentUser.username.charAt(0).toUpperCase() + currentUser.username.slice(1)}` : ' Now'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Date:
                </span>
                <span className="font-mono font-semibold">{donation.Date}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-500" /> Donor Name:
                </span>
                <span className="font-bold">{donation['Donor Name']}</span>
              </div>
              {isAdmin && (
                <>
                  <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <IdCard className="w-3.5 h-3.5 text-emerald-500" /> NIC No:
                    </span>
                    <span className="font-mono">{donation['NIC No'] || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-purple-500" /> Contact:
                    </span>
                    <span className="font-mono">{donation['Contact No'] || '-'}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" /> Address:
                </span>
                <span className="text-right truncate ml-2">{donation['Permanent Address'] || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-400" /> Profession:
                </span>
                <span>{donation.Profession || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 bg-emerald-500/10 px-2 rounded-lg">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" /> Amount:
                </span>
                <span className="font-bold text-emerald-500 font-mono text-sm">
                  {formatPKR(donation.Amount)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-purple-400" /> TX ID:
                </span>
                <span className="font-mono">{donation['Transaction ID'] || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Remarks:</span>
                <span className="text-right">{donation.Remarks || '-'}</span>
              </div>
              {donation.ApprovedBy ? (
                <div className="flex justify-between items-center py-1.5 border-b dark:border-purple-900/20 border-purple-50">
                  <span className="text-slate-400 text-xs">Approved By:</span>
                  {isEditingApprover ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={approverInput}
                        onChange={(e) => setApproverInput(e.target.value)}
                        placeholder="Admin name"
                        className="px-2 py-0.5 text-xs rounded bg-slate-800 border border-purple-500/40 text-emerald-400 font-semibold focus:outline-none focus:border-emerald-500 w-28"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (approverInput.trim() && onUpdateDonationApprover) {
                              onUpdateDonationApprover(donation.id, approverInput.trim());
                              setIsEditingApprover(false);
                            }
                          } else if (e.key === 'Escape') {
                            setIsEditingApprover(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (approverInput.trim() && onUpdateDonationApprover) {
                            onUpdateDonationApprover(donation.id, approverInput.trim());
                            setIsEditingApprover(false);
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingApprover(false)}
                        className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-emerald-400 text-xs sm:text-sm">
                        {donation.ApprovedBy.charAt(0).toUpperCase() + donation.ApprovedBy.slice(1)}
                      </span>
                      {isAdmin && onUpdateDonationApprover && (
                        <div className="flex items-center gap-1">
                          {currentUser?.username && donation.ApprovedBy.toLowerCase() !== currentUser.username.toLowerCase() && (
                            <button
                              type="button"
                              onClick={() => {
                                const myName = currentUser.username.charAt(0).toUpperCase() + currentUser.username.slice(1);
                                onUpdateDonationApprover(donation.id, myName);
                              }}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors font-medium cursor-pointer"
                              title={`Click to set approver as ${currentUser.username}`}
                            >
                              Set as {currentUser.username.charAt(0).toUpperCase() + currentUser.username.slice(1)}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setApproverInput(donation.ApprovedBy || '');
                              setIsEditingApprover(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 transition-colors cursor-pointer"
                            title="Edit approver name"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                donation.Status === 'Approved' && isAdmin && onUpdateDonationApprover && (
                  <div className="flex justify-between items-center py-1.5 border-b dark:border-purple-900/20 border-purple-50">
                    <span className="text-slate-400 text-xs">Approved By:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const myName = currentUser?.username ? (currentUser.username.charAt(0).toUpperCase() + currentUser.username.slice(1)) : 'Admin';
                        onUpdateDonationApprover(donation.id, myName);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-pointer"
                    >
                      Assign Approver ({currentUser?.username ? (currentUser.username.charAt(0).toUpperCase() + currentUser.username.slice(1)) : 'Admin'})
                    </button>
                  </div>
                )
              )}
              <div className="flex justify-between pt-2 text-[11px] text-slate-500">
                <span>Submitted / Entered By:</span>
                <span className="font-semibold text-emerald-500">{donation.EnteredBy || 'Portal User'}</span>
              </div>
            </>
          )}

          {type === 'beneficiary' && (
            <>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Date:</span>
                <span className="font-mono font-semibold">{(item as Beneficiary).Date}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Beneficiary Name:</span>
                <span className="font-bold">{(item as Beneficiary)['Beneficiary Name']}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Father Name:</span>
                <span>{(item as Beneficiary)['Father Name'] || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">NIC No:</span>
                <span className="font-mono">{(item as Beneficiary)['NIC No'] || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Contact:</span>
                <span className="font-mono">{(item as Beneficiary)['Contact No'] || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Address:</span>
                <span className="truncate ml-2">{(item as Beneficiary)['Permanent Address'] || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Relief Category:</span>
                <span className="font-semibold text-blue-500">{(item as Beneficiary).Purpose}</span>
              </div>
              <div className="flex justify-between py-1.5 bg-blue-500/10 px-2 rounded-lg">
                <span className="text-blue-500 font-semibold">Sanctioned Aid:</span>
                <span className="font-bold text-blue-500 font-mono text-sm">
                  {formatPKR((item as Beneficiary).Amount)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Dossier Ref:</span>
                <span className="font-mono">{(item as Beneficiary)['Transaction ID'] || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Remarks:</span>
                <span className="text-right">{(item as Beneficiary).Remarks || '-'}</span>
              </div>
              <div className="flex justify-between pt-2 text-[11px] text-slate-500">
                <span>Verified By:</span>
                <span className="font-semibold text-blue-400">{(item as Beneficiary).VerifiedBy || 'Verification Officer'}</span>
              </div>
            </>
          )}

          {type === 'member' && (
            <>
              {/* NIC Image Display */}
              {(item as Member).NICImage && (
                <div className="mb-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                      National Identity Card (CNIC)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowProofLightbox(true)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> View Large
                    </button>
                  </div>
                  <div
                    onClick={() => setShowProofLightbox(true)}
                    className="relative rounded-lg overflow-hidden border border-slate-700 bg-black cursor-pointer group max-h-40 flex items-center justify-center"
                  >
                    <img
                      src={(item as Member).NICImage}
                      alt="CNIC Document"
                      className="w-full object-contain max-h-40 group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                      <Eye className="w-4 h-4" /> Click to enlarge
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Member Name:</span>
                <span className="font-bold">{(item as Member).Name}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Father Name:</span>
                <span>{(item as Member)['Father Name'] || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" /> Designation:
                </span>
                <span className="font-semibold text-purple-500">{(item as Member).Designation}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">CNIC:</span>
                <span className="font-mono">{(item as Member)['N.I.C No'] || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Contact:</span>
                <span className="font-mono">{(item as Member)['Contact No'] || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Station / Address:</span>
                <span className="truncate ml-2">{(item as Member).Address || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Joining Date:</span>
                <span className="font-mono">{(item as Member)['Joining Date']}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Term Expiry:</span>
                <span className="font-mono">{(item as Member)['Expiry Date']}</span>
              </div>
              <div className="flex justify-between pt-2 text-[11px] text-slate-500">
                <span>Responsibilities:</span>
                <span>{(item as Member).Remarks || '-'}</span>
              </div>
            </>
          )}

          {type === 'swdo-member' && (
            <>
              {/* NIC Image Display */}
              {(item as Member).NICImage && (
                <div className="mb-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                      National Identity Card (CNIC)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowProofLightbox(true)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> View Large
                    </button>
                  </div>
                  <div
                    onClick={() => setShowProofLightbox(true)}
                    className="relative rounded-lg overflow-hidden border border-slate-700 bg-black cursor-pointer group max-h-40 flex items-center justify-center"
                  >
                    <img
                      src={(item as Member).NICImage}
                      alt="CNIC Document"
                      className="w-full object-contain max-h-40 group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                      <Eye className="w-4 h-4" /> Click to enlarge
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">SWDO Member:</span>
                <span className="font-bold">{(item as Member).Name}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Father Name:</span>
                <span>{(item as Member)['Father Name'] || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-blue-500" /> Designation:
                </span>
                <span className="font-semibold text-purple-500">{(item as Member).Designation}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">CNIC:</span>
                <span className="font-mono">{(item as Member)['N.I.C No'] || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Contact:</span>
                <span className="font-mono">{(item as Member)['Contact No'] || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Station / Address:</span>
                <span className="truncate ml-2">{(item as Member).Address || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Joining Date:</span>
                <span className="font-mono">{(item as Member)['Joining Date']}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Term Expiry:</span>
                <span className="font-mono">{(item as Member)['Expiry Date']}</span>
              </div>
              <div className="flex justify-between pt-2 text-[11px] text-slate-500">
                <span>Responsibilities:</span>
                <span>{(item as Member).Remarks || '-'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lightbox for Proof Image / NIC */}
      {showProofLightbox && (donation?.ProofImage || (item as Member).NICImage) && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn">
          <div className="relative max-w-3xl w-full flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowProofLightbox(false)}
              className="absolute -top-10 right-0 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-red-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" /> Close
            </button>
            <img
              src={donation?.ProofImage || (item as Member).NICImage}
              alt="Document Preview"
              className="max-h-[82vh] w-auto max-w-full rounded-xl border border-slate-700 shadow-2xl object-contain"
            />
            <p className="text-xs text-slate-300 mt-2 font-mono">
              {donation 
                ? `Proof of Payment from ${donation['Donor Name']}` 
                : `National Identity Card of ${(item as Member).Name}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
