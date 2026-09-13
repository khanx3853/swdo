const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/DonationsTab.tsx', 'utf8');

const regex = /<button[\s\n]*type="button"[\s\n]*onClick=\{\(\) => csvFileInputRef\.current\?\.click\(\)\}.*?<span className="hidden sm:inline">Import CSV<\/span>[\s\n]*<\/button>/g;
content = content.replace(regex, '');

fs.writeFileSync('src/components/tabs/DonationsTab.tsx', content, 'utf8');
console.log('Fixed Import CSV');
