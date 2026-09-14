const fs = require('fs');

let code = fs.readFileSync('src/components/tabs/BeneficiariesTab.tsx', 'utf8');

const oldActions = `<button
                            type="button"
                            onClick={() => onOpenMonkeyFileModal(b)}
                            title="Generate Allotment Monkey File"
                            className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                          </button>`;

const newActions = `<button
                            type="button"
                            onClick={() => onOpenMonkeyFileModal(b)}
                            title="Generate Allotment Monkey File"
                            className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                          </button>
                          {b.ProofLink && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(b.ProofLink, '_blank');
                              }}
                              title="View Video Proof"
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors flex items-center justify-center"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                              </svg>
                            </button>
                          )}`;

code = code.replace(oldActions, newActions);
fs.writeFileSync('src/components/tabs/BeneficiariesTab.tsx', code, 'utf8');
console.log('Patched actions in BeneficiariesTab');
