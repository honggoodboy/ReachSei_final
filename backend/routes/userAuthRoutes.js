import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import crypto from "crypto";
import axios from "axios";

import { sendResetCodeEmail } from "../utils/email.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   CUSTOMER REGISTER
========================= */
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        error: "Name, email, phone number, and password are required",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = $1 OR phone = $2
      `,
      [cleanEmail, cleanPhone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: "Email or phone number already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (name, email, phone, password)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, phone, avatar_url
      `,
      [cleanName, cleanEmail, cleanPhone, hashedPassword]
    );

    res.status(201).json({
      message: "Account created successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   CUSTOMER LOGIN
   Login with Email OR Phone
========================= */
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        error: "Email/phone and password are required",
      });
    }

    const cleanIdentifier = identifier.trim();
    const lowerIdentifier = cleanIdentifier.toLowerCase();

    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE LOWER(email) = $1 OR phone = $2
      `,
      [lowerIdentifier, cleanIdentifier]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "Invalid email/phone or password",
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        error: "Invalid email/phone or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: "customer",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url || null,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   CUSTOMER FORGOT PASSWORD
   Send 6-digit code to email
========================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const userResult = await pool.query(
      `
      SELECT id, email
      FROM users
      WHERE LOWER(email) = $1
      `,
      [cleanEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: "No account found with this email",
      });
    }

    const user = userResult.rows[0];

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `
      UPDATE users
      SET reset_code = $1,
          reset_code_expires = $2
      WHERE id = $3
      `,
      [resetCode, expiresAt, user.id]
    );

    await sendResetCodeEmail(user.email, resetCode);

    res.json({
      message: "Reset code sent to your email",
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    res.status(500).json({
      error: "Failed to send reset code",
      details: error.message,
    });
  }
});

/* =========================
   CUSTOMER RESET PASSWORD
   Verify code and update password
========================= */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, password } = req.body;

    if (!email || !code || !password) {
      return res.status(400).json({
        error: "Email, reset code, and new password are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const userResult = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = $1
      AND reset_code = $2
      AND reset_code_expires > NOW()
      `,
      [cleanEmail, cleanCode]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        error: "Invalid or expired reset code",
      });
    }

    const user = userResult.rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `
      UPDATE users
      SET password = $1,
          reset_code = NULL,
          reset_code_expires = NULL
      WHERE id = $2
      `,
      [hashedPassword, user.id]
    );

    res.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    res.status(500).json({
      error: "Failed to reset password",
    });
  }
});

/* =========================
   CUSTOMER GOOGLE LOGIN
   Verify Supabase token, then issue ReachSei JWT
========================= */
router.post("/google-login", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!accessToken) {
      return res.status(401).json({
        error: "Google access token is required",
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing backend Supabase configuration");

      return res.status(500).json({
        error: "Google login is not configured on the server",
      });
    }

    // Verify the access token directly with Supabase.
    const supabaseResponse = await fetch(
      `${supabaseUrl.replace(/\/+$/, "")}/auth/v1/user`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!supabaseResponse.ok) {
      return res.status(401).json({
        error: "Invalid or expired Google session",
      });
    }

    const googleUser = await supabaseResponse.json();

    const email = googleUser.email?.trim().toLowerCase();
    const name =
      googleUser.user_metadata?.full_name ||
      googleUser.user_metadata?.name ||
      email?.split("@")[0];
    const avatarUrl =
      googleUser.user_metadata?.avatar_url ||
      googleUser.user_metadata?.picture ||
      null;

    if (!email || !name) {
      return res.status(400).json({
        error: "Google account is missing required profile information",
      });
    }

    // Find an existing ReachSei account by email.
    const existingResult = await pool.query(
      `
      SELECT id, name, email, phone, avatar_url
      FROM users
      WHERE LOWER(email) = $1
      `,
      [email]
    );

    let user;

    if (existingResult.rows.length > 0) {
      // Keep the existing ReachSei account and its database ID.
      user = existingResult.rows[0];

      // Update avatar if provided by Google
      if (avatarUrl && (!user.avatar_url || user.avatar_url !== avatarUrl)) {
        const updateResult = await pool.query(
          `
          UPDATE users
          SET avatar_url = $1
          WHERE id = $2
          RETURNING id, name, email, phone, avatar_url
          `,
          [avatarUrl, user.id]
        );
        user = updateResult.rows[0];
      }
    } else {
      // Google users can initially have no phone or password.
      const createdResult = await pool.query(
        `
        INSERT INTO users (name, email, avatar_url)
        VALUES ($1, $2, $3)
        RETURNING id, name, email, phone, avatar_url
        `,
        [name, email, avatarUrl]
      );

      user = createdResult.rows[0];
    }

    // Issue the same type of backend JWT used by password login.
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: "customer",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      message: "Google login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url || null,
      },
    });
  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);

    return res.status(500).json({
      error: "Unable to complete Google login",
    });
  }
});

/* =========================
   TELEGRAM LOGIN REDIRECT
   GET /users/telegram/login
========================= */
router.get("/telegram/login", (req, res) => {
  const botToken = process.env.TELEGRAM_LOGIN_BOT_TOKEN || "";
  const botId = botToken.split(":")[0] || "8885168265";
  const rawFrontendUrl =
    process.env.FRONTEND_URL || "https://reachsei.vercel.app";
  const frontendUrl = rawFrontendUrl.replace(/\/+$/, "");
  const returnTo = `${frontendUrl}/auth/telegram/callback`;

  const redirectUrl = `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${encodeURIComponent(
    frontendUrl
  )}&embed=0&request_access=write&return_to=${encodeURIComponent(returnTo)}`;

  res.redirect(redirectUrl);
});

router.post("/telegram-login", async (req, res) => {
  try {
    const { hash, ...telegramData } = req.body;

    const botToken = process.env.TELEGRAM_LOGIN_BOT_TOKEN;

    if (!botToken) {
      console.error("Missing TELEGRAM_LOGIN_BOT_TOKEN");
      return res.status(500).json({
        error: "Telegram login is not configured",
      });
    }

    if (!hash || !telegramData.id || !telegramData.auth_date) {
      return res.status(400).json({
        error: "Telegram login data is incomplete",
      });
    }

    // Reject login data older than 24 hours (86400s) as per Telegram specification.
    const authDate = Number(telegramData.auth_date);

    if (
      !Number.isFinite(authDate) ||
      Math.abs(Date.now() / 1000 - authDate) > 86400
    ) {
      return res.status(401).json({
        error: "Telegram login data has expired. Please try again.",
      });
    }

    // Official Telegram Login signature verification.
    // Only standard Telegram fields participate in the signature check:
    // auth_date, first_name, id, last_name, photo_url, username
    const validTelegramKeys = [
      "auth_date",
      "first_name",
      "id",
      "last_name",
      "photo_url",
      "username",
    ];

    const checkData = {};
    for (const key of validTelegramKeys) {
      if (
        telegramData[key] !== undefined &&
        telegramData[key] !== null &&
        String(telegramData[key]).trim() !== ""
      ) {
        checkData[key] = String(telegramData[key]);
      }
    }

    const dataCheckString = Object.keys(checkData)
      .sort()
      .map((key) => `${key}=${checkData[key]}`)
      .join("\n");

    const secretKey = crypto
      .createHash("sha256")
      .update(botToken)
      .digest();

    const expectedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const suppliedHash = String(hash);

    if (
      !/^[a-f0-9]{64}$/i.test(suppliedHash) ||
      !crypto.timingSafeEqual(
        Buffer.from(expectedHash, "hex"),
        Buffer.from(suppliedHash, "hex")
      )
    ) {
      return res.status(401).json({
        error: "Telegram signature verification failed",
      });
    }

    const telegramId = String(telegramData.id);
    const firstName = String(telegramData.first_name || "").trim();
    const lastName = String(telegramData.last_name || "").trim();
    const username = String(telegramData.username || "").trim();
    const name =
      [firstName, lastName].filter(Boolean).join(" ") ||
      (username ? `@${username}` : "Telegram User");
    const photoUrl = telegramData.photo_url
      ? String(telegramData.photo_url).trim()
      : null;

    // Find an account already linked to this Telegram ID.
    const existingResult = await pool.query(
      `SELECT id, name, email, phone, avatar_url
       FROM users
       WHERE telegram_id = $1`,
      [telegramId]
    );

    let user;

    if (existingResult.rows.length > 0) {
      user = existingResult.rows[0];

      // Update avatar if provided by Telegram and changed
      if (photoUrl && (!user.avatar_url || user.avatar_url !== photoUrl)) {
        const updateResult = await pool.query(
          `UPDATE users
           SET avatar_url = $1
           WHERE id = $2
           RETURNING id, name, email, phone, avatar_url`,
          [photoUrl, user.id]
        );
        user = updateResult.rows[0];
      }
    } else {
      // Telegram does not provide an email address in standard login widget.
      // Create a dedicated account for this verified Telegram user.
      const createdResult = await pool.query(
        `INSERT INTO users (name, telegram_id, avatar_url, auth_provider)
         VALUES ($1, $2, $3, 'telegram')
         RETURNING id, name, email, phone, avatar_url`,
        [name, telegramId, photoUrl]
      );

      user = createdResult.rows[0];
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: "customer",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Telegram login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url || null,
      },
    });
  } catch (error) {
    console.error("TELEGRAM LOGIN ERROR:", error);

    return res.status(500).json({
      error: "Unable to complete Telegram login",
    });
  }
});

/* =========================
   UPDATE CUSTOMER PROFILE
   PUT /users/:id
========================= */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: "Name and email are required",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check if email already used by another user
    const existing = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2",
      [cleanEmail, id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: "Email is already in use by another account",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET name = $1, email = $2, phone = COALESCE($3, phone)
      WHERE id = $4
      RETURNING id, name, email, phone, avatar_url
      `,
      [cleanName, cleanEmail, phone ? phone.trim() : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   GET CUSTOMER PROFILE
   GET /users/:id
========================= */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT id, name, email, phone, avatar_url FROM users WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: result.rows[0],
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   CHANGE PASSWORD
   PUT /users/:id/password
========================= */
router.put("/:id/password", async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: "New password must be at least 6 characters long",
      });
    }

    const userResult = await pool.query(
      "SELECT id, password FROM users WHERE id = $1",
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    // If user already has a password, verify the current one
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({
          error: "Current password is required",
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          error: "Current password is incorrect",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password = $1 WHERE id = $2",
      [hashedPassword, id]
    );

    res.json({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =====================================
   KOOMPI (KID) AUTHENTICATION
===================================== */

// Helper to exchange KID code and find or create ReachSei user
async function processKoompiAuthCode(code, clientRedirectUri) {
  const clientId =
    process.env.KOOMPI_CLIENT_ID ||
    "pk_aef9e8b4-751b-4734-8aee-8acd4c039965";
  const clientSecret = process.env.KOOMPI_CLIENT_SECRET || "";
  const rawFrontendUrl =
    process.env.FRONTEND_URL || "https://reachsei.vercel.app";
  const frontendUrl = rawFrontendUrl.replace(/\/+$/, "");
  const redirectUri =
    clientRedirectUri ||
    process.env.KOOMPI_REDIRECT_URI ||
    `${frontendUrl}/auth/koompi/callback`;

  // 1. Exchange authorization code for access token
  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const tokenRes = await axios.post(
    "https://api.kid.koompi.org/oauth/token",
    tokenParams.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    }
  );

  const { access_token } = tokenRes.data;
  if (!access_token) {
    throw new Error("No access token returned from KID");
  }

  // 2. Fetch user information from KID
  const userinfoRes = await axios.get(
    "https://api.kid.koompi.org/oauth/userinfo",
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
    }
  );

  const profile = userinfoRes.data;
  const koompiId = String(profile.sub || profile.kid || "");
  const telegramId = profile.telegram_id ? String(profile.telegram_id) : null;
  const name =
    [profile.name, profile.given_name, profile.family_name]
      .filter(Boolean)[0] ||
    profile.preferred_username ||
    (telegramId ? "Telegram User" : "KID User");
  const email = profile.email ? profile.email.toLowerCase().trim() : null;
  const phone = profile.phone_number ? profile.phone_number.trim() : null;
  const avatarUrl = profile.picture || null;

  if (!koompiId && !telegramId && !email) {
    throw new Error("KID profile did not return identifiable user data");
  }

  // 3. Find existing account by koompi_id, telegram_id, or email
  let existingUser = null;
  if (koompiId) {
    const resK = await pool.query(
      "SELECT id, name, email, phone, avatar_url, koompi_id, telegram_id FROM users WHERE koompi_id = $1",
      [koompiId]
    );
    if (resK.rows.length > 0) existingUser = resK.rows[0];
  }

  if (!existingUser && telegramId) {
    const resT = await pool.query(
      "SELECT id, name, email, phone, avatar_url, koompi_id, telegram_id FROM users WHERE telegram_id = $1",
      [telegramId]
    );
    if (resT.rows.length > 0) existingUser = resT.rows[0];
  }

  if (!existingUser && email) {
    const resE = await pool.query(
      "SELECT id, name, email, phone, avatar_url, koompi_id, telegram_id FROM users WHERE LOWER(email) = $1",
      [email]
    );
    if (resE.rows.length > 0) existingUser = resE.rows[0];
  }

  let user;
  if (existingUser) {
    user = existingUser;
    // Link missing identifiers
    const updates = [];
    const vals = [];
    let idx = 1;

    if (!user.koompi_id && koompiId) {
      updates.push(`koompi_id = $${idx++}`);
      vals.push(koompiId);
    }
    if (!user.telegram_id && telegramId) {
      updates.push(`telegram_id = $${idx++}`);
      vals.push(telegramId);
    }
    if (!user.avatar_url && avatarUrl) {
      updates.push(`avatar_url = $${idx++}`);
      vals.push(avatarUrl);
    }

    if (updates.length > 0) {
      vals.push(user.id);
      const updateRes = await pool.query(
        `UPDATE users SET ${updates.join(
          ", "
        )} WHERE id = $${idx} RETURNING id, name, email, phone, avatar_url`,
        vals
      );
      user = updateRes.rows[0];
    }
  } else {
    // 4. Create new user with KOOMPI provider
    const insertRes = await pool.query(
      `INSERT INTO users (name, email, phone, koompi_id, telegram_id, avatar_url, auth_provider)
       VALUES ($1, $2, $3, $4, $5, $6, 'koompi')
       RETURNING id, name, email, phone, avatar_url`,
      [name, email, phone, koompiId || null, telegramId || null, avatarUrl]
    );
    user = insertRes.rows[0];
  }

  // 5. Generate ReachSei customer JWT
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: "customer",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url || null,
    },
  };
}

// GET /users/koompi/login - Redirect browser to KID authorization page
router.get("/koompi/login", (req, res) => {
  const clientId =
    process.env.KOOMPI_CLIENT_ID ||
    "pk_aef9e8b4-751b-4734-8aee-8acd4c039965";
  const rawFrontendUrl =
    process.env.FRONTEND_URL || "https://reachsei.vercel.app";
  const frontendUrl = rawFrontendUrl.replace(/\/+$/, "");

  const redirectUri =
    process.env.KOOMPI_REDIRECT_URI || `${frontendUrl}/auth/koompi/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  const authUrl = `https://api.kid.koompi.org/oauth/authorize?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(
    "openid profile email phone profile.telegram"
  )}&state=${encodeURIComponent(state)}`;

  res.redirect(authUrl);
});

// POST /users/koompi/callback - Called by React KoompiCallback page
router.post("/koompi/callback", async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    const result = await processKoompiAuthCode(code, redirectUri);
    return res.json({
      message: "KOOMPI login successful",
      ...result,
    });
  } catch (error) {
    console.error("KOOMPI CALLBACK ERROR:", error.response?.data || error);
    return res.status(500).json({
      error:
        error.response?.data?.error_description ||
        error.message ||
        "Failed to complete KOOMPI login",
    });
  }
});

// GET /users/koompi/callback - Fallback if KID directly redirects to backend
router.get("/koompi/callback", async (req, res) => {
  try {
    const { code, error: kidError } = req.query;
    const rawFrontendUrl =
      process.env.FRONTEND_URL || "https://reachsei.vercel.app";
    const frontendUrl = rawFrontendUrl.replace(/\/+$/, "");

    if (kidError) {
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(kidError)}`
      );
    }

    if (!code) {
      return res.redirect(`${frontendUrl}/login?error=missing_code`);
    }

    const { token, user } = await processKoompiAuthCode(code);
    return res.redirect(
      `${frontendUrl}/auth/koompi/callback?token=${encodeURIComponent(
        token
      )}&user=${encodeURIComponent(JSON.stringify(user))}`
    );
  } catch (error) {
    console.error("KOOMPI GET CALLBACK ERROR:", error.response?.data || error);
    const rawFrontendUrl =
      process.env.FRONTEND_URL || "https://reachsei.vercel.app";
    return res.redirect(
      `${rawFrontendUrl.replace(/\/+$/, "")}/login?error=${encodeURIComponent(
        error.message || "koompi_login_failed"
      )}`
    );
  }
});

export default router;