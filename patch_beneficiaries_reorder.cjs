const fs = require('fs');

let code = fs.readFileSync('src/components/tabs/BeneficiariesTab.tsx', 'utf8');

// Header reorder
const oldHeader = `{isAdmin && <th className="py-3 px-3 font-semibold text-center">Contact</th>}<th className="py-3 px-3 font-semibold text-right">Aid Amount</th>
                  <th className="py-3 px-3 font-semibold text-center">Proof</th>`;
                  
const newHeader = `<th className="py-3 px-3 font-semibold text-center">Proof</th>
                  {isAdmin && <th className="py-3 px-3 font-semibold text-center">Contact</th>}
                  <th className="py-3 px-3 font-semibold text-right">Aid Amount</th>`;
                  
code = code.replace(oldHeader, newHeader);

// Row cell reorder
const oldContactCell = `{isAdmin && (
                        <td className="py-3 px-3 text-center align-middle">
                          {renderContact(b['Contact No'])}
                        </td>
                      )}`;

const oldAmountCellStr = `<td className="py-3 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {((b.Purpose || '').toLowerCase().includes('wheelchair') || (b.Remarks || '').toLowerCase().includes('wheelchair') || (b.Purpose || '').toLowerCase().includes('disabled')) ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {getWheelchairCountText(b)}
                          </span>
                        ) : (
                          formatPKR(b.Amount)
                        )}
                      </td>`;
                      
const oldProofCellStr = `<td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
                      </td>`;

// Let's replace the whole block
const searchBlock = oldContactCell + '\n                      ' + oldAmountCellStr + '\n                      ' + oldProofCellStr;
const replaceBlock = oldProofCellStr + '\n                      ' + oldContactCell + '\n                      ' + oldAmountCellStr;

if (code.includes(searchBlock)) {
  code = code.replace(searchBlock, replaceBlock);
} else {
  console.log("Could not find block to replace. Attempting to parse manually...");
}

fs.writeFileSync('src/components/tabs/BeneficiariesTab.tsx', code, 'utf8');
console.log('Done');
