import express from "express";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const PORT = Number(process.env.PORT) || 3000;

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wnhealllbmvxhxpvgvjm.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduaGVhbGxsYm12eGh4cHZndmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMDM5ODcsImV4cCI6MjEwNDY3OTk4N30.U4YA-7_7VIScGiLm8wkeCmimqJyjBoXYE3GAKIhzDeg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));

  // Health check route for Cloud Run and monitoring
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API routes
  app.post("/api/approve-donation", async (req, res) => {
    const { donationId, adminUsername } = req.body;
    console.log(`Received approval request for: ${donationId} by ${adminUsername}`);
    
    try {
      const { data, error } = await supabase
        .from("donations")
        .update({
          Status: "Approved",
          ApprovedBy: (adminUsername && adminUsername.toLowerCase() !== 'admin') ? adminUsername : "Ali",
          ApprovedAt: new Date().toISOString(),
        })
        .eq("id", donationId);
      
      if (error) {
        console.error(`Supabase update error:`, error);
        return res.status(500).json({ error: error.message });
      }

      console.log("Supabase update successful");
      res.json({ success: true });
    } catch (error) {
      console.error("Backend approval error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to approve donation" });
    }
  });

  // Singleton connection-pooled Nodemailer transporter for maximum speed and zero connection overhead
  let pooledTransporter: any = null;

  async function getSmtpTransporter() {
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
    const smtpUser = process.env.SMTP_USER || "swdo.kpk@gmail.com";
    const smtpPass = process.env.SMTP_PASS || "skovwfcmuzfsfvxb"; // Fallback to verified app password
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "swdo.kpk@gmail.com, khanx3853@gmail.com";

    if (!smtpPass || smtpPass === "MY_SMTP_PASS") {
      console.warn("⚠️ SMTP_PASS is not configured correctly. Email notifications may fail.");
    }

    if (!pooledTransporter) {
      const nodemailer = await import("nodemailer");
      pooledTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        pool: true, // Keep connections alive for high speed
        maxConnections: 5,
        maxMessages: 200,
        rateDelta: 1000,
        rateLimit: 10,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }

    return { transporter: pooledTransporter, smtpUser, adminEmail };
  }

  // Helper to format phone number for Veevo Tech SMS API (e.g. +923001234567)
  function formatPhoneNumberForSms(phone: string): string | null {
    if (!phone) return null;
    let cleaned = phone.trim().replace(/[\s\-\(\)\.,]/g, '');
    if (!cleaned || cleaned.includes('@')) return null;

    // 03XXXXXXXXX -> +923XXXXXXXXX
    if (/^03\d{9}$/.test(cleaned)) {
      return '+92' + cleaned.substring(1);
    }
    // 3XXXXXXXXX -> +923XXXXXXXXX
    if (/^3\d{9}$/.test(cleaned)) {
      return '+92' + cleaned;
    }
    // 923XXXXXXXXX without + -> +923XXXXXXXXX
    if (/^923\d{9}$/.test(cleaned)) {
      return '+' + cleaned;
    }
    // 0092... -> +92...
    if (cleaned.startsWith('00')) {
      return '+' + cleaned.substring(2);
    }
    // Already starting with +
    if (cleaned.startsWith('+')) {
      const digitsOnly = cleaned.substring(1).replace(/\D/g, '');
      if (digitsOnly.length >= 10) return '+' + digitsOnly;
    }
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      return '+92' + digitsOnly.substring(1);
    }
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return '+' + digitsOnly;
    }
    return null;
  }

  // Veevo Tech SMS Dispatcher (oneid.veevotech.com / api.veevotech.com)
  async function sendVeevoSms(options: {
    to: string;
    message: string;
    hash?: string;
    senderNum?: string;
  }) {
    const hash = options.hash || process.env.VEEVOTECH_SMS_HASH || "d9eb3e26f4532bcbbca611804241635a";
    const senderNum = options.senderNum || process.env.VEEVOTECH_SENDER_NUM || "Default";
    const formattedNum = formatPhoneNumberForSms(options.to);

    if (!formattedNum) {
      console.warn("⚠️ [VeevoTech SMS] Skipped: Invalid or missing phone number:", options.to);
      return { success: false, error: "Invalid phone number format" };
    }

    try {
      const url = new URL("https://api.veevotech.com/v3/sendsms");
      url.searchParams.set("hash", hash);
      url.searchParams.set("receivernum", formattedNum);
      url.searchParams.set("receivernetwork", "Receiver_Network");
      url.searchParams.set("textmessage", options.message);
      url.searchParams.set("sendernum", senderNum);

      console.log(`📱 [VeevoTech SMS] Dispatching to ${formattedNum}...`);
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      const data: any = await response.json().catch(async () => {
        const text = await response.text();
        return { raw: text };
      });

      const isSuccess = data && data.STATUS === "SUCCESSFUL";
      const logRecord = {
        id: 'sms_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        recipient: formattedNum,
        message: options.message,
        type: (options as any).type || "Automated SMS",
        status: isSuccess ? "Delivered" : "Failed",
        timestamp: new Date().toISOString(),
        response: JSON.stringify(data || {})
      };
      try {
        const { error: insertErr } = await supabase.from("sms_logs").insert(logRecord);
        if (insertErr) {
          // Ignore missing table error
          console.log("ℹ️ sms_logs table note:", insertErr.message || insertErr);
        }
      } catch (logErr) {
        // Suppress
      }

      if (isSuccess) {
        console.log(`✅ [VeevoTech SMS] Delivered to ${formattedNum}. MsgID: ${data.MESSAGE_ID}, Charged: ${data.CHARGED_BALANCE}`);
        return { success: true, messageId: data.MESSAGE_ID, charged: data.CHARGED_BALANCE, data };
      } else {
        const isLowBalance = data?.ERROR_FILTER === "LOW_BALANCE" || data?.ERROR_CODE === "TAPI-149730721";
        const errorDesc = isLowBalance
          ? "Veevo Tech account balance exhausted (LOW_BALANCE). Please recharge credits at oneid.veevotech.com to resume SMS dispatches."
          : (data?.ERROR_DESCRIPTION || data?.ERROR_FILTER || "SMS transmission failed");

        if (isLowBalance) {
          console.warn(`⚠️ [VeevoTech SMS] Gateway low balance notice for ${formattedNum}: Recharge required at oneid.veevotech.com`);
        } else {
          console.warn(`⚠️ [VeevoTech SMS] Gateway status for ${formattedNum}: ${errorDesc}`);
        }

        return {
          success: false,
          lowBalance: isLowBalance,
          error: errorDesc,
          data
        };
      }
    } catch (err: any) {
      console.warn(`⚠️ [VeevoTech SMS] Network/API exception for ${formattedNum}:`, err.message || err);
      
      const failRecord = {
        id: 'sms_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        recipient: formattedNum,
        message: options.message,
        type: (options as any).type || "Automated SMS",
        status: "Failed",
        timestamp: new Date().toISOString(),
        response: JSON.stringify({ error: err.message || "Failed to reach Veevo Tech gateway" })
      };
      try {
        await supabase.from("sms_logs").insert(failRecord);
      } catch (logErr) {
        // Suppress
      }

      return { success: false, error: err.message || "Failed to reach Veevo Tech gateway" };
    }
  }

  // Helper to ensure clean SMS text while preserving Urdu/Arabic script
  function sanitizeForGsmSms(text: string): string {
    if (!text) return "";
    return text
      .replace(/[()]/g, '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\s+/g, ' ')
      .trim();
  }

  // API route to send email and automated SMS when new donation is submitted
  app.post("/api/notify-donation", async (req, res) => {
    const donation = req.body;
    const origin = req.headers.origin || req.headers.referer || "";
    const baseUrl = process.env.APP_URL || (origin.endsWith('/') ? origin.slice(0, -1) : origin) || "https://ais-dev-oeeigrz5owddw4vhrihztj-539654624355.asia-southeast1.run.app";
    
    console.log("⚡ High-speed donation notification triggered:", donation['Donor Name']);

    let smsResult: any = null;

    // 1. Automated SMS dispatch to donor via Veevo Tech
    if (donation['Contact No'] && donation.SendSms !== false) {
      try {
        const rawName = (donation['Donor Name'] || 'Contributor').trim();
        const donorName = sanitizeForGsmSms(rawName) || 'Valued Donor';
        const amount = Number(donation.Amount || 0).toLocaleString();
        const txn = donation['Transaction ID'] || 'N/A';
        const org = "SWDO Welfare (Reg# 5514)";

        let smsBody = donation.SmsSubmissionTemplate ||
          `Dear {donor}, thank you for donating Rs. {amount} to {org}. Trx: {txn}. Received for verification. May Allah reward you!`;

        smsBody = smsBody
          .replace(/\{donor\}/gi, donorName)
          .replace(/\{amount\}/gi, amount)
          .replace(/\{txn\}/gi, txn)
          .replace(/\{org\}/gi, org);

        smsBody = sanitizeForGsmSms(smsBody);

        smsResult = await sendVeevoSms({
          to: donation['Contact No'],
          message: smsBody,
          hash: donation.VeevoSmsHash,
          senderNum: donation.VeevoSenderNum,
          type: "Donation Submission"
        } as any);
      } catch (smsErr) {
        console.warn("⚠️ Error in automatic SMS dispatch:", smsErr);
        smsResult = { success: false, error: (smsErr as any).message || "SMS failed" };
      }
    }

    // Send instant response with accurate SMS dispatch status
    res.json({
      success: true,
      status: "processed",
      sms: smsResult ? {
        sent: smsResult.success,
        lowBalance: !!smsResult.lowBalance,
        error: smsResult.error,
        messageId: smsResult.messageId
      } : null
    });

    // 2. Email dispatch via pooled SMTP connection in background (non-blocking)
    (async () => {
      try {
        const result = await getSmtpTransporter();
        if (!result) return;
        const { transporter, smtpUser, adminEmail } = result;

        const attachments = [];
        if (donation.ProofImage && typeof donation.ProofImage === 'string' && donation.ProofImage.startsWith('data:image/')) {
          const matches = donation.ProofImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const ext = matches[1].split('/')[1].replace('+xml', '');
            attachments.push({
              filename: `payment-proof-${donation['Transaction ID'] || 'receipt'}.${ext}`,
              content: Buffer.from(matches[2], 'base64'),
            });
          }
        }

        const donorEmail = (donation.DonorEmail || donation['Donor Email'] || donation.Email || '').trim();
        const donorContact = donation['Contact No'] || donorEmail || 'N/A';
        const formattedAmount = Number(donation.Amount || 0).toLocaleString();

        const mailOptions: any = {
          from: `"SWDO Relief Portal" <${smtpUser}>`,
          to: adminEmail,
          subject: `🔔 New Donation Alert: Rs. ${formattedAmount} from ${donation['Donor Name'] || 'Contributor'}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; color: #f8fafc; }
                .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                .header { background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 24px; text-align: center; }
                .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
                .header p { margin: 6px 0 0 0; color: #a7f3d0; font-size: 13px; font-weight: 500; }
                .content { padding: 28px; }
                .alert-badge { display: inline-block; background: #065f46; color: #34d399; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; border: 1px solid #059669; }
                .amount-card { background: #0f172a; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #334155; margin-bottom: 24px; }
                .amount-label { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 4px; }
                .amount-value { color: #10b981; font-size: 32px; font-weight: 800; font-family: monospace; }
                .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                .details-table td { padding: 12px 0; border-bottom: 1px solid #334155; font-size: 14px; }
                .details-table td.label { color: #94a3b8; font-weight: 600; width: 40%; }
                .details-table td.value { color: #f8fafc; font-weight: 500; }
                .button { display: block; width: 100%; box-sizing: border-box; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; text-align: center; padding: 14px 24px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 15px; shadow: 0 4px 12px rgba(16,185,129,0.3); }
                .footer { padding: 20px; text-align: center; border-top: 1px solid #334155; font-size: 12px; color: #64748b; background: #0f172a; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Shangla Welfare & Development Organisation</h1>
                  <p>SWDO Relief & Public Service Portal</p>
                </div>
                <div class="content">
                  <div class="alert-badge">Pending Review Alert</div>
                  <h2 style="margin: 0 0 12px 0; color: #f8fafc; font-size: 18px;">New Donation Submitted</h2>
                  <p style="color: #94a3b8; font-size: 14px; line-height: 1.5; margin-top: 0;">
                    A new donation has been submitted via the portal and is awaiting verification in the Admin Dashboard:
                  </p>

                  <div class="amount-card">
                    <div class="amount-label">Submitted Contribution</div>
                    <div class="amount-value">Rs. ${formattedAmount}</div>
                  </div>

                  <table class="details-table">
                    <tr><td class="label">Donor Name</td><td class="value">${donation['Donor Name'] || 'Anonymous'}</td></tr>
                    <tr><td class="label">Contact / Email</td><td class="value">${donorContact}</td></tr>
                    <tr><td class="label">Transaction ID</td><td class="value" style="font-family: monospace; color: #a7f3d0;">${donation['Transaction ID'] || 'N/A'}</td></tr>
                    <tr><td class="label">Cause / Remarks</td><td class="value">${donation.Remarks || 'General Fund'}</td></tr>
                    <tr><td class="label">Submission Date</td><td class="value">${donation.Date || new Date().toISOString().split('T')[0]}</td></tr>
                    <tr><td class="label">Status</td><td class="value"><span style="color: #fbbf24; font-weight: bold;">⏳ Pending Admin Approval</span></td></tr>
                  </table>

                  <a href="${baseUrl}" class="button">Review & Approve in Admin Portal</a>
                </div>
                <div class="footer">
                  Shangla Welfare & Development Organisation • District Shangla, KP, Pakistan<br>
                  Automated High-Speed Notification Service
                </div>
              </div>
            </body>
            </html>
          `,
          ...(attachments.length > 0 ? { attachments } : {}),
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Admin email notification sent successfully to ${adminEmail}`);

        if (donorEmail && donorEmail.includes('@')) {
          const donorMailOptions: any = {
            from: `"Shangla Welfare Org" <${smtpUser}>`,
            to: donorEmail,
            subject: `🌸 Donation Received (Pending Verification) - Rs. ${formattedAmount} • SWDO Portal`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
                  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
                  .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 28px; text-align: center; color: #ffffff; }
                  .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
                  .header p { margin: 6px 0 0 0; color: #a7f3d0; font-size: 13px; font-weight: 500; }
                  .content { padding: 32px 28px; }
                  .status-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px; }
                  .status-badge { display: inline-block; background: #fef3c7; color: #b45309; font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 9999px; margin-bottom: 8px; border: 1px solid #fde68a; }
                  .amount-val { color: #059669; font-size: 32px; font-weight: 800; font-family: monospace; }
                  .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                  .details-table td { padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
                  .details-table td.label { color: #64748b; font-weight: 600; width: 40%; }
                  .details-table td.value { color: #0f172a; font-weight: 600; }
                  .footer { padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; background: #f8fafc; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Shangla Welfare & Development Org</h1>
                    <p>District Shangla, Khyber Pakhtunkhwa, Pakistan</p>
                  </div>
                  <div class="content">
                    <div style="text-align: center;">
                      <span class="status-badge">⏳ Received • Pending Verification</span>
                    </div>
                    <h2 style="margin: 8px 0 16px 0; color: #0f172a; font-size: 20px; text-align: center;">Assalamu Alaikum, ${donation['Donor Name'] || 'Valued Donor'}!</h2>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 0; text-align: center;">
                      Thank you for submitting your generous contribution to Shangla Welfare & Development Organisation. We have received your payment transfer proof and transaction reference.
                    </p>

                    <div class="status-card">
                      <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px;">Submitted Amount</div>
                      <div class="amount-val">Rs. ${formattedAmount}</div>
                    </div>

                    <table class="details-table">
                      <tr><td class="label">Donor Name</td><td class="value">${donation['Donor Name'] || 'Anonymous'}</td></tr>
                      <tr><td class="label">Transaction Reference</td><td class="value" style="font-family: monospace; color: #059669;">${donation['Transaction ID'] || 'N/A'}</td></tr>
                      <tr><td class="label">Cause / Remarks</td><td class="value">${donation.Remarks || 'General Welfare Fund'}</td></tr>
                      <tr><td class="label">Submission Date</td><td class="value">${donation.Date || new Date().toISOString().split('T')[0]}</td></tr>
                      <tr><td class="label">Verification Status</td><td class="value"><span style="color: #d97706; font-weight: bold;">⏳ Awaiting Admin Approval</span></td></tr>
                    </table>

                    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; font-size: 13px; color: #1e40af; line-height: 1.5;">
                      <strong>Note:</strong> Our administrative team is currently verifying the transfer. Once verified, you will receive an official verified receipt via email, and your contribution will be published on the audit ledger.
                    </div>
                  </div>
                  <div class="footer">
                    Shangla Welfare & Development Organisation (Reg # 5514)<br>
                    Official Welfare Portal • District Shangla, KP<br>
                    May Allah reward you abundantly for your generosity!
                  </div>
                </div>
              </body>
              </html>
            `,
          };

          await transporter.sendMail(donorMailOptions);
          console.log(`✅ Donor confirmation email sent successfully to ${donorEmail}`);
        }

      } catch (err) {
        console.error("❌ High-speed admin notification dispatch error:", err);
      }
    })();
  });

  // API route to send automated SMS when beneficiary is saved/registered
  app.post("/api/notify-beneficiary", async (req, res) => {
    const beneficiary = req.body;
    console.log("⚡ High-speed beneficiary SMS notification triggered:", beneficiary['Beneficiary Name']);

    let smsResult: any = null;

    if (beneficiary['Contact No'] && beneficiary.SendSms !== false) {
      try {
        const rawName = (beneficiary['Beneficiary Name'] || 'Beneficiary').trim();
        const benName = sanitizeForGsmSms(rawName) || 'Valued Beneficiary';
        const amount = Number(beneficiary.Amount || 0).toLocaleString();
        const purpose = (beneficiary.Purpose || 'Relief Aid').trim();
        const txn = beneficiary['Transaction ID'] || 'N/A';
        const org = "Shangla Welfare & Development Org (REG# 5514)";

        let smsBody = beneficiary.SmsBeneficiaryTemplate ||
          `Assalamu Alaikum {beneficiary},\n\nAlhamdulillah! {purpose} ke liye aap ki manzoree shuda raqam Rs. {amount} aap ko bhej di gayi hai.\nTransaction Ref: {txn}\nBhejne wala: {org}\n\nAllah is mein barkat de aur aap ke liye asaniyan paida farmaye. Ameen`;

        smsBody = smsBody
          .replace(/\{beneficiary\}/gi, benName)
          .replace(/\{فائدہ کنندہ\}/gi, benName)
          .replace(/\{amount\}/gi, amount)
          .replace(/\{purpose\}/gi, purpose)
          .replace(/\{txn\}/gi, txn)
          .replace(/\{org\}/gi, org);

        smsBody = sanitizeForGsmSms(smsBody);

        smsResult = await sendVeevoSms({
          to: beneficiary['Contact No'],
          message: smsBody,
          hash: beneficiary.VeevoSmsHash,
          senderNum: beneficiary.VeevoSenderNum,
          type: "Relief Registration"
        } as any);
      } catch (smsErr) {
        console.warn("⚠️ Error in automatic Beneficiary SMS dispatch:", smsErr);
        smsResult = { success: false, error: (smsErr as any).message || "SMS failed" };
      }
    }

    res.json({
      success: true,
      status: "processed",
      sms: smsResult ? {
        sent: smsResult.success,
        lowBalance: !!smsResult.lowBalance,
        error: smsResult.error,
        messageId: smsResult.messageId
      } : null
    });
  });

  // API route to send email notification to donor (and admin) when status changes to Approved or Rejected
  app.post("/api/notify-donor-status", async (req, res) => {
    const { donation, status, reason } = req.body;
    console.log(`⚡ High-speed donor status change alert (${status}):`, donation?.id);

    if (!donation) {
      return res.status(400).json({ error: "Donation payload missing" });
    }

    // Return instant HTTP response
    res.json({ success: true, status, queued: true });

    // Process email sending in non-blocking background task
    (async () => {
      try {
        const result = await getSmtpTransporter();
        if (!result) return;
        const { transporter, smtpUser, adminEmail } = result;

        let targetEmail = donation.DonorEmail || donation.Email || "";
        if (!targetEmail && donation['Contact No'] && donation['Contact No'].includes('@')) {
          targetEmail = donation['Contact No'].trim();
        }

        const isApproved = status === 'Approved';
        const formattedAmount = Number(donation.Amount || 0).toLocaleString();

        const subject = isApproved
          ? `✅ Donation Receipt Verified: Rs. ${formattedAmount} - SWDO Relief Portal`
          : `⚠️ Donation Verification Status Update - Reference ${donation['Transaction ID'] || 'Receipt'}`;

        const bodyHtml = isApproved ? `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #0f172a; }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 28px; text-align: center; color: #ffffff; }
              .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
              .header p { margin: 6px 0 0 0; color: #a7f3d0; font-size: 13px; font-weight: 500; }
              .content { padding: 32px 28px; }
              .receipt-box { background: #f8fafc; border: 2px dashed #10b981; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
              .receipt-title { color: #059669; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
              .receipt-amount { color: #0f172a; font-size: 34px; font-weight: 800; font-family: monospace; }
              .receipt-badge { display: inline-block; background: #d1fae5; color: #047857; font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 9999px; margin-top: 10px; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
              .table td { padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
              .table td.label { color: #64748b; font-weight: 600; width: 40%; }
              .table td.value { color: #0f172a; font-weight: 600; }
              .button { display: block; width: 100%; box-sizing: border-box; background: #059669; color: #ffffff !important; text-align: center; padding: 14px 24px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 15px; }
              .footer { padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; background: #f8fafc; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Shangla Welfare & Development Organisation</h1>
                <p>Official Relief & Development Receipt</p>
              </div>
              <div class="content">
                <p style="font-size: 16px; font-weight: 700; margin-top: 0;">Dear ${donation['Donor Name'] || 'Valued Supporter'},</p>
                <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                  JazakAllah Khair! We are grateful to confirm that your donation submission has been verified and <strong>Approved</strong> by SWDO management.
                </p>

                <div class="receipt-box">
                  <div class="receipt-title">Verified Donation Receipt</div>
                  <div class="receipt-amount">Rs. ${formattedAmount}</div>
                  <div class="receipt-badge">✓ Status: Approved & Recorded in Ledger</div>
                </div>

                <table class="table">
                  <tr><td class="label">Transaction Reference</td><td class="value" style="font-family: monospace; color: #059669;">${donation['Transaction ID'] || 'N/A'}</td></tr>
                  <tr><td class="label">Donor Name</td><td class="value">${donation['Donor Name'] || 'Anonymous'}</td></tr>
                  <tr><td class="label">Cause / Purpose</td><td class="value">${donation.Remarks || 'General Relief Fund'}</td></tr>
                  <tr><td class="label">Date Verified</td><td class="value">${donation.Date || new Date().toISOString().split('T')[0]}</td></tr>
                  ${donation.ApprovedBy ? `<tr><td class="label">Approved By</td><td class="value" style="color: #059669; font-weight: bold;">${donation.ApprovedBy}</td></tr>` : ''}
                </table>

                <p style="color: #475569; font-size: 13px; line-height: 1.6;">
                  Your contribution is now published in our public ledger and is actively providing medical relief, education support, and food aid to underprivileged families in District Shangla.
                </p>

                <a href="https://www.shanglawelfare.org" class="button">View Live Public Ledger</a>
              </div>
              <div class="footer">
                May Allah (SWT) reward you abundantly for your generous contribution!<br>
                Shangla Welfare & Development Organisation • Contact: 0347-2021703
              </div>
            </div>
          </body>
          </html>
        ` : `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #0f172a; }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 28px; text-align: center; color: #ffffff; }
              .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
              .content { padding: 32px 28px; }
              .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 20px 0; }
              .footer { padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; background: #f8fafc; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Shangla Welfare & Development Organisation</h1>
              </div>
              <div class="content">
                <p style="font-size: 16px; font-weight: 700; margin-top: 0;">Dear ${donation['Donor Name'] || 'Valued Supporter'},</p>
                <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                  We are writing to update you regarding your donation submission reference <strong style="font-family: monospace;">${donation['Transaction ID'] || 'N/A'}</strong> for <strong>Rs. ${formattedAmount}</strong>.
                </p>

                <div class="alert-box">
                  <p style="margin: 0; color: #991b1b; font-weight: 800; font-size: 15px;">Status: Review Declined / Rejected</p>
                  ${reason ? `<p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 13px;"><strong>Reason / Notes:</strong> ${reason}</p>` : ''}
                </div>

                <p style="color: #475569; font-size: 13px; line-height: 1.6;">
                  If you believe this was in error, or if you wish to upload a clearer proof of payment, please reach out to our team or re-submit via the portal.
                </p>
              </div>
              <div class="footer">
                SWDO Administration • Support Email: ${adminEmail} • Helpline: 0347-2021703
              </div>
            </div>
          </body>
          </html>
        `;

        const recipients = [];
        if (targetEmail) recipients.push(targetEmail);
        if (adminEmail && !recipients.includes(adminEmail)) recipients.push(adminEmail);

        if (recipients.length > 0) {
          await transporter.sendMail({
            from: `"SWDO Relief Portal" <${smtpUser}>`,
            to: recipients.join(', '),
            subject,
            html: bodyHtml,
          });
          console.log(`✅ Status update email sent for ${status} to ${recipients.join(', ')}`);
        }

        // Send automated SMS to donor upon approval
        if (isApproved && donation['Contact No'] && donation.SendSms !== false) {
          try {
            const rawName = (donation['Donor Name'] || 'Contributor').trim();
            const donorName = sanitizeForGsmSms(rawName) || 'Valued Donor';
            const amount = Number(donation.Amount || 0).toLocaleString();
            const txn = donation['Transaction ID'] || 'N/A';
            const purpose = (donation.Remarks || 'General Relief Fund').trim();
            const org = "Shangla Welfare & Development Org (REG# 5514)";

            let approvalSms = donation.SmsApprovalTemplate ||
              `Assalamu Alaikum {donor},

JazakAllahu Khair!
Aap ki bheji hui raqam Rs. {amount} {purpose} ke liye humein mil gayi hai. Ref: {txn}

Allah aap ke is sadqa ko qubool farmaye, aap ke rizq mein izafa kare aur aap ko dono jahan ki bhalai ata kare. Ameen 🤲

{org}`;

            approvalSms = approvalSms
              .replace(/\{donor\}/gi, donorName)
              .replace(/\{عطیہ کنندہ\}/gi, donorName)
              .replace(/\{amount\}/gi, amount)
              .replace(/\{purpose\}/gi, purpose)
              .replace(/\{مقصد\}/gi, purpose)
              .replace(/\{txn\}/gi, txn)
              .replace(/\{org\}/gi, org);

            approvalSms = sanitizeForGsmSms(approvalSms);

            await sendVeevoSms({
              to: donation['Contact No'],
              message: approvalSms,
              hash: donation.VeevoSmsHash,
              senderNum: donation.VeevoSenderNum,
              type: "Donation Approval"
            } as any);
          } catch (smsErr) {
            console.warn("⚠️ Error sending status update SMS:", smsErr);
          }
        }

      } catch (err) {
        console.warn("⚠️ Status update notification dispatch notice:", err);
      }
    })();
  });

  // Dedicated API endpoint to send SMS via Veevo Tech
  app.post("/api/send-sms", async (req, res) => {
    const { to, message, hash, senderNum } = req.body;
    if (!to || !message) {
      return res.status(400).json({ success: false, error: "Recipient phone number ('to') and 'message' are required" });
    }

    const result = await sendVeevoSms({ to, message, hash, senderNum });
    if (result.success) {
      res.json({ success: true, messageId: result.messageId, charged: result.charged });
    } else {
      res.json({
        success: false,
        lowBalance: !!result.lowBalance,
        error: result.error,
        data: result.data
      });
    }
  });

  // Test SMS route e.g. /api/test-sms?to=+923001234567
  app.get("/api/test-sms", async (req, res) => {
    const targetPhone = (req.query.to as string) || "";
    if (!targetPhone) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required query parameter: 'to' (e.g. /api/test-sms?to=+923001234567 or 0347xxxxxxx)" 
      });
    }

    const testMessage = `SWDO Welfare Portal: Veevo Tech SMS Gateway test successful! Time: ${new Date().toLocaleTimeString('en-US', { hour12: true })}`;
    const result = await sendVeevoSms({
      to: targetPhone,
      message: testMessage,
      hash: req.query.hash as string,
      senderNum: req.query.sender as string
    });

    if (result.success) {
      res.json({ 
        success: true, 
        message: `Test SMS delivered to ${targetPhone} successfully!`, 
        messageId: result.messageId,
        charged: result.charged 
      });
    } else {
      res.json({
        success: false,
        lowBalance: !!result.lowBalance,
        error: result.error,
        data: result.data
      });
    }
  });

  // Test email route supporting target address query parameter e.g. /api/test-email?to=user@email.com
  app.get("/api/test-email", async (req, res) => {
    const targetEmail = (req.query.to as string) || process.env.ADMIN_NOTIFICATION_EMAIL || "swdo.kpk@gmail.com";

    try {
      const result = await getSmtpTransporter();
      if (!result) {
        res.status(503).json({ success: false, error: 'Email service not configured' });
        return;
      }
      const { transporter, smtpUser, adminEmail } = result;

      await transporter.sendMail({
        from: `"SWDO Relief Portal" <${smtpUser}>`,
        to: targetEmail,
        subject: "⚡ SWDO Portal High-Speed Test Email",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 2px solid #10b981; border-radius: 12px; background: #0f172a; color: #ffffff; text-align: center;">
            <h2 style="color: #34d399; margin: 0 0 10px 0;">⚡ High-Speed Email Service Verified!</h2>
            <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
              This test confirms that your connection-pooled SMTP service is active and delivering emails instantly.
            </p>
            <div style="background: #1e293b; padding: 12px; border-radius: 8px; font-family: monospace; color: #a7f3d0; font-size: 13px;">
              Delivered to: ${targetEmail}<br>
              SMTP Account: ${smtpUser}<br>
              Server Time: ${new Date().toLocaleString()}
            </div>
          </div>
        `,
      });

      console.log(`✅ Test email delivered successfully to ${targetEmail}`);
      res.json({ success: true, message: `High-speed test email delivered successfully to ${targetEmail}!` });
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to send test email" });
    }
  });

  // Serve Google AdSense ads.txt
  app.get("/ads.txt", (req, res) => {
    res.type("text/plain");
    res.send("google.com, pub-6372292848734846, DIRECT, f08c47fec0942fa0\n");
  });

  // Vite middleware for development vs static files for production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server startup error:", err);
  process.exit(1);
});
