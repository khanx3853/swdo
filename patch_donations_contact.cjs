const fs = require('fs');

let code = fs.readFileSync('src/components/tabs/DonationsTab.tsx', 'utf8');

// 1. Update the header
code = code.replace(
  '{isAdmin && <th className="py-3 px-3 font-semibold hidden md:table-cell">Contact</th>}',
  '{isAdmin && <th className="py-3 px-3 font-semibold text-center">Contact</th>}'
);

// 2. Add the helper function inside DonationsTab
const renderContactFunc = `
  const renderContact = (contactNo: string | undefined) => {
    if (!contactNo || contactNo === '-') return <span className="text-slate-500 text-[10px]">-</span>;
    
    const cleanNumber = contactNo.replace(/[^0-9+]/g, '');
    let waNumber = contactNo.replace(/[^0-9]/g, '');
    if (waNumber.startsWith('0')) {
      waNumber = '92' + waNumber.substring(1);
    }
    
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-[10px] whitespace-nowrap">{contactNo}</span>
        <div className="flex items-center gap-1">
          <a 
            href={\`tel:\${cleanNumber}\`} 
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
            title="Call"
          >
            <Phone className="w-3 h-3" />
          </a>
          <a 
            href={\`https://wa.me/\${waNumber}\`} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
            title="WhatsApp"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
          </a>
        </div>
      </div>
    );
  };
`;

if (!code.includes("const renderContact = (contactNo: string | undefined)")) {
  code = code.replace(
    "const handleToggleSelect = (id: string) => {", 
    renderContactFunc + "\\n  const handleToggleSelect = (id: string) => {"
  );
}

// 3. Update the cell
const oldCell = \`{/* Contact No - Admin Only */}
                        {isAdmin && (
                          <td className="py-3 px-3 font-mono text-slate-400 hidden md:table-cell">
                            {d['Contact No'] || '-'}
                          </td>
                        )}\`;
                        
const newCell = \`{/* Contact No - Admin Only */}
                        {isAdmin && (
                          <td className="py-3 px-3 text-center align-middle">
                            {renderContact(d['Contact No'])}
                          </td>
                        )}\`;

code = code.replace(oldCell, newCell);

fs.writeFileSync('src/components/tabs/DonationsTab.tsx', code, 'utf8');
console.log('Patched contact info in DonationsTab');
