import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import crypto from "crypto";

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
      RETURNING id, name, email, phone
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

    if (!email || !name) {
      return res.status(400).json({
        error: "Google account is missing required profile information",
      });
    }

    // Find an existing ReachSei account by email.
    const existingResult = await pool.query(
      `
      SELECT id, name, email, phone
      FROM users
      WHERE LOWER(email) = $1
      `,
      [email]
    );

    let user;

    if (existingResult.rows.length > 0) {
      // Keep the existing ReachSei account and its database ID.
      user = existingResult.rows[0];
    } else {
      // Google users can initially have no phone or password.
      const createdResult = await pool.query(
        `
        INSERT INTO users (name, email)
        VALUES ($1, $2)
        RETURNING id, name, email, phone
        `,
        [name, email]
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
      },
    });
  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);

    return res.status(500).json({
      error: "Unable to complete Google login",
    });
  }
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

    // Reject login data older than 5 minutes.
    const authDate = Number(telegramData.auth_date);

    if (
      !Number.isFinite(authDate) ||
      Math.abs(Date.now() / 1000 - authDate) > 300
    ) {
      return res.status(401).json({
        error: "Telegram login data has expired. Please try again.",
      });
    }

    // Telegram Login Widget signature verification.
    const dataCheckString = Object.keys(telegramData)
      .sort()
      .map((key) => `${key}=${telegramData[key]}`)
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
    const name = [firstName, lastName].filter(Boolean).join(" ");

    if (!name) {
      return res.status(400).json({
        error: "Telegram profile name is missing",
      });
    }

    // Find an account already linked to this Telegram ID.
    const existingResult = await pool.query(
      `SELECT id, name, email, phone
       FROM users
       WHERE telegram_id = $1`,
      [telegramId]
    );

    let user;

    if (existingResult.rows.length > 0) {
      user = existingResult.rows[0];
    } else {
      // Telegram may not provide an email address.
      // Do not invent an email or automatically link accounts by name.
      const createdResult = await pool.query(
        `INSERT INTO users (name, telegram_id)
         VALUES ($1, $2)
         RETURNING id, name, email, phone`,
        [name, telegramId]
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
      RETURNING id, name, email, phone
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

export default router;