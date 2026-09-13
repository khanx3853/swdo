const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/DonationsTab.tsx', 'utf8');

const regex = /<button[\s\n]*type="button"[\s\n]*onClick=\{handleCSVExport\}[\s\n]*className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-blue-400 hover:text-blue-300 bg-blue-500\/10 hover:bg-blue-500\/20 border border-blue-500\/30 transition-colors cursor-pointer"[\s\n]*title="Export Ledger to CSV"[\s\n]*>[\s\n]*<DownloadCloud className="w-4 h-4" \/>[\s\n]*<span className="hidden sm:inline">Export CSV<\/span>[\s\n]*<\/button>/g;

content = content.replace(regex, '');

fs.writeFileSync('src/components/tabs/DonationsTab.tsx', content, 'utf8');
console.log('Fixed CSV');
