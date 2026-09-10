import React, { useState, useMemo } from 'react';
import {
  IdCard,
  Plus,
  Search,
  User,
  Award,
  Phone,
  MapPin,
  Calendar,
  MessageSquare,
  Eye,
  X,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  CopyPlus,
  Camera,
  Upload,
  Image as ImageIcon,
  Pencil,
  Download,
  ChevronDown,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Member } from '../../types';
import { formatNIC, formatContact } from '../../utils/formatters';
import { compressImageFile } from '../../utils/imageUtils';

interface MembersTabProps {
  members: Member[];
  isAdmin?: boolean;
  onRequestLogin?: () => void;
  onSaveMember: (member: Member) => void;
  onSelectMember: (member: Member) => void;
  onDeleteMember?: (id: string) => void;
  onClearAllMembers?: () => void;
  title?: string;
  subtitle?: string;
  editingItem?: Member | null;
  onClearEdit?: () => void;
}

const DESIGNATIONS = [
  'President / Chairperson',
  'Vice President',
  'General Secretary',
  'Finance Secretary / Treasurer',
  'Joint Secretary',
  'Information Secretary',
  'Relief Coordinator',
  'Executive Member',
  'Honorary Patron',
  'Volunteer',
  'President',
  'V.President',
  'Finance Secretary',
  'Press Secretary',
  'Office Secretary',
  'Coordination Secretary',
  'Patron-in-Chief',
  'General Member',
];

export const MembersTab: React.FC<MembersTabProps> = ({
  members,
  isAdmin = false,
  onRequestLogin,
  onSaveMember,
  onSelectMember,
  onDeleteMember,
  onClearAllMembers,
  title = "Members & Cabinet Directory",
  subtitle = "Registered council members, designated signatories, and active volunteers",
  editingItem,
  onClearEdit,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [designation, setDesignation] = useState('Executive Member');
  const [nicNo, setNicNo] = useState('');
  const [address, setAddress] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(
    new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0]
  );
  const [remarks, setRemarks] = useState('');
  const [nicImage, setNicImage] = useState<string | null>(null);
  const [nicImageBack, setNicImageBack] = useState<string | null>(null);

  React.useEffect(() => {
    if (editingItem) {
      setName(editingItem.Name);
      setFatherName(editingItem['Father Name'] || '');
      setDesignation(editingItem.Designation || 'Executive Member');
      setNicNo(editingItem['N.I.C No'] || '');
      setAddress(editingItem.Address || '');
      setContactNo(editingItem['Contact No'] || '');
      setJoiningDate(editingItem['Joining Date']);
      setExpiryDate(editingItem['Expiry Date']);
      setRemarks(editingItem.Remarks || '');
      setNicImage(editingItem.NICImage || null);
      setNicImageBack(editingItem.NICImageBack || null);
      setEditingId(editingId || editingItem.id);
      setShowForm(true);
    }
  }, [editingItem]);

  const resetForm = () => {
    setName('');
    setFatherName('');
    setDesignation('Executive Member');
    setNicNo('');
    setAddress('');
    setContactNo('');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setExpiryDate(
      new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0]
    );
    setRemarks('');
    setNicImage(null);
    setNicImageBack(null);
    setEditingId(null);
    if (onClearEdit) onClearEdit();
  };

  const handleNICImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 800, 0.7);
        setNicImage(compressed);
      } catch (err) {
        console.error('Failed to upload NIC image:', err);
      }
    }
  };

  const handleNICImageBackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 800, 0.7);
        setNicImageBack(compressed);
      } catch (err) {
        console.error('Failed to upload NIC back image:', err);
      }
    }
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

  const handleDuplicateMember = (e: React.MouseEvent, item: Member) => {
    e.stopPropagation();
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setName(item.Name);
    setFatherName(item['Father Name'] || '');
    setNicNo(item['N.I.C No'] || '');
    setContactNo(item['Contact No'] || '');
    setAddress(item.Address || '');
    setRemarks('');
    setNicImage(item.NICImage || null);
    setEditingId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditMember = (e: React.MouseEvent, item: Member) => {
    e.stopPropagation();
    setName(item.Name);
    setFatherName(item['Father Name'] || '');
    setDesignation(item.Designation || 'Executive Member');
    setNicNo(item['N.I.C No'] || '');
    setContactNo(item['Contact No'] || '');
    setAddress(item.Address || '');
    setJoiningDate(item['Joining Date'] || new Date().toISOString().split('T')[0]);
    setExpiryDate(item['Expiry Date'] || new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0]);
    setRemarks(item.Remarks || '');
    setNicImage(item.NICImage || null);
    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newMember: Member = {
      id: editingId || `mem-${Date.now()}`,
      Name: name.trim(),
      'Father Name': fatherName.trim(),
      Designation: designation,
      'N.I.C No': nicNo.trim(),
      Address: address.trim(),
      'Contact No': contactNo.trim(),
      'Joining Date': joiningDate,
      'Expiry Date': expiryDate,
      Remarks: remarks.trim(),
      ...(nicImage ? { NICImage: nicImage } : {}),
      ...(nicImageBack ? { NICImageBack: nicImageBack } : {}),
    };

    onSaveMember(newMember);
    resetForm();
    setShowForm(false);
  };

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    let list = !q ? members : members.filter((m) => {
      const name = (m.Name || '').toLowerCase();
      const father = (m['Father Name'] || '').toLowerCase();
      const desig = (m.Designation || '').toLowerCase();
      const nic = (m['N.I.C No'] || '').toLowerCase();
      const addr = (m.Address || '').toLowerCase();
      const contact = (m['Contact No'] || '').toLowerCase();
      const rem = (m.Remarks || '').toLowerCase();

      return (
        name.includes(q) ||
        father.includes(q) ||
        desig.includes(q) ||
        nic.includes(q) ||
        addr.includes(q) ||
        contact.includes(q) ||
        rem.includes(q)
      );
    });

    if (q) {
      // Strict exact match override
      const exactNameMatches = list.filter(m => (m.Name || '').toLowerCase().trim() === q);
      if (exactNameMatches.length > 0) {
        list = exactNameMatches;
      }
    }

    return [...list].sort((a, b) => {
      const getRank = (designation: string = '') => {
        const d = designation.toLowerCase().trim();
        if (d === 'president / chairperson' || d === 'president' || d === 'patron-in-chief') return 1;
        if (d === 'vice president' || d === 'v.president' || d === 'v. president') return 2;
        if (d === 'general secretary') return 3;
        if (d.includes('finance') || d.includes('treasurer')) return 4;
        if (d.includes('secretary')) return 5;
        if (d.includes('coordinator')) return 6;
        if (d.includes('patron')) return 7;
        if (d.includes('executive')) return 8;
        return 99;
      };

      const rankA = getRank(a.Designation);
      const rankB = getRank(b.Designation);
      if (rankA !== rankB) return rankA - rankB;

      const dateA = new Date(a['Joining Date'] || 0).getTime();
      const dateB = new Date(b['Joining Date'] || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      
      return b.id.localeCompare(a.id);
    });
  }, [members, searchTerm]);

  const handleExportPDF = (exportType: 'with_cnic' | 'without_cnic' | 'only_cnic') => {
    setShowExportMenu(false);
    const doc = new jsPDF();

    if (exportType === 'only_cnic') {
      const tableColumn = ["Member Details", "CNIC Document"];
      const tableRows: any[] = [];
      filtered.forEach(m => {
        tableRows.push([
          `Name: ${m.Name}\nRole: ${m.Designation || '-'}\nCNIC: ${m['N.I.C No'] || '-'}`,
          '' // Image placeholder
        ]);
      });
      
      doc.text("Members CNIC Directory", 14, 15);
      doc.setFontSize(10);
      doc.text(`Total Members: ${filtered.length}`, 14, 22);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        rowPageBreak: 'avoid',
        headStyles: { fillColor: [16, 185, 129] },
        bodyStyles: { minCellHeight: 125 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 130 }
        },
        didDrawCell: (data) => {
          if (data.column.index === 1 && data.cell.section === 'body') {
            const member = filtered[data.row.index];
            if (member && member.NICImage) {
              try {
                const format = member.NICImage.includes('image/png') ? 'PNG' : 'JPEG';
                // Very large size CNIC rendering for 'only CNIC' option
                doc.addImage(member.NICImage, format, data.cell.x + 2, data.cell.y + 2, 126, 60);
              } catch (e) {
                console.error('Failed to draw image to PDF', e);
              }
            }
            if (member && member.NICImageBack) {
              try {
                const format = member.NICImageBack.includes('image/png') ? 'PNG' : 'JPEG';
                doc.addImage(member.NICImageBack, format, data.cell.x + 2, data.cell.y + 64, 126, 60);
              } catch (e) {
                console.error('Failed to draw image to PDF', e);
              }
            }
          }
        }
      });
    } else if (exportType === 'without_cnic') {
      const tableColumn = ["Name", "Father's Name", "Designation", "CNIC", "Phone", "Station"];
      const tableRows: any[] = [];
      filtered.forEach(m => {
        tableRows.push([
          m.Name,
          m['Father Name'] || '-',
          m.Designation || '-',
          m['N.I.C No'] || '-',
          m['Contact No'] || '-',
          m.Address || '-'
        ]);
      });
      
      doc.text("Members & Cabinet Directory", 14, 15);
      doc.setFontSize(10);
      doc.text(`Total Members: ${filtered.length}`, 14, 22);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        rowPageBreak: 'avoid',
        headStyles: { fillColor: [16, 185, 129] }
      });
    } else {
      // With CNIC (Full size / Large)
      const tableColumn = ["Photo", "Member Info", "Contact & Assignment"];
      const tableRows: any[] = [];
      
      filtered.forEach(m => {
        tableRows.push([
          '', // Placeholder for image
          `Name: ${m.Name}\nFather: ${m['Father Name'] || '-'}\nCNIC: ${m['N.I.C No'] || '-'}`,
          `Designation: ${m.Designation || '-'}\nPhone: ${m['Contact No'] || '-'}\nStation: ${m.Address || '-'}`
        ]);
      });
      
      doc.text("Members & Cabinet Directory (With CNIC)", 14, 15);
      doc.setFontSize(10);
      doc.text(`Total Members: ${filtered.length}`, 14, 22);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        rowPageBreak: 'avoid',
        headStyles: { fillColor: [16, 185, 129] },
        bodyStyles: { minCellHeight: 96 },
        columnStyles: {
          0: { cellWidth: 75 }, // Space for large CNIC
        },
        didDrawCell: (data) => {
          if (data.column.index === 0 && data.cell.section === 'body') {
            const member = filtered[data.row.index];
            if (member && member.NICImage) {
              try {
                const format = member.NICImage.includes('image/png') ? 'PNG' : 'JPEG';
                // Large size rendering
                doc.addImage(member.NICImage, format, data.cell.x + 2, data.cell.y + 2, 71, 46);
              } catch (e) {
                console.error('Failed to draw image to PDF', e);
              }
            }
            if (member && member.NICImageBack) {
              try {
                const format = member.NICImageBack.includes('image/png') ? 'PNG' : 'JPEG';
                doc.addImage(member.NICImageBack, format, data.cell.x + 2, data.cell.y + 50, 71, 46);
              } catch (e) {
                console.error('Failed to draw image to PDF', e);
              }
            }
          }
        }
      });
    }

    doc.save(`Members_Directory_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold dark:text-emerald-300 text-emerald-700 flex items-center gap-2">
            <IdCard className="w-6 h-6 text-emerald-500" />
            <span>{title}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <button
              type="button"
              onClick={handleToggleForm}
              className="glow-button px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{showForm ? 'Close Form' : 'New Member'}</span>
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

      {/* Member Form */}
      {showForm && (
        <div className="glass-card p-4 sm:p-6 shadow-2xl transition-all border-purple-500/40">
          <div className="flex items-center justify-between pb-3 mb-4 border-b dark:border-purple-900/50 border-purple-200">
            <h3 className="text-sm sm:text-base font-bold dark:text-emerald-400 text-emerald-700 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              <span>{editingId ? 'Edit Member Record' : 'Register New Member'}</span>
            </h3>
            <span className="text-[11px] text-slate-500">Official Cabinet Roll</span>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Name */}
            <div className="field-box">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="field-input"
                placeholder=" "
              />
              <User className="field-icon text-emerald-500 w-4 h-4" />
              <label className="field-label">Member Full Name *</label>
            </div>

            {/* Father Name */}
            <div className="field-box">
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                className="field-input"
                placeholder=" "
              />
              <User className="field-icon text-blue-400 w-4 h-4" />
              <label className="field-label">Father Name</label>
            </div>

            {/* Designation */}
            <div className="field-box">
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="field-input text-xs"
              >
                {DESIGNATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <Award className="field-icon text-amber-500 w-4 h-4" />
              <label className="field-label">Designation / Role</label>
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
              <label className="field-label">CNIC / N.I.C No</label>
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
              <MapPin className="field-icon text-blue-400 w-4 h-4" />
              <label className="field-label">Address / Station</label>
            </div>

            {/* Joining Date */}
            <div className="field-box">
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="field-input font-mono"
                placeholder=" "
              />
              <Calendar className="field-icon text-emerald-500 w-4 h-4" />
              <label className="field-label">Joining Date</label>
            </div>

            {/* Expiry Date */}
            <div className="field-box">
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="field-input font-mono"
                placeholder=" "
              />
              <Calendar className="field-icon text-amber-500 w-4 h-4" />
              <label className="field-label">Term Expiry Date</label>
            </div>

            {/* Remarks */}
            <div className="field-box">
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="field-input"
                placeholder=" "
              />
              <MessageSquare className="field-icon text-slate-400 w-4 h-4" />
              <label className="field-label">Cabinet Responsibilities</label>
            </div>

            {/* NIC Image Upload */}
            <div className="md:col-span-2 lg:col-span-3">
              <div className="flex flex-col gap-3 p-4 rounded-2xl dark:bg-slate-900/50 bg-white/50 border-2 border-dashed dark:border-purple-900/50 border-purple-200 group-hover:border-purple-500/50 transition-all">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ImageIcon className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold dark:text-slate-200 text-slate-700">CNIC Identity Document</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Upload a clear photo of the front and back of the member's National Identity Card.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Front */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                    <div className="flex items-center gap-3">
                      {nicImage && (
                        <div className="relative group/img">
                          <img src={nicImage} alt="CNIC Front" className="w-16 h-10 object-cover rounded-lg border border-purple-500/30" />
                          <button 
                            type="button" 
                            onClick={() => setNicImage(null)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center scale-0 group-hover/img:scale-100 transition-transform"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Front Side</div>
                    </div>
                    <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-all cursor-pointer text-[10px] font-bold shrink-0">
                      <Upload className="w-3 h-3" />
                      <span>{nicImage ? 'Change' : 'Upload'}</span>
                      <input type="file" accept="image/*" onChange={handleNICImageUpload} className="hidden" />
                    </label>
                  </div>

                  {/* Back */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                    <div className="flex items-center gap-3">
                      {nicImageBack && (
                        <div className="relative group/img">
                          <img src={nicImageBack} alt="CNIC Back" className="w-16 h-10 object-cover rounded-lg border border-purple-500/30" />
                          <button 
                            type="button" 
                            onClick={() => setNicImageBack(null)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center scale-0 group-hover/img:scale-100 transition-transform"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Back Side</div>
                    </div>
                    <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-all cursor-pointer text-[10px] font-bold shrink-0">
                      <Upload className="w-3 h-3" />
                      <span>{nicImageBack ? 'Change' : 'Upload'}</span>
                      <input type="file" accept="image/*" onChange={handleNICImageBackUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
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
                {editingId ? 'Update Member' : 'Save Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="glass-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-purple-500/30">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search members by name, role, NIC..."
            className="w-full pl-9 pr-4 py-2 rounded-xl dark:bg-slate-900/90 bg-white border dark:border-purple-900/40 border-purple-200 text-xs focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500 hover:text-white transition-colors text-xs font-bold"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-purple-500/20 py-2 z-50">
                  <button
                    onClick={() => handleExportPDF('with_cnic')}
                    className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-purple-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    With CNIC (Full Size)
                  </button>
                  <button
                    onClick={() => handleExportPDF('without_cnic')}
                    className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-purple-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    Without CNIC
                  </button>
                  <button
                    onClick={() => handleExportPDF('only_cnic')}
                    className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-purple-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    Only CNIC Images
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="text-xs text-slate-400">
            Total Members: <span className="font-bold dark:text-white text-slate-900">{filtered.length}</span>
          </div>
        </div>
      </div>

      {/* Empty State when no members exist */}
      {members.length === 0 ? (
        <div className="glass-card p-12 text-center border-purple-500/30 flex flex-col items-center justify-center my-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 shadow-inner">
            <IdCard className="w-8 h-8 text-purple-400 dark:text-purple-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
            Directory Empty
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
            The directory is currently empty. When ready, you can register new members or volunteers.
          </p>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="glow-button px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Register First Member</span>
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center border-purple-500/30 my-4">
          <p className="text-xs text-slate-400">No members matching &quot;{searchTerm}&quot;</p>
        </div>
      ) : (
        /* Members Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((m) => (
            <div
              key={m.id}
              onClick={() => onSelectMember(m)}
              className="glass-card p-4 shadow-xl border-purple-500/30 hover:border-emerald-500/60 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md text-sm overflow-hidden">
                      {m.NICImage ? (
                        <img src={m.NICImage} alt={m.Name} className="w-full h-full object-cover" />
                      ) : (
                        m.Name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    {m.NICImage && (
                      <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-emerald-500 text-white border-2 border-slate-900">
                        <ImageIcon className="w-2 h-2" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm dark:text-slate-200 text-slate-800 group-hover:text-emerald-400 transition-colors">
                      {m.Name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      s/o {m['Father Name'] || 'N/A'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
              </div>

              <div className="space-y-1 text-xs pt-2 border-t dark:border-purple-900/30 border-purple-100">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[11px]">Designation:</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-300">
                    {m.Designation}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[11px]">CNIC:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {m['N.I.C No'] || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[11px]">Phone:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {m['Contact No'] || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[11px]">Station:</span>
                  <span className="truncate max-w-[150px] text-slate-500">
                    {m.Address || '-'}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 flex items-center justify-between text-[10px] text-slate-500 border-t dark:border-purple-900/30 border-purple-100">
                <span>Term: {m['Joining Date']} to {m['Expiry Date']}</span>
                <div className="flex items-center gap-1">
                  {isAdmin && onDeleteMember && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMember(m.id);
                      }}
                      title="Delete Member"
                      className="p-1 rounded bg-red-500/10 text-red-400 hover:text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => handleEditMember(e, m)}
                      title="Edit Member Details"
                      className="p-1 rounded bg-emerald-500/10 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleDuplicateMember(e, m)}
                    title="Add Another Record for this Person"
                    className="p-1 rounded bg-purple-500/10 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors"
                  >
                    <CopyPlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMember(m);
                    }}
                    title="View Full Details"
                    className="p-1 rounded bg-purple-500/10 text-purple-400 hover:text-emerald-400 hover:bg-purple-500/20 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {m.NICImage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMember(m);
                      }}
                      title="Identity Document Available"
                      className="p-1 rounded bg-emerald-500/10 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
