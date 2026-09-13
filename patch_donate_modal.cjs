const fs = require('fs');
let content = fs.readFileSync('src/components/modals/DonateModal.tsx', 'utf8');

// Imports
content = content.replace("import { COUNTRY_CODES } from '../../utils/countries';", "import { CountrySelect } from '../CountrySelect';");

const oldSelect = `<select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-[100px] py-2 px-2 rounded-xl bg-slate-900/80 border border-purple-900/50 text-white text-xs font-mono font-bold focus:border-emerald-500 focus:outline-none"
                      >
                        {COUNTRY_CODES.map(c => (
                          <option key={c.code} value={c.code}>{c.code}</option>
                        ))}
                      </select>`;

const newSelect = `<CountrySelect
                        value={countryCode}
                        onChange={setCountryCode}
                        className="w-[110px] bg-slate-900/80 border border-purple-900/50 rounded-xl focus-within:border-emerald-500"
                      />`;

content = content.replace(oldSelect, newSelect);
fs.writeFileSync('src/components/modals/DonateModal.tsx', content, 'utf8');
console.log('Fixed DonateModal');
