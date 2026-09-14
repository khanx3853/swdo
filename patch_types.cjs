const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');
code = code.replace("VerifiedBy?: string;", "VerifiedBy?: string;\n  ProofLink?: string;");
fs.writeFileSync('src/types.ts', code, 'utf8');
console.log('Patched types.ts');
