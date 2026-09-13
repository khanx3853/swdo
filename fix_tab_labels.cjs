const fs = require('fs');

['src/components/tabs/DonationsTab.tsx', 'src/components/tabs/BeneficiariesTab.tsx', 'src/components/tabs/MembersTab.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix label z-index to not block clicks on the custom select
  content = content.replace(
    '<label className="field-label !left-3" style={{ left: \'0.75rem\' }}>Code</label>',
    '<label className="field-label !left-3" style={{ left: \'0.75rem\', pointerEvents: \'none\' }}>Code</label>'
  );

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Fixed Tabs labels');
