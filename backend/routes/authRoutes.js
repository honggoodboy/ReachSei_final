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
   GET /auth/telegram/login -> forwards to /users/telegram/login
========================= */
router.get("/telegram/login", (req, res) => {
  res.redirect("/users/telegram/login");
});


export default router;