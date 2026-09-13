const fs = require('fs');

['src/components/tabs/BeneficiariesTab.tsx', 'src/components/tabs/MembersTab.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import { COUNTRY_CODES, parsePhoneWithCountry } from '../../utils/uuid';", "import { COUNTRY_CODES, parsePhoneWithCountry } from '../../utils/countries';");
  fs.writeFileSync(file, content, 'utf8');
});

console.log('Fixed imports');
