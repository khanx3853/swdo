const fs = require('fs');
let code = fs.readFileSync('src/components/tabs/BeneficiariesTab.tsx', 'utf8');

const remarksField = `{/* Remarks */}
            <div className="field-box md:col-span-2">
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="field-input"
                placeholder=" "
              />
              <MessageSquare className="field-icon text-slate-400 w-4 h-4" />
              <label className="field-label">Additional Remarks / Comments</label>
            </div>`;

const proofLinkField = `            {/* Proof Link */}
            <div className="field-box md:col-span-2">
              <input
                type="url"
                value={proofLink}
                onChange={(e) => setProofLink(e.target.value)}
                className="field-input"
                placeholder=" "
              />
              <FileCheck className="field-icon text-emerald-400 w-4 h-4" />
              <label className="field-label">Video Proof Link (Facebook, YouTube, etc.)</label>
            </div>`;

if(code.includes(remarksField)) {
  code = code.replace(remarksField, remarksField + '\n' + proofLinkField);
} else {
  // Use regex if exact match fails
  const regex = /\{\/\* Remarks \*\/\}[\s\S]*?<\/div>/;
  code = code.replace(regex, match => match + '\n' + proofLinkField);
}

fs.writeFileSync('src/components/tabs/BeneficiariesTab.tsx', code, 'utf8');
console.log('Patched form in BeneficiariesTab');
