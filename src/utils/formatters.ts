import { jsPDF } from 'jspdf';
import { Donation, Beneficiary, PortalSettings } from '../types';
import { NOTO_SANS_ARABIC_BASE64 } from './fonts';

export function parseAmount(amount: any): number {
  if (amount === undefined || amount === null || amount === '') return 0;
  if (typeof amount === 'number') return isNaN(amount) ? 0 : amount;
  const cleaned = String(amount).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatPKR(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return 'Rs. 0.00';
  const num = typeof amount === 'number' ? (isNaN(amount) ? 0 : amount) : parseFloat(String(amount).replace(/[^0-9.-]+/g, '')) || 0;
  return `Rs. ${num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNIC(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 13);
  if (digits.length > 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  } else if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits;
}

export function formatContact(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length > 4) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return digits;
}

export function parseDateRange(dateStr: string | undefined | null): { start: string; end: string; sortTimestamp: number } {
  if (!dateStr) return { start: '', end: '', sortTimestamp: 0 };
  const str = dateStr.trim();

  // Match standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const time = new Date(str).getTime();
    return { start: str, end: str, sortTimestamp: isNaN(time) ? 0 : time };
  }

  // Look for 4-digit year
  const yearMatches = str.match(/\b(20\d\d)\b/g);
  const defaultYear = yearMatches ? yearMatches[yearMatches.length - 1] : '2025';

  const monthsMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  // Match e.g. "15 MARCH TO 16 AUG 2025" or "15 MARCH 2025 TO 16 AUG 2025"
  const rangeMatch = str.match(/(\d{1,2})\s+([a-zA-Z]+)(?:\s+(\d{4}))?\s*(?:to|-)\s*(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/i);
  if (rangeMatch) {
    const day1 = rangeMatch[1].padStart(2, '0');
    const m1 = monthsMap[rangeMatch[2].substring(0, 3).toLowerCase()] || '01';
    const y1 = rangeMatch[3] || rangeMatch[6] || defaultYear;

    const day2 = rangeMatch[4].padStart(2, '0');
    const m2 = monthsMap[rangeMatch[5].substring(0, 3).toLowerCase()] || '12';
    const y2 = rangeMatch[6] || defaultYear;

    const start = `${y1}-${m1}-${day1}`;
    const end = `${y2}-${m2}-${day2}`;
    const time = new Date(end).getTime();
    return { start, end, sortTimestamp: isNaN(time) ? 0 : time };
  }

  // Fallback standard parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const iso = parsed.toISOString().split('T')[0];
    return { start: iso, end: iso, sortTimestamp: parsed.getTime() };
  }

  const currentYear = new Date().getFullYear();
  const fallbackYear = defaultYear || currentYear.toString();
  return { start: `${fallbackYear}-01-01`, end: `${fallbackYear}-12-31`, sortTimestamp: new Date(`${fallbackYear}-12-31`).getTime() };
}

export function getLogoDataUrl(): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = '/logo.png';
  });
}

export function addPdfWatermark(
  doc: jsPDF,
  logoData: string,
  width = 80,
  height = 80,
  x = 34,
  y = 65,
  opacity = 0.08
) {
  if (!logoData) return;
  try {
    const gState = new (doc as any).GState({ opacity });
    doc.setGState(gState);
    doc.addImage(logoData, 'PNG', x, y, width, height);
    doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
  } catch (e) {
    console.error('Watermark error:', e);
  }
}

export function getSignatureDataUrl(): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      } else {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = '/junaid_signature.jpg';
  });
}

export async function exportDonationReceiptPDF(donation: Donation, settings: PortalSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const logoData = await getLogoDataUrl();
  addPdfWatermark(doc, logoData, 70, 70, 39, 70, 0.15);

  // Register Urdu Font
  doc.addFileToVFS('NotoSansArabic.ttf', NOTO_SANS_ARABIC_BASE64);
  doc.addFont('NotoSansArabic.ttf', 'NotoSansArabic', 'normal');

  const signatureData = await getSignatureDataUrl();

  // Background card styling
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(6, 6, 136, 198, 4, 4, 'F');
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.roundedRect(6, 6, 136, 198, 4, 4, 'S');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129);
  doc.text(settings['Foundation Name'].toUpperCase(), 74, 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(settings.SubTitle, 74, 23, { align: 'center' });
  doc.text(settings.Address, 74, 27, { align: 'center' });

  // Receipt Badge
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(44, 32, 60, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL DONATION RECEIPT', 74, 37.5, { align: 'center' });

  // Receipt meta
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Receipt No: ${donation['Transaction ID'] || 'TXN-' + donation.id}`, 12, 48);
  doc.text(`Date: ${donation.Date}`, 136, 48, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(12, 51, 136, 51);

  // Table items
  const details = [
    ['Received From (Donor):', donation['Donor Name']],
    ['CNIC / NIC No:', donation['NIC No'] || 'N/A'],
    ['Contact Number:', donation['Contact No'] || 'N/A'],
    ['Permanent Address:', donation['Permanent Address'] || 'N/A'],
    ['Profession:', donation.Profession || 'N/A'],
    ['Donation Amount:', formatPKR(donation.Amount)],
    ['Purpose / Remarks:', donation.Remarks || 'General Donation / Zakat'],
    ...(donation.ApprovedBy ? [['Approved By:', donation.ApprovedBy.charAt(0).toUpperCase() + donation.ApprovedBy.slice(1)]] : []),
    ['Entered In System By:', donation.EnteredBy || 'Portal Operator'],
  ];

  let y = 58;
  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 14, y);

    const containsUrdu = /[\u0600-\u06FF]/.test(String(value));
    if (containsUrdu) {
      doc.setFont('NotoSansArabic', 'normal');
    } else {
      doc.setFont('helvetica', label === 'Donation Amount:' ? 'bold' : 'normal');
    }
    
    if (label === 'Donation Amount:') {
      doc.setTextColor(16, 185, 129);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    const splitVal = doc.splitTextToSize(String(value), 68);
    doc.text(splitVal, 68, y);
    y += Math.max(splitVal.length * 4.5, 6.5);
  });

  // Footer notes & signatures
  doc.setDrawColor(203, 213, 225);
  doc.line(12, 160, 136, 160);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('"May Almighty Allah accept your charity and grant barakah in your sustenance."', 74, 166, {
    align: 'center',
  });

  // Signatures
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.line(16, 186, 55, 186);
  doc.text('Authorized Signature', 35.5, 190, { align: 'center' });
  doc.text('Accountant / Operator', 35.5, 194, { align: 'center' });

  if (signatureData) {
    doc.addImage(signatureData, 'JPEG', 93, 172, 40, 18);
  }
  doc.text(settings.Treasurer || 'Treasurer / Chairperson', 112.5, 190, { align: 'center' });
  doc.text(settings['Foundation Name'] || 'SWDO', 112.5, 194, { align: 'center' });

  doc.save(`Donation_Receipt_${donation['Donor Name'].replace(/\s+/g, '_')}.pdf`);
}

export async function exportMonkeyFilePDF(ben: Beneficiary, settings: PortalSettings, fileNo: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const logoData = await getLogoDataUrl();

  // Register Urdu Font
  doc.addFileToVFS('NotoSansArabic.ttf', NOTO_SANS_ARABIC_BASE64);
  doc.addFont('NotoSansArabic.ttf', 'NotoSansArabic', 'normal');

  // Header Box
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(settings['Foundation Name'].toUpperCase(), 105, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`${settings.SubTitle} | Official Welfare Allotment Docket`, 105, 24, { align: 'center' });

  // File Badge
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(15, 42, 180, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`OFFICIAL ALLOTMENT DOSSIER: ${fileNo}`, 22, 50);
  doc.text(`DATE: ${ben.Date}`, 188, 50, { align: 'right' });

  // Beneficiary details box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 60, 180, 110, 3, 3, 'FD');

  const rows = [
    ['Dossier File Reference:', fileNo],
    ['Beneficiary Name:', ben['Beneficiary Name']],
    ['Father / Husband Name:', ben['Father Name'] || 'N/A'],
    ['Computerized NIC No:', ben['NIC No'] || 'N/A'],
    ['Contact Phone No:', ben['Contact No'] || 'N/A'],
    ['Permanent Address:', ben['Permanent Address'] || 'N/A'],
    ['Profession / Occupation:', ben.Profession || 'N/A'],
    ['Welfare Relief Category:', ben.Purpose || 'General Relief'],
    ['Sanctioned Cash Amount:', formatPKR(ben.Amount)],
    ['Transaction ID Ref:', ben['Transaction ID'] || 'N/A'],
    ['Verification Officer:', ben.VerifiedBy || settings.Secretary],
    ['Approval Remarks:', ben.Remarks || 'Verified and approved as per foundation relief policy'],
  ];

  let currentY = 70;
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 20, currentY);

    const containsUrdu = /[\u0600-\u06FF]/.test(String(value));
    if (containsUrdu) {
      doc.setFont('NotoSansArabic', 'normal');
    } else {
      doc.setFont('helvetica', label === 'Sanctioned Cash Amount:' ? 'bold' : 'normal');
    }

    if (label === 'Sanctioned Cash Amount:') {
      doc.setTextColor(16, 185, 129);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    const lines = doc.splitTextToSize(String(value), 115);
    doc.text(lines, 80, currentY);
    currentY += Math.max(lines.length * 5, 8);
  });

  // Verification Certification Clause
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `This certifies that the recipient above has been properly vetted by the ${settings['Foundation Name']} Verification Committee and the financial aid has been disbursed for humanitarian assistance.`,
    15,
    182,
    { maxWidth: 180 }
  );

  // Signatures
  doc.setDrawColor(203, 213, 225);
  doc.line(20, 240, 70, 240);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Beneficiary Thumb / Signature', 45, 245, { align: 'center' });

  doc.line(80, 240, 130, 240);
  doc.text('Junaid Khan', 105, 245, { align: 'center' });
  doc.text('Welfare Officer / Case Examiner', 105, 250, { align: 'center' });

  doc.line(140, 240, 190, 240);
  doc.text(settings.Chairperson || 'Chairperson / President', 165, 245, { align: 'center' });
  doc.text(settings['Foundation Name'] || 'SWDO', 165, 250, { align: 'center' });

  doc.save(`Allotment_File_${fileNo}_${ben['Beneficiary Name'].replace(/\s+/g, '_')}.pdf`);
}

export const generateDonationReceiptPDF = exportDonationReceiptPDF;

export function generateMonkeyFilePDF(ben: Beneficiary, settings: PortalSettings, fileNo?: string) {
  const fNo = fileNo || `MK-${ben['Transaction ID'] || '2026-904'}`;
  return exportMonkeyFilePDF(ben, settings, fNo);
}

export async function exportBeneficiariesReportPDF(
  list: Beneficiary[],
  settings: PortalSettings,
  reportTitle = 'Beneficiaries & Welfare Relief Official Ledger Report'
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const logoData = await getLogoDataUrl();
  const todayStr = new Date().toISOString().split('T')[0];

  // Register Urdu Font
  doc.addFileToVFS('NotoSansArabic.ttf', NOTO_SANS_ARABIC_BASE64);
  doc.addFont('NotoSansArabic.ttf', 'NotoSansArabic', 'normal');

  const totalAmount = list.reduce((sum, b) => sum + parseAmount(b.Amount), 0);

  const drawPageHeader = (pageNumber: number, totalPages?: number) => {
    // Watermark
    addPdfWatermark(doc, logoData, 100, 100, 98.5, 55, 0.07);

    // Header Background Bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 24, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(settings['Foundation Name'].toUpperCase(), 148.5, 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text(`${settings.SubTitle} | ${settings.Address}`, 148.5, 15, { align: 'center' });
    doc.text(`${reportTitle.toUpperCase()} - GENERATED: ${todayStr}`, 148.5, 20, { align: 'center' });

    if (totalPages) {
      doc.setFontSize(7.5);
      doc.text(`Page ${pageNumber} of ${totalPages}`, 285, 20, { align: 'right' });
    }
  };

  // Draw First Page Header
  drawPageHeader(1);

  // Summary Metrics Banner
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, 28, 273, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL FAMILIES / CASES:', 18, 35);
  doc.text('TOTAL AMOUNT CONSUMED / DISBURSED:', 110, 35);
  doc.text('VERIFICATION STATUS:', 215, 35);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${list.length} Registered Cases`, 18, 41);

  doc.setTextColor(37, 99, 235);
  doc.text(formatPKR(totalAmount), 110, 41);

  doc.setTextColor(16, 185, 129);
  doc.text('Official Vetted & Allotted', 215, 41);

  // Table Column Setup
  let y = 50;
  const colX = {
    sr: 12,
    date: 24,
    name: 50,
    father: 92,
    purpose: 132,
    address: 178,
    txId: 218,
    amount: 258,
    status: 285,
  };

  const drawTableHeader = () => {
    doc.setFillColor(30, 41, 59);
    doc.rect(12, y, 273, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    doc.text('#', colX.sr + 2, y + 4.5);
    doc.text('DATE', colX.date, y + 4.5);
    doc.text('BENEFICIARY NAME', colX.name, y + 4.5);
    doc.text('FATHER / HUSBAND', colX.father, y + 4.5);
    doc.text('PURPOSE / RELIEF CATEGORY', colX.purpose, y + 4.5);
    doc.text('ADDRESS / VILLAGE', colX.address, y + 4.5);
    doc.text('TRANSACTION ID', colX.txId, y + 4.5);
    doc.text('AID AMOUNT (PKR)', colX.amount, y + 4.5, { align: 'right' });
    doc.text('STATUS', colX.status, y + 4.5, { align: 'right' });

    y += 7;
  };

  drawTableHeader();

  let pageNum = 1;
  list.forEach((b, idx) => {
    if (y > 185) {
      doc.addPage();
      pageNum++;
      drawPageHeader(pageNum);
      y = 30;
      drawTableHeader();
    }

    // Zebra striping
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, y, 273, 6, 'F');
    }

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    // Sr
    doc.text(`${idx + 1}`, colX.sr + 2, y + 4.2);

    // Date
    doc.text(b.Date || 'N/A', colX.date, y + 4.2);

    // Name (handle Urdu if any)
    const isUrduName = /[\u0600-\u06FF]/.test(b['Beneficiary Name']);
    if (isUrduName) {
      doc.setFont('NotoSansArabic', 'normal');
    } else {
      doc.setFont('helvetica', 'bold');
    }
    const nameText = doc.splitTextToSize(b['Beneficiary Name'], 40)[0];
    doc.text(nameText, colX.name, y + 4.2);

    // Father Name
    doc.setFont('helvetica', 'normal');
    const fatherText = doc.splitTextToSize(b['Father Name'] || '-', 38)[0];
    doc.text(fatherText, colX.father, y + 4.2);

    // Purpose
    const purposeText = doc.splitTextToSize(b.Purpose || 'Relief Support', 44)[0];
    doc.text(purposeText, colX.purpose, y + 4.2);

    // Address
    const addrText = doc.splitTextToSize(b['Permanent Address'] || '-', 38)[0];
    doc.text(addrText, colX.address, y + 4.2);

    // TxID
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(b['Transaction ID'] || '-', colX.txId, y + 4.2);

    // Amount (bold green/blue)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(37, 99, 235);
    doc.text(formatPKR(parseAmount(b.Amount)), colX.amount, y + 4.2, { align: 'right' });

    // Status
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(16, 185, 129);
    doc.text(b.Status || 'Allotted', colX.status, y + 4.2, { align: 'right' });

    y += 6;
  });

  // Table summary total row
  if (y > 180) {
    doc.addPage();
    pageNum++;
    drawPageHeader(pageNum);
    y = 30;
  }

  doc.setFillColor(241, 245, 249);
  doc.rect(12, y, 273, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(12, y, 285, y);
  doc.line(12, y + 8, 285, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`GRAND TOTAL BENEFICIARY EXPENDITURE (${list.length} CASES):`, 16, y + 5.5);

  doc.setTextColor(37, 99, 235);
  doc.text(formatPKR(totalAmount), colX.amount, y + 5.5, { align: 'right' });

  // Signatures on bottom of last page
  const sigY = Math.max(y + 16, 175);
  if (sigY <= 195) {
    doc.setDrawColor(203, 213, 225);
    doc.line(20, sigY, 75, sigY);
    doc.line(120, sigY, 175, sigY);
    doc.line(220, sigY, 275, sigY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Prepared By: Verification Committee', 47.5, sigY + 4, { align: 'center' });
    doc.text('Audited By: Welfare Officer', 147.5, sigY + 4, { align: 'center' });
    doc.text(`Approved By: ${settings.Chairperson || 'Chairperson'}`, 247.5, sigY + 4, { align: 'center' });
  }

  doc.save(`SWDO_Beneficiaries_Report_${todayStr}.pdf`);
}

export function exportBeneficiariesCSV(list: Beneficiary[], filenamePrefix = 'SWDO_Beneficiaries_Report') {
  const todayStr = new Date().toISOString().split('T')[0];
  const headers = [
    'Transaction ID',
    'Date',
    'Beneficiary Name',
    'Father Name',
    'NIC No',
    'Contact No',
    'Permanent Address',
    'Profession',
    'Purpose / Relief Category',
    'Aid Amount (PKR)',
    'Remarks',
    'Verified By',
    'Status',
  ];

  const rows = list.map((b) => [
    `"${(b['Transaction ID'] || '').replace(/"/g, '""')}"`,
    `"${(b.Date || '').replace(/"/g, '""')}"`,
    `"${(b['Beneficiary Name'] || '').replace(/"/g, '""')}"`,
    `"${(b['Father Name'] || '').replace(/"/g, '""')}"`,
    `"${(b['NIC No'] || '').replace(/"/g, '""')}"`,
    `"${(b['Contact No'] || '').replace(/"/g, '""')}"`,
    `"${(b['Permanent Address'] || '').replace(/"/g, '""')}"`,
    `"${(b.Profession || '').replace(/"/g, '""')}"`,
    `"${(b.Purpose || '').replace(/"/g, '""')}"`,
    parseAmount(b.Amount),
    `"${(b.Remarks || '').replace(/"/g, '""')}"`,
    `"${(b.VerifiedBy || 'Verification Committee').replace(/"/g, '""')}"`,
    `"${(b.Status || 'Allotted').replace(/"/g, '""')}"`,
  ]);

  const totalAmount = list.reduce((sum, b) => sum + parseAmount(b.Amount), 0);
  const totalRow = [
    '"TOTAL"',
    '""',
    `"Total Cases: ${list.length}"`,
    '""',
    '""',
    '""',
    '""',
    '""',
    '"Total Aid Consumed"',
    totalAmount,
    '""',
    '""',
    '""',
  ];

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(',')), totalRow.join(',')].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}_${todayStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

