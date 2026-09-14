const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const newBirdHelper = `// Bird SMS API Configuration
  async function sendSmsNotification(to, message) {
    const apiKey = process.env.BIRD_API_KEY;
    const originator = process.env.BIRD_ORIGINATOR || 'SWDO';
    
    if (!apiKey) {
      console.log("Bird API Key not configured, skipping SMS notification");
      return false;
    }
    
    try {
      const formattedTo = to.replace(/(?!^\\+)[^\\d]/g, '');
      if (!formattedTo.startsWith('+') || formattedTo.length < 8) {
        console.log("Invalid phone number format for SMS, skipping:", formattedTo);
        return false;
      }
      
      const response = await fetch('https://us1.platform.bird.com/v1/sms/messages', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${apiKey}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: formattedTo,
          from: originator,
          text: message,
          category: "transactional"
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

const birdHelperRegex = /\/\/ Bird \(MessageBird\) Configuration[\s\S]*?\/\/ API route to send email notification to admin when new donation is submitted/;

code = code.replace(birdHelperRegex, newBirdHelper);
fs.writeFileSync('server.ts', code, 'utf8');
console.log('Patched server.ts with correct Bird v1 API payload');
