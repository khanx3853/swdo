const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/DonationsTab.tsx', 'utf8');

const regex = /<button[^>]*onClick=\{\(\) => csvFileInputRef\.current\?\.click\(\)\}[^>]*>[\s\S]*?<\/button>/g;
content = content.replace(regex, '');

fs.writeFileSync('src/components/tabs/DonationsTab.tsx', content, 'utf8');
console.log('Fixed Import CSV 2');
