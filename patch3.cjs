const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/DonationsTab.tsx', 'utf8');

const regex = /<button[\s\n]*type="button"[\s\n]*onClick=\{handleCSVExport\}[\s\n]*className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-blue-400 hover:text-blue-300 bg-blue-500\/10 hover:bg-blue-500\/20 border border-blue-500\/30 transition-colors cursor-pointer"[\s\n]*title="Export Ledger to CSV"[\s\n]*>[\s\n]*<DownloadCloud className="w-4 h-4" \/>[\s\n]*<span className="hidden sm:inline">Export CSV<\/span>[\s\n]*<\/button>/g;

let count = 0;
content = content.replace(regex, (match) => {
  count++;
  if (count === 2) {
    return `<button
                type="button"
                onClick={handlePDFExport}
                className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors cursor-pointer"
                title="Export Ledger to PDF"
              >
                <DownloadCloud className="w-4 h-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>`;
  }
  return match;
});

fs.writeFileSync('src/components/tabs/DonationsTab.tsx', content, 'utf8');
console.log('Replaced second CSV button with PDF button.');
