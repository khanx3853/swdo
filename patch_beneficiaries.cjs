const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/BeneficiariesTab.tsx', 'utf8');

// Imports
content = content.replace("import { generateUUID }", "import { generateUUID } from '../../utils/uuid';\nimport { COUNTRY_CODES, parsePhoneWithCountry }");

// State
content = content.replace("const [contactNo, setContactNo] = useState('');", "const [countryCode, setCountryCode] = useState('+92');\n  const [contactNo, setContactNo] = useState('');");

// UseEffect edit
const useEffectMatch = `setNicNo(editingItem['NIC No'] || '');
      setContactNo(editingItem['Contact No'] || '');`;
const useEffectReplace = `setNicNo(editingItem['NIC No'] || '');
      const parsedContact = parsePhoneWithCountry(editingItem['Contact No'] || '');
      setCountryCode(parsedContact.countryCode);
      setContactNo(parsedContact.number);`;
content = content.replace(useEffectMatch, useEffectReplace);

// Handle save
const onSaveMatch = `'Contact No': contactNo.trim(),`;
const onSaveReplace = `'Contact No': \\\`\${countryCode} \${contactNo.trim()}\\\`.trim(),`;
content = content.replace(onSaveMatch, onSaveReplace);

const inputUI = `{/* Contact */}
            <div className="field-box">
              <input
                type="text"
                value={contactNo}
                onChange={(e) => setContactNo(formatContact(e.target.value))}
                maxLength={12}
                className="field-input font-mono"
                placeholder=" "
              />
              <Phone className="field-icon text-purple-500 w-4 h-4" />
              <label className="field-label">Contact Phone No</label>
            </div>`;

const inputUIReplace = `{/* Contact */}
            <div className="flex gap-2 w-full">
              <div className="field-box w-28 mb-0 flex-shrink-0">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="field-input !pl-3 text-xs font-mono font-bold text-emerald-500 cursor-pointer"
                  style={{ paddingLeft: '0.75rem', paddingTop: '1.25rem' }}
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
                <label className="field-label !left-3" style={{ left: '0.75rem' }}>Code</label>
              </div>

              <div className="field-box flex-1 mb-0">
                <input
                  type="text"
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value.replace(/[^\\d-]/g, '').slice(0, 15))}
                  className="field-input font-mono"
                  placeholder=" "
                  autoComplete="off"
                />
                <Phone className="field-icon text-purple-500 w-4 h-4" />
                <label className="field-label">Contact Phone No</label>
              </div>
            </div>`;

content = content.replace(inputUI, inputUIReplace);

fs.writeFileSync('src/components/tabs/BeneficiariesTab.tsx', content, 'utf8');
console.log('Fixed BeneficiariesTab');
