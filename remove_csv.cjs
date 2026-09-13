const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/DonationsTab.tsx', 'utf8');

// 1. Remove Papa import
content = content.replace("import Papa from 'papaparse';\n", '');

// 2. Remove csvFileInputRef
content = content.replace("  const csvFileInputRef = useRef<HTMLInputElement>(null);\n", '');

// 3. Remove handleCSVExport and handleCSVImport
const handleCSVExportStart = content.indexOf('  const handleCSVExport = () => {');
const pendingDonationsStart = content.indexOf('  // Pending vs Approved lists');

if (handleCSVExportStart !== -1 && pendingDonationsStart !== -1) {
  content = content.slice(0, handleCSVExportStart) + content.slice(pendingDonationsStart);
}

// 4. Remove UI elements
const hiddenInputRegex = /<input\s+type="file"\s+ref=\{csvFileInputRef\}\s+onChange=\{handleCSVImport\}\s+accept="\.csv"\s+className="hidden"\s+\/>/g;
content = content.replace(hiddenInputRegex, '');

const exportCsvBtnRegex = /<button\s+type="button"\s+onClick=\{handleCSVExport\}.*?title="Export Ledger to CSV"[\s\S]*?<\/button>/g;
content = content.replace(exportCsvBtnRegex, '');

const importCsvBtnRegex = /<button\s+type="button"\s+onClick=\{.*csvFileInputRef\.current\?\.click\(\)\}.*?<\/button>/g;
content = content.replace(importCsvBtnRegex, '');

fs.writeFileSync('src/components/tabs/DonationsTab.tsx', content, 'utf8');
console.log('Removed CSV options');
