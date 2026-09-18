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
  MessageSquare,
  Loader2,
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
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsFeedback, setSmsFeedback] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });

  if (!item || !type) return null;

  const handleSendManualSms = async () => {
    if (type !== 'donation') return;
    const curDonation = item as Donation;
    if (!curDonation['Contact No'] || curDonation['Contact No'].includes('@')) return;

    setIsSendingSms(true);
    setSmsFeedback({ status: 'idle', message: '' });

    try {
      const res = await fetch('/api/notify-donor-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donation: {
            ...curDonation,
            SendSms: true,
            VeevoSmsHash: settings?.VeevoSmsHash,
            VeevoSenderNum: settings?.VeevoSenderNum,
            SmsApprovalTemplate: settings?.SmsApprovalTemplate,
          },
          status: curDonation.Status === 'Pending' ? 'Pending' : 'Approved',
        }),
      });

      const data = await res.json();
      if (data?.sms?.sent) {
        setSmsFeedback({
          status: 'success',
          message: `SMS receipt successfully delivered to ${curDonation['Contact No']}`,
        });
      } else if (data?.sms?.lowBalance) {
        setSmsFeedback({
          status: 'error',
          message: 'SMS gateway balance is low or zero. Please top up credits.',
        });
      } else {
        setSmsFeedback({
          status: 'error',
          message: data?.sms?.error || 'SMS could not be delivered by gateway.',
        });
      }
    } catch (err: any) {
      setSmsFeedback({
        status: 'error',
        message: err.message || 'Network error attempting SMS dispatch.',
      });
    } finally {
      setIsSendingSms(false);
    }
  };


  const renderContact = (contactNo: string | undefined) => {
    if (!contactNo || contactNo === '-') return <span className="font-mono text-slate-400">-</span>;
    
    const cleanNumber = contactNo.replace(/[^0-9+]/g, '');
    let waNumber = contactNo.replace(/[^0-9]/g, '');
    if (waNumber.startsWith('0')) {
      // If it starts with 0 and no country code was matched by digits, assume +92
      waNumber = '92' + waNumber.substring(1);
    }
    
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono">{contactNo}</span>
        <div className="flex items-center gap-1.5 ml-1">
          <a 
            href={`tel:${cleanNumber}`} 
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
            title="Call"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>
          <a 
            href={`https://wa.me/${waNumber}`} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
            title="WhatsApp"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
          </a>
        </div>
      </div>
    );
  };

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
                    {!!donation.ProofImage && (
                      <img
                        src={donation.ProofImage || null}
                        alt="Payment Proof"
                        className="w-full object-contain max-h-40 group-hover:opacity-90 transition-opacity"
                      />
                    )}
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
                          const currentName = currentUser?.username && !['admin', 'guest donator'].includes(currentUser.username.toLowerCase())
                            ? (currentUser.username.charAt(0).toUpperCase() + currentUser.username.slice(1))
                            : 'Ali';
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
                    {renderContact(donation['Contact No'])}
                  </div>

                  {donation['Contact No'] && !donation['Contact No'].includes('@') && donation['Contact No'] !== '-' && (
                    <div className="my-1.5 p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-purple-500" /> Automated SMS
                        </span>
                        <button
                          type="button"
                          disabled={isSendingSms}
                          onClick={handleSendManualSms}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isSendingSms ? <Loader2 className="w-3 h-3 animate-spin" /> : <Phone className="w-3 h-3" />}
                          {isSendingSms ? 'Sending SMS...' : 'Send / Resend SMS Receipt'}
                        </button>
                      </div>
                      {smsFeedback.message && (
                        <div className={`text-[11px] font-semibold px-2 py-1 rounded-lg border ${
                          smsFeedback.status === 'success' 
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' 
                            : 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'
                        }`}>
                          {smsFeedback.message}
                        </div>
                      )}
                    </div>
                  )}
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
              {donation.ApprovedBy && (
                <div className="flex justify-between items-center py-1.5 border-b dark:border-purple-900/20 border-purple-50">
                  <span className="text-slate-400 text-xs">Approved By:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-emerald-400 text-xs sm:text-sm">
                      {donation.ApprovedBy.charAt(0).toUpperCase() + donation.ApprovedBy.slice(1)}
                    </span>
                  </div>
                </div>
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
                {renderContact((item as Beneficiary)['Contact No'])}
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
              {(item as Beneficiary).ProofLink && (
                <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                  <span className="text-slate-400">Video Proof:</span>
                  <a href={(item as Beneficiary).ProofLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h6v6"></path>
                      <path d="M10 14L21 3"></path>
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    </svg>
                    Watch Video
                  </a>
                </div>
              )}
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
                    {!!(item as Member).NICImage && (
                      <img
                        src={(item as Member).NICImage || null}
                        alt="CNIC Document"
                        className="w-full object-contain max-h-40 group-hover:opacity-90 transition-opacity"
                      />
                    )}
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
                {renderContact((item as Member)['Contact No'])}
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
                    {!!(item as Member).NICImage && (
                      <img
                        src={(item as Member).NICImage || null}
                        alt="CNIC Document"
                        className="w-full object-contain max-h-40 group-hover:opacity-90 transition-opacity"
                      />
                    )}
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
                {renderContact((item as Member)['Contact No'])}
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
            {(donation?.ProofImage || (item as Member).NICImage) && (
              <img
                src={donation?.ProofImage || (item as Member).NICImage || null}
                alt="Document Preview"
                className="max-h-[82vh] w-auto max-w-full rounded-xl border border-slate-700 shadow-2xl object-contain"
              />
            )}
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
