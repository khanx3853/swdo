const fs = require('fs');

let code = fs.readFileSync('src/utils/sourcePatch.ts', 'utf8');

code = code.replace(
  "return item;",
  `
  if (item && (item as any).Remarks && typeof (item as any).Remarks === 'string' && (item as any).Remarks.includes(' | PROOF: ')) {
    const parts = (item as any).Remarks.split(' | PROOF: ');
    (item as any).Remarks = parts[0];
    (item as any).ProofLink = parts[1];
  }
  return item;
  `
);

fs.writeFileSync('src/utils/sourcePatch.ts', code, 'utf8');
console.log('Patched sourcePatch.ts');
