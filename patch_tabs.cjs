const fs = require('fs');

['src/components/tabs/DonationsTab.tsx', 'src/components/tabs/BeneficiariesTab.tsx', 'src/components/tabs/MembersTab.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Imports
  content = content.replace(
    "import { COUNTRY_CODES, parsePhoneWithCountry } from '../../utils/countries';", 
    "import { parsePhoneWithCountry } from '../../utils/countries';\nimport { CountrySelect } from '../CountrySelect';"
  );

  const oldSelect = `<select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="field-input !pl-3 text-xs font-mono font-bold text-emerald-500 cursor-pointer"
                  style={{ paddingLeft: '0.75rem', paddingTop: '1.25rem' }}
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>`;

  const newSelect = `<CountrySelect
                  value={countryCode}
                  onChange={setCountryCode}
                  className="field-input !pl-0 text-xs font-mono font-bold text-emerald-500"
                  style={{ paddingTop: '1.25rem' }}
                />`;

  content = content.replace(oldSelect, newSelect);
  fs.writeFileSync(file, content, 'utf8');
});

console.log('Fixed Tabs');
