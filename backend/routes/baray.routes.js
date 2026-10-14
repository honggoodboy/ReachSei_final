
import express from "express";
import crypto from "crypto";
import axios from "axios";
import pool from "../db.js";

const router = express.Router();

function getBarayKey() {
  const key = Buffer.from(process.env.BARAY_SK || "", "base64");
  const iv = Buffer.from(process.env.BARAY_IV || "", "base64");

  if (key.length !== 32 || iv.length !== 16) {
    throw new Error("Invalid Baray SK or IV configuration");
  }

  return { key, iv };
}

function encryptPayload(payload) {
  const { key, iv } = getBarayKey();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  return Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]).toString("base64");
}

function decryptOrderId(encryptedOrderId) {
  const { key, iv } = getBarayKey();
  const encrypted = Buffer.from(encryptedOrderId, "base64");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

/*
 * POST /api/baray/create-intent
 * Creates a Baray payment intent for an existing Reachsei order.
 */
router.post("/create-intent", async (req, res) => {
  try {
    const orderId = Number(req.body.orderId);

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    if (
      !process.env.BARAY_API_KEY ||
      !process.env.BARAY_SK ||
      !process.env.BARAY_IV
    ) {
      return res.status(500).json({
        error: "Baray credentials are not configured",
      });
    }

    const result = await pool.query(
      `SELECT id, total, payment_status, baray_intent_id
       FROM public.orders
       WHERE id = $1
       LIMIT 1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = result.rows[0];

    if (order.payment_status === "paid") {
      return res.status(409).json({
        error: "This order has already been paid",
      });
    }

    // Reuse the existing intent instead of creating duplicates.
    if (order.baray_intent_id) {
      return res.json({
        intentId: order.baray_intent_id,
        paymentUrl: `https://pay.baray.io/${order.baray_intent_id}`,
      });
    }

    const amount = Number(order.total);

    if (!Number.isFinite(amount) || amount < 0.03) {
      return res.status(400).json({
        error: "Order total must be at least USD 0.03",
      });
    }

    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/$/, "");

    const payload = {
      amount: amount.toFixed(2),
      currency: "USD",
      order_id: String(order.id),
      tracking: {
        source: "Reachsei",
      },
      custom_success_url:
        `${frontendUrl}/payment/success?orderId=${order.id}`,
    };

    const response = await axios.post(
      "https://api.baray.io/pay",
      { data: encryptPayload(payload) },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.BARAY_API_KEY,
        },
        timeout: 20000,
      }
    );

    const intentId = response.data?._id;

    if (!intentId) {
      console.error("Baray returned no intent ID");
      return res.status(502).json({
        error: "Baray did not return a payment intent",
      });
    }

    const saved = await pool.query(
      `UPDATE public.orders
       SET baray_intent_id = $1
       WHERE id = $2
         AND payment_status <> 'paid'
       RETURNING id`,
      [intentId, order.id]
    );

    if (saved.rows.length === 0) {
      return res.status(409).json({
        error: "Order status changed; check payment status before retrying",
      });
    }

    return res.json({
      intentId,
      paymentUrl: `https://pay.baray.io/${intentId}`,
    });
  } catch (error) {
    console.error(
      "BARAY CREATE INTENT ERROR:",
      error.response?.data || error.message
    );

    return res.status(502).json({
      error: "Unable to create Baray payment intent",
    });
  }
});

/*
 * POST /api/baray/webhook
 * Baray sends encrypted_order_id and bank after payment.
 */
router.post("/webhook", async (req, res) => {
  try {
    const { encrypted_order_id, bank } = req.body || {};

    if (
      typeof encrypted_order_id !== "string" ||
      typeof bank !== "string"
    ) {
      return res.status(400).send("Invalid webhook payload");
    }

    const orderIdText = decryptOrderId(encrypted_order_id);

    if (!/^[1-9]\d*$/.test(orderIdText)) {
      return res.status(400).send("Invalid order reference");
    }

    const orderId = Number(orderIdText);

    if (!Number.isSafeInteger(orderId)) {
      return res.status(400).send("Invalid order reference");
    }

    const result = await pool.query(
      `UPDATE public.orders
       SET payment_status = 'paid',
           payment_reference = $1
       WHERE id = $2
         AND baray_intent_id IS NOT NULL
         AND payment_status <> 'paid'
       RETURNING id`,
      [`BARAY:${bank}`, orderId]
    );

    if (result.rows.length === 0) {
      // Duplicate notifications can happen. Acknowledge an already-paid
      // order, but do not accept an unknown order.
      const existing = await pool.query(
        `SELECT payment_status, baray_intent_id
         FROM public.orders
         WHERE id = $1`,
        [orderId]
      );

      if (
        existing.rows.length === 0 ||
        !existing.rows[0].baray_intent_id
      ) {
        return res.status(404).send("Order not found");
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("BARAY WEBHOOK ERROR:", error.message);
    return res.status(400).send("Invalid webhook");
  }
});

export default router;
