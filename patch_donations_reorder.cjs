const fs = require('fs');
let code = fs.readFileSync('src/components/tabs/DonationsTab.tsx', 'utf8');

const contactBlock = `                        {/* Contact No - Admin Only */}
                        {isAdmin && (
                          <td className="py-3 px-3 text-center align-middle">
                            {renderContact(d['Contact No'])}
                          </td>
                        )}`;

const proofBlockStart = `                        {/* Proof Thumbnail - Admin Only */}`;
const proofBlockEnd = `)}
                          </td>
                        )}`;

let startContact = code.indexOf(contactBlock);
let startProof = code.indexOf(proofBlockStart, startContact);
let endProof = code.indexOf(proofBlockEnd, startProof) + proofBlockEnd.length;

if (startContact !== -1 && startProof !== -1) {
    let before = code.substring(0, startContact);
    let contactStr = code.substring(startContact, startProof);
    let proofStr = code.substring(startProof, endProof);
    let after = code.substring(endProof);
    
    // Check if proofStr actually grabbed the right thing.
    if(proofStr.includes("View") || proofStr.includes("ImageIcon")) {
        code = before + proofStr + "\n" + contactStr.trimRight() + "\n" + after;
        fs.writeFileSync('src/components/tabs/DonationsTab.tsx', code, 'utf8');
        console.log("Reordered!");
    } else {
        console.log("Proof string unexpected: ", proofStr);
    }
} else {
    console.log("Could not find start index");
    console.log(startContact, startProof, endProof);
}
