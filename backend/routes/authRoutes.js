import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/admin/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign(
      { role: "admin", email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login successful",
      token,
    });
  }

  res.status(401).json({ error: "Invalid email or password" });
});

/* =========================
   TELEGRAM LOGIN REDIRECT
   GET /auth/telegram/login
========================= */
router.get("/telegram/login", (req, res) => {
  const botToken = process.env.TELEGRAM_LOGIN_BOT_TOKEN || "";
  const botId = botToken.split(":")[0] || "8885168265";
  const frontendUrl =
    process.env.FRONTEND_URL || "https://reachsei.vercel.app";
  const returnTo = `${frontendUrl.replace(/\/+$/, "")}/auth/telegram/callback`;

  const redirectUrl = `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${encodeURIComponent(
    frontendUrl
  )}&embed=0&request_access=write&return_to=${encodeURIComponent(returnTo)}`;

  res.redirect(redirectUrl);
});

export default router;