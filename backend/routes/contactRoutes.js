import express from "express";
import { sendTelegramMessage } from "../utils/telegram.js";

const router = express.Router();

/* =========================
   CONTACT FORM TO TELEGRAM
========================= */
router.post("/", async (req, res) => {
  try {
    const { name, contact, message } = req.body;

    if (!name || !contact || !message) {
      return res.status(400).json({
        error: "Name, contact, and message are required",
      });
    }

    await sendTelegramMessage(`
📩 <b>New Contact Message</b>

<b>Name:</b> ${name}
<b>Contact:</b> ${contact}

<b>Message:</b>
${message}
`);

    res.json({
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("CONTACT ERROR:", error);
    res.status(500).json({
      error: "Failed to send message",
    });
  }
});

export default router;