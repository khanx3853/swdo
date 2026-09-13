const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/DonationsTab.tsx', 'utf8');

const handlePDFExportCode = `
  const handlePDFExport = async () => {
    try {
      const isBeneficiaryView = ['direct-aid', 'wheelchairs', 'orphans', 'ration', 'blood'].includes(categoryFilter);
      
      if (isBeneficiaryView) {
        const title = \`SWDO \${categoryFilter.replace('-', ' ').toUpperCase()} RELIEF REPORT\`;
        await exportBeneficiariesReportPDF(filteredBeneficiaries, settings, title);
      } else {
        const title = \`SWDO \${categoryFilter.toUpperCase()} DONATIONS LEDGER REPORT\`;
        await exportDonationsReportPDF(filteredDonations, settings, title);
      }
    } catch (err) {
      console.error('PDF Export Error:', err);
    }
  };
`;

content = content.replace('const handleCSVExport = () => {', handlePDFExportCode + '\n  const handleCSVExport = () => {');

// Now replace one of the CSV buttons with PDF button
const csvButton = `<button
                type="button"
                onClick={handleCSVExport}
                className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-colors cursor-pointer"
                title="Export Ledger to CSV"
              >
                <DownloadCloud className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>`;

const pdfButton = `<button
                type="button"
                onClick={handlePDFExport}
                className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors cursor-pointer"
                title="Export Ledger to PDF"
              >
                <DownloadCloud className="w-4 h-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>`;

content = content.replace(csvButton + '\\n\\n              ' + csvButton, csvButton + '\\n\\n              ' + pdfButton);

fs.writeFileSync('src/components/tabs/DonationsTab.tsx', content, 'utf8');
console.log('Updated DonationsTab.tsx');
