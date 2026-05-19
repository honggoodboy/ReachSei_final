import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { sendResetCodeEmail } from "../utils/email.js";

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

export default router;