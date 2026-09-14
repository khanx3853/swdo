const https = require('https');
const apiKey = process.env.BIRD_API_KEY;

const payload = {
  to: "+923472021703", // Admin number for testing
  from: "SWDO",
  text: "Hello from SWDO! If you receive this, your sender ID is configured.",
  category: "transactional"
};

const options = {
  hostname: 'us1.platform.bird.com',
  port: 443,
  path: '/v1/sms/messages',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 202) {
      console.log("SUCCESS: Sender ID is configured and message sent!");
    } else {
      try {
        const error = JSON.parse(data);
        if (error.error && error.error.code === 'E12056') {
          console.log("NOT_CONFIGURED: Sender ID 'SWDO' is not yet configured.");
        } else {
          console.log("OTHER_ERROR: " + data);
        }
      } catch (e) {
        console.log("UNKNOWN_ERROR: " + data);
      }
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.end(JSON.stringify(payload));
