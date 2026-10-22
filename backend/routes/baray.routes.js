
import express from "express";
import crypto from "crypto";
import axios from "axios";
import pool from "../db.js";

const router = express.Router();

const BARAY_API_URL = "https://api.baray.io/pay";
const BARAY_CHECKOUT_URL = "https://pay.baray.io";

// These names match the environment variables in your Render screenshot.
// Confirm with Baray that CIPHER_KEY is the AES key and SECRET_KEY is the IV.
function getBarayKey() {
  let key = Buffer.from(
    process.env.BARAY_SECRET_KEY || "",
    "base64"
  );

  let iv = Buffer.from(
    process.env.BARAY_CIPHER_KEY || "",
    "base64"
  );

  // If variables are swapped in env, auto-detect by length (AES key is 32 bytes, IV is 16 bytes)
  if (key.length === 16 && iv.length === 32) {
    [key, iv] = [iv, key];
  }

  if (key.length !== 32 || iv.length !== 16) {
    throw new Error(
      "Invalid Baray encryption key or IV configuration"
    );
  }

  return { key, iv };
}

function encryptPayload(payload) {
  const { key, iv } = getBarayKey();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);

  return encrypted.toString("base64");
}

function decryptOrderId(encryptedOrderId) {
  if (
    typeof encryptedOrderId !== "string" ||
    encryptedOrderId.length === 0
  ) {
    throw new Error("Missing encrypted order ID");
  }

  const { key, iv } = getBarayKey();
  const encrypted = Buffer.from(encryptedOrderId, "base64");

  if (
    encrypted.length === 0 ||
    encrypted.length % 16 !== 0
  ) {
    throw new Error("Invalid encrypted order ID");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    key,
    iv
  );

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * POST /api/baray/create-intent
 *
 * Creates a Baray hosted checkout intent for an existing order.
 *
 * IMPORTANT:
 * The order must be authorized for the current customer before
 * using this endpoint in a public production checkout.
 */
router.post("/create-intent", async (req, res) => {
  try {
    const orderId = Number(req.body?.orderId);

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        error: "Invalid order ID",
      });
    }

    const apiKey = process.env.BARAY_API_KEY;
    const frontendUrl = process.env.FRONTEND_URL;

    if (
      !apiKey ||
      !process.env.BARAY_CIPHER_KEY ||
      !process.env.BARAY_SECRET_KEY
    ) {
      return res.status(500).json({
        error: "Baray credentials are not configured",
      });
    }

    if (!frontendUrl) {
      return res.status(500).json({
        error: "FRONTEND_URL is not configured",
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
      return res.status(404).json({
        error: "Order not found",
      });
    }

    const order = result.rows[0];

    if (order.payment_status === "paid") {
      return res.status(409).json({
        error: "This order has already been paid",
      });
    }

    // Reuse an existing intent to avoid creating duplicates.
    if (order.baray_intent_id) {
      return res.json({
        intentId: order.baray_intent_id,
        paymentUrl: `${BARAY_CHECKOUT_URL}/${encodeURIComponent(
          order.baray_intent_id
        )}`,
      });
    }

    const amount = Number(order.total);

    if (!Number.isFinite(amount) || amount < 0.03) {
      return res.status(400).json({
        error: "Order total must be at least USD 0.03",
      });
    }

    const normalizedFrontendUrl = frontendUrl.replace(/\/+$/, "");

    const payload = {
      amount: amount.toFixed(2),
      currency: "USD",
      order_id: String(order.id),
      tracking: {
        source: "Reachsei",
      },
      custom_success_url:
        `${normalizedFrontendUrl}/payment/success?orderId=${order.id}`,
    };

    const response = await axios.post(
      BARAY_API_URL,
      {
        data: encryptPayload(payload),
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        timeout: 20000,
      }
    );

    const intentId = response.data?._id;

    if (
      typeof intentId !== "string" ||
      intentId.length === 0
    ) {
      console.error("Baray response did not contain a valid intent ID");

      return res.status(502).json({
        error: "Baray did not return a payment intent",
      });
    }

    const saved = await pool.query(
      `UPDATE public.orders
       SET baray_intent_id = $1
       WHERE id = $2
         AND payment_status <> 'paid'
         AND baray_intent_id IS NULL
       RETURNING id`,
      [intentId, order.id]
    );

    if (saved.rows.length === 0) {
      // Another request may have changed the order while
      // the Baray request was in progress.
      return res.status(409).json({
        error: "Order changed during checkout. Check its payment status.",
      });
    }

    return res.json({
      intentId,
      paymentUrl: `${BARAY_CHECKOUT_URL}/${encodeURIComponent(intentId)}`,
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

/**
 * POST /api/baray/webhook
 *
 * TEMPORARILY DISABLED FOR PAYMENT CONFIRMATION.
 *
 * Decrypting an order ID alone does not prove that payment
 * succeeded. Implement Baray transaction verification before
 * this endpoint is allowed to update payment_status.
 */
router.post("/webhook", async (_req, res) => {
  console.warn(
    "Baray webhook received, but payment confirmation is disabled pending verification."
  );

  return res.status(503).json({
    error: "Payment verification is not configured yet",
  });
});

export default router;
