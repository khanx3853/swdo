const https = require('https');
const apiKey = process.env.BIRD_API_KEY;

const payload = {
  to: "+923472021703",
  from: "SWDO",
  text: "Hello from SWDO Portal!",
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
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response: ${data}`);
  });
});
req.end(JSON.stringify(payload));
