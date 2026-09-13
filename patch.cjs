const fs = require('fs');
const content = fs.readFileSync('src/utils/formatters.ts', 'utf8');

const exportDonationsReportPDFCode = `
export async function exportDonationsReportPDF(
  list: Donation[],
  settings: PortalSettings,
  reportTitle = 'Donations & Collections Official Ledger Report'
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

  const totalAmount = list.reduce((sum, d) => sum + parseAmount(d.Amount), 0);

  const drawPageHeader = (pageNumber: number, totalPages?: number) => {
    addPdfWatermark(doc, logoData, 100, 100, 98.5, 55, 0.07);

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 24, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(settings['Foundation Name'].toUpperCase(), 148.5, 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text(\`\${settings.SubTitle} | \${settings.Address}\`, 148.5, 15, { align: 'center' });
    doc.text(\`\${reportTitle.toUpperCase()} - GENERATED: \${todayStr}\`, 148.5, 20, { align: 'center' });

    if (totalPages) {
      doc.setFontSize(7.5);
      doc.text(\`Page \${pageNumber} of \${totalPages}\`, 285, 20, { align: 'right' });
    }
  };

  drawPageHeader(1);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, 28, 273, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL DONATIONS / CONTRIBUTIONS:', 18, 35);
  doc.text('TOTAL AMOUNT COLLECTED:', 110, 35);
  doc.text('VERIFICATION STATUS:', 215, 35);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(\`\${list.length} Verified Records\`, 18, 41);

  doc.setTextColor(16, 185, 129);
  doc.text(formatPKR(totalAmount), 110, 41);

  doc.setTextColor(37, 99, 235);
  doc.text('Official Approved Collections', 215, 41);

  let y = 50;
  const colX = {
    sr: 12,
    date: 24,
    name: 45,
    contact: 85,
    category: 115,
    address: 165,
    txId: 215,
    amount: 255,
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
    doc.text('DONOR NAME', colX.name, y + 4.5);
    doc.text('CONTACT NO', colX.contact, y + 4.5);
    doc.text('CATEGORY / REMARKS', colX.category, y + 4.5);
    doc.text('ADDRESS / VILLAGE', colX.address, y + 4.5);
    doc.text('TRANSACTION ID', colX.txId, y + 4.5);
    doc.text('DONATION (PKR)', colX.amount, y + 4.5, { align: 'right' });
    doc.text('STATUS', colX.status, y + 4.5, { align: 'right' });
    y += 7;
  };

  drawTableHeader();

  let pageNum = 1;
  list.forEach((d, idx) => {
    if (y > 185) {
      doc.addPage();
      pageNum++;
      drawPageHeader(pageNum);
      y = 30;
      drawTableHeader();
    }

    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(12, y - 2, 273, 6.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);

    doc.text(String(idx + 1), colX.sr + 2, y + 2.5);
    doc.text(d.Date || 'N/A', colX.date, y + 2.5);

    const isUrduName = /[\\u0600-\\u06FF]/.test(d['Donor Name'] || '');
    if (isUrduName) {
      doc.setFont('NotoSansArabic', 'normal');
    } else {
      doc.setFont('helvetica', 'bold');
    }
    const nameText = doc.splitTextToSize(d['Donor Name'] || 'Anonymous', 38)[0];
    doc.text(nameText, colX.name, y + 2.5);

    doc.setFont('helvetica', 'normal');
    doc.text(d['Contact No'] || '-', colX.contact, y + 2.5);

    let catRem = \`\${d.Category || ''} \${d.Remarks ? \`(\${d.Remarks})\` : ''}\`.trim();
    const isUrduCat = /[\\u0600-\\u06FF]/.test(catRem);
    if (isUrduCat) {
      doc.setFont('NotoSansArabic', 'normal');
    }
    const catText = doc.splitTextToSize(catRem || '-', 48)[0];
    doc.text(catText, colX.category, y + 2.5);
    doc.setFont('helvetica', 'normal');

    const addrText = doc.splitTextToSize(d['Permanent Address'] || '-', 48)[0];
    doc.text(addrText, colX.address, y + 2.5);

    doc.setFontSize(6.5);
    doc.text(d['Transaction ID'] || '-', colX.txId, y + 2.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(16, 185, 129);
    doc.text(formatPKR(parseAmount(d.Amount)), colX.amount, y + 2.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(d.Status || 'Approved', colX.status, y + 2.5, { align: 'right' });

    y += 6.5;
  });

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
  doc.text('GRAND TOTAL COLLECTIONS', colX.txId, y + 5.5, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129);
  doc.text(formatPKR(totalAmount), colX.amount, y + 5.5, { align: 'right' });

  y += 20;

  if (y > 175) {
    doc.addPage();
    pageNum++;
    drawPageHeader(pageNum);
    y = 50;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  const sigY = y + 10;
  
  if (settings.TreasurerSignature) {
    try {
      doc.addImage(settings.TreasurerSignature, 'PNG', 20, sigY - 12, 35, 12);
    } catch(e) {}
  }
  doc.line(15, sigY, 65, sigY);
  doc.text(settings.Treasurer || 'Treasurer', 40, sigY + 5, { align: 'center' });
  doc.text('Accountant / Operator', 40, sigY + 10, { align: 'center' });

  doc.line(123, sigY, 173, sigY);
  doc.text(settings.Secretary || 'General Secretary', 148.5, sigY + 5, { align: 'center' });
  doc.text('Verified By', 148.5, sigY + 10, { align: 'center' });

  doc.line(230, sigY, 280, sigY);
  doc.text(settings.Chairperson || 'President', 255, sigY + 5, { align: 'center' });
  doc.text('Approved By', 255, sigY + 10, { align: 'center' });

  for (let i = 1; i <= pageNum; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(\`Page \${i} of \${pageNum}\`, 285, 20, { align: 'right' });
  }

  const safeTitle = reportTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(\`\${safeTitle}_\${todayStr}.pdf\`);
}
`;

const updatedContent = content + exportDonationsReportPDFCode;
fs.writeFileSync('src/utils/formatters.ts', updatedContent, 'utf8');
console.log('Appended exportDonationsReportPDF to src/utils/formatters.ts');
