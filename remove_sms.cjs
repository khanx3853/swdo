const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Remove Bird SMS API Configuration block
const birdHelperRegex = /\/\/ Bird SMS API Configuration[\s\S]*?\/\/ API route to send email notification to admin when new donation is submitted/;
code = code.replace(birdHelperRegex, '// API route to send email notification to admin when new donation is submitted');

// 2. Remove SMS dispatch in notify-donation
const notifyDonationSms = `
        // Send SMS notification if contact number is available
        if (donation['Contact No']) {
          const smsMessage = \`Assalamu Alaikum \${donation['Donor Name'] || 'Donor'},\n\nWe have received your donation of Rs. \${formattedAmount} to SWDO.\nTransaction ID: \${donation['Transaction ID'] || 'N/A'}\n\nIt is currently pending verification. JazakAllah Khair!\`;
          await sendSmsNotification(donation['Contact No'], smsMessage);
        }`;
code = code.replace(notifyDonationSms, '');

// 3. Remove SMS dispatch in notify-donor-status
const notifyDonorStatusSms = `
        // Send SMS notification if contact number is available
        if (donation['Contact No']) {
          const smsMessage = status === 'Approved' 
            ? \`JazakAllah Khair \${donation['Donor Name'] || 'Donor'}! Your donation of Rs. \${formattedAmount} has been verified and Approved by SWDO.\`
            : \`Dear \${donation['Donor Name'] || 'Donor'}, there is an update regarding your donation of Rs. \${formattedAmount} (Status: \${status}). Please check your email for details.\`;
          await sendSmsNotification(donation['Contact No'], smsMessage);
        }`;
code = code.replace(notifyDonorStatusSms, '');

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Removed SMS automation from server.ts');
