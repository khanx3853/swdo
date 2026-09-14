const fs = require('fs');

let code = fs.readFileSync('src/components/modals/DetailModal.tsx', 'utf8');

const remarksField = `<div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                <span className="text-slate-400">Remarks:</span>
                <span className="text-right">{(item as Beneficiary).Remarks || '-'}</span>
              </div>`;

const proofLinkField = `              {(item as Beneficiary).ProofLink && (
                <div className="flex justify-between py-1 border-b dark:border-purple-900/20 border-purple-50">
                  <span className="text-slate-400">Video Proof:</span>
                  <a href={(item as Beneficiary).ProofLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h6v6"></path>
                      <path d="M10 14L21 3"></path>
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    </svg>
                    Watch Video
                  </a>
                </div>
              )}`;

code = code.replace(remarksField, remarksField + '\n' + proofLinkField);

fs.writeFileSync('src/components/modals/DetailModal.tsx', code, 'utf8');
console.log('Patched detail modal for proof link');
