const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const smsDispatch = `
        // Send SMS notification if contact number is available
        if (donation['Contact No']) {
          const smsMessage = status === 'Approved' 
            ? \`JazakAllah Khair \${donation['Donor Name'] || 'Donor'}! Your donation of Rs. \${formattedAmount} has been verified and Approved by SWDO.\`
            : \`Dear \${donation['Donor Name'] || 'Donor'}, there is an update regarding your donation of Rs. \${formattedAmount} (Status: \${status}). Please check your email for details.\`;
          await sendSmsNotification(donation['Contact No'], smsMessage);
        }
      } catch (err) {
        console.error("❌ High-speed status update dispatch error:", err);`;

code = code.replace(`      } catch (err) {\n        console.error("❌ High-speed status update dispatch error:", err);`, smsDispatch);

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Patched server.ts successfully');
