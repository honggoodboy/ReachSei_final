import express from "express";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import crypto from "crypto";
import axios from "axios";


const router = express.Router();

/* ======================================================
   URL HELPERS
   Resolve the correct frontend/backend production URLs
   even when Render env vars still point to localhost.
====================================================== */

const PROD_FRONTEND_URL = "https://reachsei.vercel.app";
const PROD_BACKEND_URL  = "https://reachsei-final.onrender.com";

/**
 * Returns the correct frontend origin.
 * If FRONTEND_URL is unset or is a localhost address and we are
 * running in production (NODE_ENV !== 'development' or PORT is Render's),
 * return the hardcoded production URL instead.
 */
function resolveFrontendUrl() {
  const raw = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
  const isLocalhost = !raw || raw.includes("localhost") || raw.includes("127.0.0.1");
  const isProduction = process.env.NODE_ENV === "production" ||
    (!process.env.NODE_ENV && !raw.includes("localhost"));

  // On Render (or any host), if FRONTEND_URL is missing / localhost, use prod URL
  if (isLocalhost && isProduction) return PROD_FRONTEND_URL;
  // If explicitly set to a non-localhost value, trust it
  if (!isLocalhost) return raw;
  // Otherwise (local dev with localhost FRONTEND_URL) keep it
  return raw || PROD_FRONTEND_URL;
}

/* Legacy customer authentication endpoints are intentionally disabled.
   Customer accounts sign in through KOOMPI ID only. */
const koompiOnlyAuth = (_req, res) =>
  res.status(410).json({
    error: "Customer authentication is available through KOOMPI ID only.",
  });

router.post("/register", koompiOnlyAuth);
router.post("/login", koompiOnlyAuth);
router.post("/forgot-password", koompiOnlyAuth);
router.post("/reset-password", koompiOnlyAuth);
router.post("/google-login", koompiOnlyAuth);

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

/* Password changes are managed by KOOMPI ID. */
router.put("/:id/password", koompiOnlyAuth);

/* =====================================
   KOOMPI (KID) AUTHENTICATION
===================================== */

// Helper to exchange KID code and find or create ReachSei user
async function processKoompiAuthCode(code, clientRedirectUri) {
  const clientId =
    process.env.KOOMPI_CLIENT_ID ||
    "pk_aef9e8b4-751b-4734-8aee-8acd4c039965";
  const clientSecret = process.env.KOOMPI_CLIENT_SECRET || "";
  const frontendUrl = resolveFrontendUrl();
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
  const frontendUrl = resolveFrontendUrl();

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
    const frontendUrl = resolveFrontendUrl();

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
    const frontendUrl = resolveFrontendUrl();
    return res.redirect(
      `${frontendUrl}/login?error=${encodeURIComponent(
        error.message || "koompi_login_failed"
      )}`
    );
  }
});

export default router;