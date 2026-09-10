const nodemailer = require('nodemailer');
async function test() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'swdo.kpk@gmail.com',
      pass: 'skovwfcmuzfsfvxb',
    },
  });
  try {
    let info = await transporter.sendMail({
      from: '"Test" <swdo.kpk@gmail.com>',
      to: 'swdo.kpk@gmail.com',
      subject: 'Test Email',
      text: 'This is a test email',
    });
    console.log("Success:", info.messageId);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
