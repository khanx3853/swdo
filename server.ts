import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const PORT = 3000;

// Initialize Supabase Client
const extractRealValue = (val: any, preferUrl = false): string => {
  if (!val || typeof val !== 'string') return '';
  let trimmed = val.trim();
  trimmed = trimmed.replace(/^["'\[\(]+|["'\]\)]+$/g, '').trim();

  if (preferUrl) {
    const urlPattern = /https?:\/\/[a-z0-9\.\-]+(?:\/[^\s,;]*)?/i;
    const urlMatches = trimmed.match(urlPattern);
    if (urlMatches) {
      let url = urlMatches[0].replace(/\/+$/, '');
      if (url.endsWith('/rest/v1')) {
        url = url.substring(0, url.length - 8);
      }
      return url;
    }
    return trimmed;
  }

  const segments = trimmed.split(/[\s,;]+/);
  let bestKey = '';

  for (const segment of segments) {
    const dots = segment.split('.');
    for (let i = 0; i < dots.length; i++) {
      let potential = '';
      if (dots[i].startsWith('eyJhbGci') && i + 2 < dots.length) {
        potential = `${dots[i]}.${dots[i+1]}.${dots[i+2]}`;
      } else if (dots[i].startsWith('eyJpc3Mi') && i + 1 < dots.length) {
        potential = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${dots[i]}.${dots[i+1]}`;
      }

      if (potential.length > 100) {
        if (potential.includes('cm9sZSI6InNlcnZpY2Vfcm9sZS') || potential.includes('InJvbGUiOiJzZXJ2aWNlX3JvbGUi')) {
          return potential;
        }
        bestKey = potential;
      }
    }
  }

  return bestKey || trimmed;
};

const getValidUrl = (url: string | undefined): string => {
  const fallback = 'https://wnhealllbmvxhxpvgvjm.supabase.co';
  const realUrl = extractRealValue(url, true);
  if (!realUrl) return fallback;
  
  let trimmed = realUrl;
  if (/^[a-z0-9]{20}$/.test(trimmed)) {
    return `https://${trimmed}.supabase.co`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
    return parsed.origin;
  } catch (e) {
    return fallback;
  }
};

const isEnvSet = (val: any): boolean => {
  const trimmed = extractRealValue(val);
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false;
  if (trimmed.startsWith('http')) return trimmed.length > 15;
  if (trimmed.startsWith('eyJ')) return trimmed.length > 100;
  if (/^[a-z0-9]{20}$/.test(trimmed)) return true;
  return false;
};

const supabaseUrlFromEnv = process.env.VITE_SUPABASE_URL;
const supabaseAnonKeyFromEnv = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKeyFromEnv = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = isEnvSet(supabaseUrlFromEnv) && (isEnvSet(supabaseAnonKeyFromEnv) || isEnvSet(supabaseServiceKeyFromEnv));

const supabaseUrl = getValidUrl(supabaseUrlFromEnv);
const supabaseAnonKey = extractRealValue(supabaseAnonKeyFromEnv);
const supabaseServiceKey = extractRealValue(supabaseServiceKeyFromEnv);

if (!isSupabaseConfigured) {
  console.warn('Backend Supabase credentials missing or invalid. Server will run in offline/demo mode.');
}

// Use Service Role key on backend if available to bypass RLS, otherwise fallback to anon
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'
);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));

  // Health check route for Cloud Run and monitoring
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", live: true, timestamp: Date.now() });
  });

  app.get("/api/system-status", async (req, res) => {
    res.json({
      status: "ok",
      live: true,
      backend: "active",
      supabaseConfigured: isSupabaseConfigured,
      timestamp: Date.now()
    });
  });

  // Generic persistent data store helper
  function getStoredCollection(fileName: string, fallback: any[] = []): any[] {
    try {
      const filePath = path.join(process.cwd(), fileName);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn(`Failed to read ${fileName}`, e);
    }
    return fallback;
  }

  function saveStoredCollection(fileName: string, data: any) {
    try {
      const filePath = path.join(process.cwd(), fileName);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.warn(`Failed to write ${fileName}`, e);
    }
  }

  // Donations APIs
  app.get("/api/donations", async (req, res) => {
    let list = getStoredCollection("donations_store.json", getStoredCollection("donations_dump.json", []));
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from("donations").select("*").order("Date", { ascending: false });
        if (!error && data && data.length > 0) {
          saveStoredCollection("donations_store.json", data);
          return res.json({ success: true, data });
        }
      } catch (err) {
        console.warn("Supabase fetch donations warning:", err);
      }
    }
    return res.json({ success: true, data: list });
  });

  app.post("/api/save-donation", async (req, res) => {
    try {
      const item = req.body;
      if (!item || !item.id) {
        return res.status(400).json({ error: "Missing donation ID or data" });
      }

      let current = getStoredCollection("donations_store.json", getStoredCollection("donations_dump.json", []));
      const idx = current.findIndex((d: any) => d.id === item.id);
      if (idx >= 0) {
        current[idx] = { ...current[idx], ...item };
      } else {
        current.unshift(item);
      }
      saveStoredCollection("donations_store.json", current);

      if (isSupabaseConfigured) {
        try {
          await supabase.from("donations").upsert(item);
        } catch (dbErr) {
          console.warn("Supabase save donation warning:", dbErr);
        }
      }
      return res.json({ success: true, data: item });
    } catch (err: any) {
      console.error("Save donation error:", err);
      return res.status(500).json({ error: err.message || "Failed to save donation" });
    }
  });

  app.post("/api/delete-donation", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Missing ID" });

      let current = getStoredCollection("donations_store.json", getStoredCollection("donations_dump.json", []));
      current = current.filter((d: any) => d.id !== id);
      saveStoredCollection("donations_store.json", current);

      if (isSupabaseConfigured) {
        try {
          await supabase.from("donations").delete().eq("id", id);
        } catch (dbErr) {
          console.warn("Supabase delete donation warning:", dbErr);
        }
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to delete donation" });
    }
  });

  app.post("/api/save-bulk-donations", async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: "Invalid items" });

      let current = getStoredCollection("donations_store.json", getStoredCollection("donations_dump.json", []));
      const itemMap = new Map(current.map((d: any) => [d.id, d]));
      for (const item of items) {
        if (item && item.id) itemMap.set(item.id, { ...(itemMap.get(item.id) || {}), ...item });
      }
      const updated = Array.from(itemMap.values());
      saveStoredCollection("donations_store.json", updated);

      if (isSupabaseConfigured) {
        try {
          await supabase.from("donations").upsert(items);
        } catch (dbErr) {
          console.warn("Supabase bulk save donations warning:", dbErr);
        }
      }
      return res.json({ success: true, count: items.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to bulk save donations" });
    }
  });

  // Beneficiaries APIs
  app.get("/api/beneficiaries", async (req, res) => {
    let list = getStoredCollection("beneficiaries_store.json", []);
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from("beneficiaries").select("*").order("Date", { ascending: false });
        if (!error && data && data.length > 0) {
          saveStoredCollection("beneficiaries_store.json", data);
          return res.json({ success: true, data });
        }
      } catch (err) {
        console.warn("Supabase fetch beneficiaries warning:", err);
      }
    }
    return res.json({ success: true, data: list });
  });

  app.post("/api/save-beneficiary", async (req, res) => {
    try {
      const item = req.body;
      if (!item || !item.id) {
        return res.status(400).json({ error: "Missing beneficiary ID or data" });
      }

      let current = getStoredCollection("beneficiaries_store.json", []);
      const idx = current.findIndex((b: any) => b.id === item.id);
      if (idx >= 0) {
        current[idx] = { ...current[idx], ...item };
      } else {
        current.unshift(item);
      }
      saveStoredCollection("beneficiaries_store.json", current);

      if (isSupabaseConfigured) {
        try {
          await supabase.from("beneficiaries").upsert(item);
        } catch (dbErr) {
          console.warn("Supabase save beneficiary warning:", dbErr);
        }
      }
      return res.json({ success: true, data: item });
    } catch (err: any) {
      console.error("Save beneficiary error:", err);
      return res.status(500).json({ error: err.message || "Failed to save beneficiary" });
    }
  });

  app.post("/api/delete-beneficiary", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Missing ID" });

      let current = getStoredCollection("beneficiaries_store.json", []);
      current = current.filter((b: any) => b.id !== id);
      saveStoredCollection("beneficiaries_store.json", current);

      if (isSupabaseConfigured) {
        try {
          await supabase.from("beneficiaries").delete().eq("id", id);
        } catch (dbErr) {
          console.warn("Supabase delete beneficiary warning:", dbErr);
        }
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to delete beneficiary" });
    }
  });

  app.post("/api/save-bulk-beneficiaries", async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: "Invalid items" });

      let current = getStoredCollection("beneficiaries_store.json", []);
      const itemMap = new Map(current.map((b: any) => [b.id, b]));
      for (const item of items) {
        if (item && item.id) itemMap.set(item.id, { ...(itemMap.get(item.id) || {}), ...item });
      }
      const updated = Array.from(itemMap.values());
      saveStoredCollection("beneficiaries_store.json", updated);

      if (isSupabaseConfigured) {
        try {
          await supabase.from("beneficiaries").upsert(items);
        } catch (dbErr) {
          console.warn("Supabase bulk save beneficiaries warning:", dbErr);
        }
      }
      return res.json({ success: true, count: items.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to bulk save beneficiaries" });
    }
  });

  // Members APIs
  app.get("/api/members", async (req, res) => {
    let list = getStoredCollection("members_store.json", []);
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from("members").select("*").order("Joining Date", { ascending: false });
        if (!error && data && data.length > 0) {
          saveStoredCollection("members_store.json", data);
          return res.json({ success: true, data });
        }
      } catch (err) {
        console.warn("Supabase fetch members warning:", err);
      }
    }
    return res.json({ success: true, data: list });
  });

  app.post("/api/save-member", async (req, res) => {
    try {
      const item = req.body;
      if (!item || !item.id) return res.status(400).json({ error: "Missing member ID" });

      let current = getStoredCollection("members_store.json", []);
      const idx = current.findIndex((m: any) => m.id === item.id);
      if (idx >= 0) {
        current[idx] = { ...current[idx], ...item };
      } else {
        current.unshift(item);
      }
      saveStoredCollection("members_store.json", current);

      if (isSupabaseConfigured) {
        try {
          await supabase.from("members").upsert(item);
        } catch (dbErr) {
          console.warn("Supabase save member warning:", dbErr);
        }
      }
      return res.json({ success: true, data: item });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to save member" });
    }
  });

  app.post("/api/delete-member", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Missing ID" });

      let current = getStoredCollection("members_store.json", []);
      current = current.filter((m: any) => m.id !== id);
      saveStoredCollection("members_store.json", current);

      if (isSupabaseConfigured) {
        try {
          await supabase.from("members").delete().eq("id", id);
        } catch (dbErr) {
          console.warn("Supabase delete member warning:", dbErr);
        }
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to delete member" });
    }
  });

  // Settings APIs
  app.get("/api/settings", async (req, res) => {
    let settingsData = getStoredCollection("settings_store.json", []);
    const item = settingsData.find((s: any) => s.id === "portalSettings") || settingsData[0] || null;
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from("settings").select("*").eq("id", "portalSettings").single();
        if (!error && data) {
          saveStoredCollection("settings_store.json", [data]);
          return res.json({ success: true, data });
        }
      } catch (err) {
        console.warn("Supabase fetch settings warning:", err);
      }
    }
    return res.json({ success: true, data: item });
  });

  app.post("/api/save-settings", async (req, res) => {
    try {
      const item = req.body;
      if (!item) return res.status(400).json({ error: "Missing settings" });
      const settingObj = { ...item, id: item.id || "portalSettings" };
      saveStoredCollection("settings_store.json", [settingObj]);

      if (isSupabaseConfigured) {
        try {
          await supabase.from("settings").upsert(settingObj);
        } catch (dbErr) {
          console.warn("Supabase save settings warning:", dbErr);
        }
      }
      return res.json({ success: true, data: settingObj });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to save settings" });
    }
  });
  const USERS_FILE_PATH = path.join(process.cwd(), "users_store.json");
  
  function getStoredUsers(): any[] {
    try {
      if (fs.existsSync(USERS_FILE_PATH)) {
        const raw = fs.readFileSync(USERS_FILE_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to read users_store.json", e);
    }
    return [
      {
        id: "8e540699-e9d6-48a4-aa47-7126e373a82f",
        username: "Ali",
        password: "Ali321",
        Rights: "Admin",
        Access: ["Home", "Donations", "Beneficiaries", "Members", "Users", "Settings", "Statement"],
        Theme: "Dark"
      },
      {
        id: "636e1d51-7189-48c3-a282-a6edcd4cab91",
        username: "junaid",
        password: "junaid123",
        Rights: "Admin",
        Access: ["Home", "Donations", "Beneficiaries", "Members", "Users", "Settings", "Statement"],
        Theme: "Dark"
      },
      {
        id: "5534a01a-ae2e-4d0e-a84a-bbbc01055b9f",
        username: "viewer",
        password: "viewer123",
        Rights: "Viewer",
        Access: ["Home", "Statement"],
        Theme: "Dark"
      }
    ];
  }

  function saveStoredUsers(usersList: any[]) {
    try {
      fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(usersList, null, 2), "utf-8");
    } catch (e) {
      console.warn("Failed to write users_store.json", e);
    }
  }

  app.get("/api/users", async (req, res) => {
    let usersList = getStoredUsers();
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from("users").select("*");
        if (!error && data && data.length > 0) {
          // Normalize fields (handle case sensitivity)
          const normalized = data.map((u: any) => ({
            id: u.id,
            username: u.username,
            password: u.password,
            Rights: u.Rights || u.rights || "Operator",
            Access: u.Access || u.access || ["Home", "Donations", "Beneficiaries", "Members"],
            Theme: u.Theme || u.theme || "Dark"
          }));
          saveStoredUsers(normalized);
          return res.json({ success: true, users: normalized });
        }
      } catch (err) {
        console.warn("Supabase fetch users failed, using local store:", err);
      }
    }
    return res.json({ success: true, users: usersList });
  });

  app.post("/api/save-user", async (req, res) => {
    try {
      const user = req.body;
      if (!user || !user.username) {
        return res.status(400).json({ error: "Invalid user data" });
      }

      const normalizedUser = {
        id: user.id || `usr-${Date.now()}`,
        username: user.username.trim(),
        password: user.password || "password123",
        Rights: user.Rights || user.rights || "Operator",
        Access: user.Access || user.access || ["Home", "Donations", "Beneficiaries", "Members"],
        Theme: user.Theme || user.theme || "Dark"
      };

      // 1. Update server file store
      let currentUsers = getStoredUsers();
      const idx = currentUsers.findIndex((u: any) => u.id === normalizedUser.id || u.username.toLowerCase() === normalizedUser.username.toLowerCase());
      if (idx >= 0) {
        currentUsers[idx] = { ...currentUsers[idx], ...normalizedUser };
      } else {
        currentUsers.unshift(normalizedUser);
      }
      saveStoredUsers(currentUsers);

      // 2. Sync to Supabase if configured
      if (isSupabaseConfigured) {
        try {
          await supabase.from("users").upsert(normalizedUser);
        } catch (dbErr) {
          console.warn("Supabase save user failed:", dbErr);
        }
      }

      console.log(`User login information updated for: ${normalizedUser.username}`);
      return res.json({ success: true, user: normalizedUser });
    } catch (err: any) {
      console.error("Error saving user:", err);
      return res.status(500).json({ error: err.message || "Failed to save user" });
    }
  });

  app.post("/api/delete-user", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Missing user ID" });
      }

      // 1. Update server file store
      let currentUsers = getStoredUsers();
      currentUsers = currentUsers.filter((u: any) => u.id !== id);
      saveStoredUsers(currentUsers);

      // 2. Sync to Supabase if configured
      if (isSupabaseConfigured) {
        try {
          await supabase.from("users").delete().eq("id", id);
        } catch (dbErr) {
          console.warn("Supabase delete user failed:", dbErr);
        }
      }

      console.log(`User deleted with id: ${id}`);
      return res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting user:", err);
      return res.status(500).json({ error: err.message || "Failed to delete user" });
    }
  });

  // API routes
  app.get("/api/sms-diagnostic", async (req, res) => {
    if (!isSupabaseConfigured) {
      return res.json({ configured: false, error: "Supabase not configured" });
    }
    try {
      const { data: logs, error: logsErr } = await supabase
        .from("sms_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(20);
      
      const { data: settings, error: settingsErr } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      
      res.json({
        configured: true,
        url: supabaseUrl,
        hasLogs: !!logs,
        count: logs?.length || 0,
        logs: logs || [],
        settings: settings || null,
        errors: {
          logs: logsErr ? logsErr.message : null,
          settings: settingsErr ? settingsErr.message : null
        }
      });
    } catch (err: any) {
      res.json({ configured: true, error: err.message });
    }
  });

  app.post("/api/approve-donation", async (req, res) => {
    const { donationId, adminUsername } = req.body;
    console.log(`Received approval request for: ${donationId} by ${adminUsername}`);
    
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: "Database not configured" });
    }

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

  // Helper to format phone number for Veevo Tech SMS API (e.g. 923001234567)
  function formatPhoneNumberForSms(phone: string): string | null {
    if (!phone) return null;
    let cleaned = phone.trim().replace(/[\s\-\(\)\.,\+]/g, ''); // Remove all symbols including +
    if (!cleaned || cleaned.includes('@')) return null;

    // 03XXXXXXXXX -> 923XXXXXXXXX
    if (/^03\d{9}$/.test(cleaned)) {
      return '92' + cleaned.substring(1);
    }
    // 3XXXXXXXXX -> 923XXXXXXXXX
    if (/^3\d{9}$/.test(cleaned)) {
      return '92' + cleaned;
    }
    // 9203XXXXXXXXX -> 923XXXXXXXXX (Common mistake: international + leading zero)
    if (/^9203\d{9}$/.test(cleaned)) {
      return '92' + cleaned.substring(3);
    }
    // 923XXXXXXXXX -> 923XXXXXXXXX
    if (/^923\d{9}$/.test(cleaned)) {
      return cleaned;
    }
    // 0092... -> 92...
    if (cleaned.startsWith('0092')) {
      const rest = cleaned.substring(4);
      if (rest.startsWith('0')) return '92' + rest.substring(1);
      return '92' + rest;
    }
    
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      return '92' + digitsOnly.substring(1);
    }
    // If it starts with 92 and has 13 digits and the 3rd digit is 0, it's 9203...
    if (digitsOnly.startsWith('920') && digitsOnly.length === 13) {
      return '92' + digitsOnly.substring(3);
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
    type?: string;
  }) {
    const rawHash = options.hash || process.env.VEEVOTECH_SMS_HASH || "d9eb3e26f4532bcbbca611804241635a";
    const rawSenderNum = options.senderNum || process.env.VEEVOTECH_SENDER_NUM || "Default";
    
    // Clean secrets to handle user paste errors
    const hash = extractRealValue(rawHash).split('.')[0];
    const senderNum = extractRealValue(rawSenderNum) || "Default";
    
    const formattedNum = formatPhoneNumberForSms(options.to);

    console.log(`📱 [VeevoTech SMS] Request to ${options.to} (Formatted: ${formattedNum || 'INVALID'}). Type: ${options.type || 'N/A'}`);

    if (!formattedNum) {
      console.warn("⚠️ [VeevoTech SMS] Skipped: Invalid or missing phone number:", options.to);
      return { success: false, error: "Invalid phone number format" };
    }

    try {
      const url = "https://api.veevotech.com/v3/sendsms";
      const params = new URLSearchParams();
      params.append("hash", hash);
      params.append("receivernum", formattedNum);
      params.append("receivernetwork", "0");
      params.append("textmessage", options.message);
      params.append("sendernum", senderNum);
      params.append("unicode", "1"); // Enable Unicode support for Urdu/Arabic characters

      console.log(`📱 [VeevoTech SMS] Dispatching via gateway (Hash: ${hash.substring(0, 4)}...)...`);
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json" 
        },
        body: params.toString()
      });

      const responseText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { raw: responseText };
      }

      const isSuccess = data && (data.STATUS === "SENT" || data.STATUS === "SUCCESSFUL");
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
        if (isSupabaseConfigured) {
          const { error: insertErr } = await supabase.from("sms_logs").insert(logRecord);
          if (insertErr) {
            console.log("ℹ️ sms_logs table note:", insertErr.message || insertErr);
          }
        }
      } catch (logErr) {
        // Suppress
      }

      if (isSuccess) {
        console.log(`✅ [VeevoTech SMS] Delivered to ${formattedNum}. MsgID: ${data.MESSAGE_ID}, Charged: ${data.CHARGED_BALANCE}`);
        return { success: true, messageId: data.MESSAGE_ID, charged: data.CHARGED_BALANCE, data };
      } else {
        const isLowBalance = data?.ERROR_FILTER === "LOW_BALANCE" || data?.ERROR_CODE === "TAPI-149730721";
        
        let errorDesc = "SMS transmission failed";
        if (isLowBalance) {
          errorDesc = "Veevo Tech account balance exhausted (LOW_BALANCE). Please recharge credits at oneid.veevotech.com to resume SMS dispatches.";
        } else if (data?.ERROR_DESCRIPTION) {
          errorDesc = data.ERROR_DESCRIPTION;
        } else if (data?.ERROR_FILTER) {
          errorDesc = data.ERROR_FILTER;
        } else if (data?.STATUS === "ERROR") {
          errorDesc = `Gateway Error: ${JSON.stringify(data)}`;
        }

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
        if (isSupabaseConfigured) {
          await supabase.from("sms_logs").insert(failRecord);
        }
      } catch (logErr) {
        // Suppress
      }

      return { success: false, error: err.message || "Failed to reach Veevo Tech gateway" };
    }
  }

  // Helper to ensure clean SMS text while preserving Urdu/Arabic script and newlines
  function sanitizeForGsmSms(text: string): string {
    if (!text) return "";
    return text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
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
          `Assalamu Alaikum {donor},\n\nWe have received your donation of Rs. {amount} to {org}.\nTrx ID: {txn}\n\nYour contribution is pending verification. JazakAllah Khair!`;

        smsBody = smsBody
          .replace(/\{donor\}/gi, donorName)
          .replace(/\{amount\}/gi, amount)
          .replace(/\{txn\}/gi, txn)
          .replace(/\{org\}/gi, org);

        // Replace literal \n with actual newlines if user typed them in settings
        smsBody = smsBody.replace(/\\n/g, '\n');
        smsBody = sanitizeForGsmSms(smsBody);

        console.log(`📱 [Submission Notif] Body: ${smsBody.replace(/\n/g, ' [NL] ')}`);

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
              `Assalamu Alaikum {donor},\n\nJazakAllahu Khair! Aap ki bheji hui raqam Rs. {amount} {purpose} ke liye humein mil gayi hai.\nRef: {txn}\n\nAllah aap ke is sadqa ko qubool farmaye aur aap ke rizq mein barkat ata kare. Ameen\n\n{org}`;

            approvalSms = approvalSms
              .replace(/\{donor\}/gi, donorName)
              .replace(/\{عطیہ کنندہ\}/gi, donorName)
              .replace(/\{amount\}/gi, amount)
              .replace(/\{purpose\}/gi, purpose)
              .replace(/\{مقصد\}/gi, purpose)
              .replace(/\{txn\}/gi, txn)
              .replace(/\{org\}/gi, org);

            // Replace literal \n with actual newlines
            approvalSms = approvalSms.replace(/\\n/g, '\n');
            approvalSms = sanitizeForGsmSms(approvalSms);

            console.log(`📱 [Status Notif] Body: ${approvalSms.replace(/\n/g, ' [NL] ')}`);

            console.log(`📱 [Status Notif] Dispatching SMS to ${donation['Contact No']}...`);
            await sendVeevoSms({
              to: donation['Contact No'],
              message: approvalSms,
              hash: donation.VeevoSmsHash,
              senderNum: donation.VeevoSenderNum,
              type: "Donation Approval"
            });
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
