const fs = require('fs');

let code = fs.readFileSync('src/lib/firestoreSync.ts', 'utf8');

// We add ProofLink to exclude fields so it is deleted.
code = code.replace(
  "const excludeFields = ['isLiveAdded', 'Source'];",
  "const excludeFields = ['isLiveAdded', 'Source', 'ProofLink'];\n    \n    // Pack ProofLink into Remarks so we don't lose it\n    if (typeof sanitized === 'object' && sanitized !== null && 'ProofLink' in sanitized && sanitized.ProofLink) {\n      sanitized.Remarks = (sanitized.Remarks || '') + ' | PROOF: ' + sanitized.ProofLink;\n    }"
);

fs.writeFileSync('src/lib/firestoreSync.ts', code, 'utf8');
console.log('Patched firestoreSync.ts');
