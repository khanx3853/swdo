const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Remove Twilio import
code = code.replace('import twilio from "twilio";\n', '');
code = code.replace('import twilio from "twilio";', '');

const twilioHelperRegex = /\/\/ Twilio Configuration[\s\S]*?async function sendSmsNotification\(to, message\) \{[\s\S]*?\/\/ API route to send email notification to admin when new donation is submitted/;

const birdHelper = `// Bird (MessageBird) Configuration
  async function sendSmsNotification(to, message) {
    const apiKey = process.env.BIRD_API_KEY;
    const originator = process.env.BIRD_ORIGINATOR || 'SWDO';
    
    if (!apiKey) {
      console.log("Bird API Key not configured, skipping SMS notification");
      return false;
    }
    
    try {
      // Clean phone number: remove spaces, dashes, etc. Keep leading + and digits.
      const formattedTo = to.replace(/(?!^\\+)[^\\d]/g, '');
      if (!formattedTo.startsWith('+') || formattedTo.length < 8) {
        console.log("Invalid phone number format for SMS, skipping:", formattedTo);
        return false;
      }
      
      const response = await fetch('https://rest.messagebird.com/messages', {
        method: 'POST',
        headers: {
          'Authorization': \`AccessKey \${apiKey}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originator: originator,
          recipients: [formattedTo],
          body: message
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("❌ Bird SMS API error:", errorData);
        return false;
      }

      console.log(\`✅ SMS sent successfully via Bird to \${formattedTo}\`);
      return true;
    } catch (error) {
      console.error("❌ SMS notification error:", error.message || error);
      return false;
    }
  }

  // API route to send email notification to admin when new donation is submitted`;

code = code.replace(twilioHelperRegex, birdHelper);

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Patched server.ts for Bird');
