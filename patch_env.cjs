const fs = require('fs');

let code = fs.readFileSync('.env.example', 'utf8');
code = code.replace(/# Bird \(MessageBird\) SMS Configuration[\s\S]*BIRD_ORIGINATOR=SWDO\n?/g, '');
fs.writeFileSync('.env.example', code, 'utf8');
console.log('Removed SMS from .env.example');
