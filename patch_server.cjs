const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Add twilio import
code = code.replace(
  'import { createClient } from "@supabase/supabase-js";',
  'import { createClient } from "@supabase/supabase-js";\nimport twilio from "twilio";'
);

// 2. Add Twilio client and helper before /api/notify-donation
const twilioHelper = `
  // Twilio Configuration
  let twilioClient = null;
  function getTwilioClient() {
    if (!twilioClient) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (accountSid && authToken) {
        twilioClient = twilio(accountSid, authToken);
      }
    }
    return twilioClient;
  }

  async function sendSmsNotification(to, message) {
    const client = getTwilioClient();
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!client || !from) {
      console.log("Twilio not configured, skipping SMS notification");
      return false;
    }
    try {
      // Clean phone number: remove spaces, dashes, etc. Keep leading + and digits.
      const formattedTo = to.replace(/(?!^\\+)[^\\d]/g, '');
      if (!formattedTo.startsWith('+') || formattedTo.length < 8) {
        console.log("Invalid phone number format for SMS, skipping:", formattedTo);
        return false;
      }
      
      await client.messages.create({
        body: message,
        from,
        to: formattedTo
      });
      console.log(\`✅ SMS sent successfully to \${formattedTo}\`);
      return true;
    } catch (error) {
      console.error("❌ SMS notification error:", error.message || error);
      return false;
    }
  }

  // API route to send email notification to admin when new donation is submitted`;

code = code.replace('  // API route to send email notification to admin when new donation is submitted', twilioHelper);

// 3. Add SMS dispatch inside /api/notify-donation
const smsDispatch = `
        // Send SMS notification if contact number is available
        if (donation['Contact No']) {
          const smsMessage = \`Assalamu Alaikum \${donation['Donor Name'] || 'Donor'},\n\nWe have received your donation of Rs. \${formattedAmount} to SWDO.\nTransaction ID: \${donation['Transaction ID'] || 'N/A'}\n\nIt is currently pending verification. JazakAllah Khair!\`;
          await sendSmsNotification(donation['Contact No'], smsMessage);
        }
      } catch (err) {`;

code = code.replace('      } catch (err) {', smsDispatch);

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Patched server.ts successfully');
