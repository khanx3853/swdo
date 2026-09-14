const fs = require('fs');
let code = fs.readFileSync('src/components/tabs/BeneficiariesTab.tsx', 'utf8');

// 1. Add state
code = code.replace(
  "const [remarks, setRemarks] = useState('');",
  "const [remarks, setRemarks] = useState('');\n  const [proofLink, setProofLink] = useState('');"
);

// 2. Add to useEffect
code = code.replace(
  "setRemarks(editingItem.Remarks || '');",
  "setRemarks(editingItem.Remarks || '');\n      setProofLink(editingItem.ProofLink || '');"
);

// 3. Add to resetForm
code = code.replace(
  "setRemarks('');",
  "setRemarks('');\n    setProofLink('');"
);

// 4. Add to handleSubmit
code = code.replace(
  "Remarks: remarks.trim(),",
  "Remarks: remarks.trim(),\n      ProofLink: proofLink.trim(),"
);

fs.writeFileSync('src/components/tabs/BeneficiariesTab.tsx', code, 'utf8');
console.log('Patched state in BeneficiariesTab');
