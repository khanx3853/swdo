const fs = require('fs');
let code = fs.readFileSync('src/components/tabs/BeneficiariesTab.tsx', 'utf8');

// Add "Proof" header
const headerStr = '<th className="py-3 px-3 font-semibold text-right">Aid Amount</th>';
const newHeaderStr = '<th className="py-3 px-3 font-semibold text-right">Aid Amount</th>\n                  <th className="py-3 px-3 font-semibold text-center">Proof</th>';
code = code.replace(headerStr, newHeaderStr);

// Move the button from Actions to a new column
const actionCellStart = '<td\n                        className="py-3 px-3 text-right whitespace-nowrap"\n                        onClick={(e) => e.stopPropagation()}\n                      >\n                        <div className="flex items-center justify-end gap-1.5">';

const actionCellReplacement = `<td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {b.ProofLink ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(b.ProofLink, '_blank');
                            }}
                            title="View Video Proof"
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors inline-flex items-center justify-center"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                          </button>
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </td>\n                      ` + actionCellStart;

code = code.replace(actionCellStart, actionCellReplacement);

// Now remove the old button from inside Actions
const oldButton = `{b.ProofLink && (
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
code = code.replace(oldButton, '');

// Also increment the colSpan for empty state
const emptyStateStr = '<td colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-slate-400">';
const newEmptyStateStr = '<td colSpan={isAdmin ? 9 : 8} className="text-center py-8 text-slate-400">';
code = code.replace(emptyStateStr, newEmptyStateStr);

fs.writeFileSync('src/components/tabs/BeneficiariesTab.tsx', code, 'utf8');
console.log('Patched BeneficiariesTab table columns');
