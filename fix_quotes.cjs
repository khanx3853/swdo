const fs = require('fs');

['src/components/tabs/BeneficiariesTab.tsx', 'src/components/tabs/MembersTab.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\`\$\{countryCode\} \$\{contactNo\.trim\(\)\}\\`/g, '`${countryCode} ${contactNo.trim()}`');
  fs.writeFileSync(file, content, 'utf8');
});

console.log('Fixed quotes');
