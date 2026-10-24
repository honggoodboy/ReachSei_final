
import express from "express";
import crypto from "crypto";
import axios from "axios";
import pool from "../db.js";
import { sendTelegramMessage } from "../utils/telegram.js";

const router = express.Router();

const BARAY_API_URL =
  process.env.BARAY_API_URL || "https://api.baray.io/pay";
const BARAY_CHECKOUT_URL = "https://pay.baray.io";

function getBarayKey() {
  const rawKey =
    process.env.BARAY_SECRET_KEY || process.env.BARAY_SK || "";
  const rawIv =
    process.env.BARAY_CIPHER_KEY || process.env.BARAY_IV || "";

  let key = Buffer.from(rawKey, "base64");
  let iv = Buffer.from(rawIv, "base64");

  // If variables are swapped in env, auto-detect by length (AES key is 32 bytes, IV is 16 bytes)
  if (key.length === 16 && iv.length === 32) {
    [key, iv] = [iv, key];
  }

  if (key.length !== 32 || iv.length !== 16) {
    throw new Error(
      "Invalid Baray encryption key (sk 32 bytes) or IV (16 bytes) configuration"
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
    encryptedOrderId.trim().length === 0
  ) {
    throw new Error("Missing encrypted order ID");
  }

  const { key, iv } = getBarayKey();
  const encrypted = Buffer.from(encryptedOrderId, "base64");

  if (encrypted.length === 0 || encrypted.length % 16 !== 0) {
    throw new Error("Invalid encrypted order ID payload length");
  }

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * POST /api/baray/create-intent
 *
 * Creates a Baray hosted checkout intent for an existing order.
 * Customer is redirected to pay.baray.io to pay with ABA, ACLEDA, or KHQR.
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
    const frontendUrl =
      process.env.FRONTEND_URL || "http://localhost:5173";

    if (
      !apiKey ||
      (!process.env.BARAY_CIPHER_KEY && !process.env.BARAY_IV) ||
      (!process.env.BARAY_SECRET_KEY && !process.env.BARAY_SK)
    ) {
      return res.status(500).json({
        error: "Baray credentials are not configured",
      });
    }

    const result = await pool.query(
      `SELECT o.id, o.order_code, o.total, o.payment_status, o.baray_intent_id,
              d.full_name, d.phone, d.province, d.address
       FROM public.orders o
       LEFT JOIN public.order_details d ON d.order_id = o.id
       WHERE o.id = $1
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

    // Reuse existing intent if already generated
    if (order.baray_intent_id && !req.body?.refresh) {
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

    // Fetch order items to provide rich details in Baray checkout
    const itemsRes = await pool.query(
      `SELECT oi.*, p.name
       FROM public.order_items oi
       LEFT JOIN public.products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    const orderItems = itemsRes.rows.map((item) => ({
      name: item.name
        ? `${item.name}${item.size ? ` (${item.size})` : ""}`
        : "ReachSei Product",
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
    }));

    const normalizedFrontendUrl = frontendUrl.replace(/\/+$/, "");

    const payload = {
      amount: amount.toFixed(2),
      currency: "USD",
      order_id: String(order.id),
      tracking: {
        source: "Reachsei",
        order_code: order.order_code || `ORDER-${order.id}`,
        customer_name: order.full_name || "",
        phone: order.phone || "",
      },
      order_details: {
        items: orderItems,
      },
      custom_success_url: `${normalizedFrontendUrl}/payment/success?orderId=${order.id}`,
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

    if (typeof intentId !== "string" || intentId.length === 0) {
      console.error(
        "Baray response did not contain a valid intent ID:",
        response.data
      );

      return res.status(502).json({
        error: "Baray did not return a payment intent",
      });
    }

    await pool.query(
      `UPDATE public.orders
       SET baray_intent_id = $1
       WHERE id = $2`,
      [intentId, order.id]
    );

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
      error:
        error.response?.data?.error ||
        "Unable to create Baray payment intent",
    });
  }
});

/**
 * POST /api/baray/webhook
 *
 * Receives payment confirmations directly from Baray.
 * Decrypts encrypted_order_id, confirms payment, updates status, and notifies team.
 */
router.post("/webhook", async (req, res) => {
  try {
    const { encrypted_order_id, bank } = req.body || {};

    if (!encrypted_order_id) {
      console.warn("Baray webhook received without encrypted_order_id:", req.body);
      return res.status(400).json({ error: "Missing encrypted_order_id" });
    }

    let decryptedOrderId;
    try {
      decryptedOrderId = decryptOrderId(encrypted_order_id);
    } catch (decryptErr) {
      console.error("Baray webhook decryption failed:", decryptErr.message);
      return res.status(400).json({ error: "Invalid encrypted payload" });
    }

    console.log(
      `[Baray Webhook] Decrypted Order ID: ${decryptedOrderId}, Bank: ${bank}`
    );

    // Look up order by numeric id or order_code
    let orderResult;
    const numericId = Number(decryptedOrderId);
    if (Number.isSafeInteger(numericId) && numericId > 0) {
      orderResult = await pool.query(
        `SELECT o.*, d.full_name, d.phone, d.province, d.address
         FROM public.orders o
         LEFT JOIN public.order_details d ON d.order_id = o.id
         WHERE o.id = $1
         LIMIT 1`,
        [numericId]
      );
    }

    if (!orderResult || orderResult.rows.length === 0) {
      orderResult = await pool.query(
        `SELECT o.*, d.full_name, d.phone, d.province, d.address
         FROM public.orders o
         LEFT JOIN public.order_details d ON d.order_id = o.id
         WHERE o.order_code = $1
         LIMIT 1`,
        [decryptedOrderId]
      );
    }

    if (!orderResult || orderResult.rows.length === 0) {
      console.error(
        `[Baray Webhook] Order not found for ID: ${decryptedOrderId}`
      );
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];

    // Idempotent: If already paid, return 200 OK immediately
    if (order.payment_status === "paid") {
      console.log(
        `[Baray Webhook] Order #${order.id} is already marked as paid.`
      );
      return res.status(200).send("OK");
    }

    const bankName = String(bank || "KHQR").toUpperCase();
    const paymentRef = `Baray (${bankName})`;
    const updatedNote = order.admin_note
      ? `${order.admin_note}\nPaid via Baray (${bankName})`
      : `Paid via Baray (${bankName})`;

    // Update database
    await pool.query(
      `UPDATE public.orders
       SET payment_status = 'paid',
           status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END,
           payment_reference = COALESCE(payment_reference, $1),
           admin_note = $2
       WHERE id = $3`,
      [paymentRef, updatedNote, order.id]
    );

    // Fetch order items for notification
    const itemsRes = await pool.query(
      `SELECT oi.*, p.name
       FROM public.order_items oi
       LEFT JOIN public.products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [order.id]
    );

    const itemsSummary = itemsRes.rows
      .map(
        (item) =>
          `• ${item.name || "Product"} | Size: ${item.size || "Standard"} | Qty: ${item.quantity} | $${Number(item.price).toFixed(2)}`
      )
      .join("\n");

    // Telegram Notification
    await sendTelegramMessage(`
🎉 <b>PAYMENT CONFIRMED (BARAY.IO)</b>
━━━━━━━━━━━━━━━━━━━━
<b>Order:</b> ${order.order_code || `#${order.id}`}
<b>Database ID:</b> #${order.id}
<b>Customer:</b> ${order.full_name || "N/A"}
<b>Phone:</b> ${order.phone || "N/A"}
<b>Province:</b> ${order.province || "N/A"}
<b>Address:</b> ${order.address || "N/A"}
<b>Payment Method:</b> Baray (${bankName} - ABA / ACLEDA)
<b>Total Paid:</b> $${Number(order.total).toFixed(2)}
<b>Payment Status:</b> PAID ✅
<b>Order Status:</b> Processing 📦

<b>Products:</b>
${itemsSummary || "No items listed"}
    `);

    console.log(
      `[Baray Webhook] Successfully marked order #${order.id} as PAID via ${bankName}`
    );
    return res.status(200).send("OK");
  } catch (error) {
    console.error("[Baray Webhook Error]:", error);
    return res
      .status(500)
      .json({ error: "Internal error processing Baray webhook" });
  }
});

/**
 * GET /api/baray/status/:orderId
 *
 * Used by the frontend success page to verify payment completion.
 * If webhook was slightly delayed, also polls Baray check endpoint.
 */
router.get("/status/:orderId", async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const result = await pool.query(
      `SELECT o.*, d.full_name, d.phone, d.province, d.address, d.payment_method
       FROM public.orders o
       LEFT JOIN public.order_details d ON d.order_id = o.id
       WHERE o.id = $1
       LIMIT 1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = result.rows[0];

    // Fallback: If still unpaid, check intent status with Baray API directly
    if (order.payment_status !== "paid" && order.baray_intent_id) {
      try {
        const apiKey = process.env.BARAY_API_KEY;
        if (apiKey) {
          const checkRes = await axios.post(
            "https://api.baray.io/payments/check/intent",
            { intent_id: order.baray_intent_id },
            {
              headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
              },
              timeout: 6000,
            }
          );

          if (checkRes.data?.status === "success") {
            await pool.query(
              `UPDATE public.orders
               SET payment_status = 'paid',
                   status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END
               WHERE id = $1`,
              [order.id]
            );
            order.payment_status = "paid";
            order.status =
              order.status === "pending" ? "processing" : order.status;
          }
        }
      } catch (checkErr) {
        // Non-blocking fallback; webhook remains primary
      }
    }

    const itemsRes = await pool.query(
      `SELECT oi.*, p.name, p.image_url
       FROM public.order_items oi
       LEFT JOIN public.products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    return res.json({
      order: {
        ...order,
        items: itemsRes.rows,
      },
    });
  } catch (error) {
    console.error("Baray order status check error:", error);
    return res.status(500).json({ error: "Failed to fetch order status" });
  }
});

export default router;
