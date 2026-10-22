import express from "express";
import axios from "axios";
import crypto from "crypto";
import pool from "../db.js";
import { sendTelegramMessage } from "../utils/telegram.js";

const router = express.Router();

/* =========================================================
   ABA PAYWAY CONFIG
========================================================= */

const PAYWAY_API_URL =
  process.env.PAYWAY_API_URL ||
  "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/generate-qr";

const MERCHANT_ID = process.env.PAYWAY_MERCHANT_ID;
const API_KEY = process.env.PAYWAY_API_KEY;

const CALLBACK_URL =
  process.env.PAYWAY_CALLBACK_URL;


/* =========================================================
   HELPERS
========================================================= */

function getReqTime() {
  const now = new Date();

  const pad = (value) =>
    String(value).padStart(2, "0");

  return (
    now.getUTCFullYear() +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes()) +
    pad(now.getUTCSeconds())
  );
}


function base64Encode(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return Buffer.from(
    String(value),
    "utf8"
  ).toString("base64");
}


/* =========================================================
   PAYWAY HASH
========================================================= */

function generatePayWayHash({
  reqTime,
  merchantId,
  tranId,
  amount,
  items,
  firstName,
  lastName,
  email,
  phone,
  purchaseType,
  paymentOption,
  callbackUrl,
  returnDeeplink,
  currency,
  customFields,
  returnParams,
  payout,
  lifetime,
  qrImageTemplate,
}) {
  const hashString =
    reqTime +
    merchantId +
    tranId +
    amount +
    (items || "") +
    (firstName || "") +
    (lastName || "") +
    (email || "") +
    (phone || "") +
    purchaseType +
    paymentOption +
    (callbackUrl || "") +
    (returnDeeplink || "") +
    currency +
    (customFields || "") +
    (returnParams || "") +
    (payout || "") +
    lifetime +
    qrImageTemplate;

  return crypto
    .createHmac("sha512", API_KEY)
    .update(hashString, "utf8")
    .digest("base64");
}


/* =========================================================
   GENERATE ABA PAYWAY QR
   POST /api/payway/generate-qr
========================================================= */

router.post(
  "/generate-qr",
  async (req, res) => {
    try {

      /* =====================================================
         CHECK CONFIG
      ===================================================== */

      if (!MERCHANT_ID) {
        return res.status(500).json({
          success: false,
          error:
            "PAYWAY_MERCHANT_ID is not configured.",
        });
      }

      if (!API_KEY) {
        return res.status(500).json({
          success: false,
          error:
            "PAYWAY_API_KEY is not configured.",
        });
      }

      if (!CALLBACK_URL) {
        return res.status(500).json({
          success: false,
          error:
            "PAYWAY_CALLBACK_URL is not configured.",
        });
      }


      /* =====================================================
         REQUEST DATA
      ===================================================== */

      const {
        amount,
        firstName = "Reachsei",
        lastName = "Customer",
        email = "customer@example.com",
        phone = "",
        orderId,
        items = [],
      } = req.body;


      /* =====================================================
         VALIDATION
      ===================================================== */

      const numericAmount = Number(amount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Invalid payment amount.",
        });
      }

      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: "orderId is required.",
        });
      }


      /* =====================================================
         CHECK ORDER EXISTS
      ===================================================== */

      const orderResult = await pool.query(
        `
          SELECT
            id,
            payment_status
          FROM orders
          WHERE id = $1
          LIMIT 1
        `,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Order not found.",
        });
      }

      const existingOrder =
        orderResult.rows[0];


      /* =====================================================
         PREVENT DUPLICATE PAYMENT
      ===================================================== */

      if (
        existingOrder.payment_status === "paid"
      ) {
        return res.status(400).json({
          success: false,
          error: "This order has already been paid.",
        });
      }


      /* =====================================================
         CREATE UNIQUE PAYWAY TRANSACTION ID
      ===================================================== */

      const cleanOrderId =
        String(orderId)
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(-12);

      const tranId =
        `RS${Date.now()}${cleanOrderId}`
          .slice(0, 20);


      const reqTime =
        getReqTime();


      const formattedAmount =
        numericAmount.toFixed(2);


      /* =====================================================
         ITEMS
      ===================================================== */

      const paywayItems =
        Array.isArray(items)
          ? items.map((item) => ({
            name:
              item.name ||
              "Reachsei Product",

            quantity:
              Number(item.quantity) || 1,

            price:
              Number(item.price) || 0,
          }))
          : [];


      const itemsBase64 =
        base64Encode(
          JSON.stringify(paywayItems)
        );


      /* =====================================================
         CALLBACK
      ===================================================== */

      const callbackBase64 =
        base64Encode(
          CALLBACK_URL
        );


      /* =====================================================
         PAYWAY VALUES
      ===================================================== */

      const purchaseType =
        "purchase";

      const paymentOption =
        "abapay_khqr";

      const currency =
        "USD";

      const lifetime =
        30;

      const qrImageTemplate =
        "template3_color";


      /* =====================================================
         GENERATE HASH
      ===================================================== */

      const hash =
        generatePayWayHash({
          reqTime,
          merchantId: MERCHANT_ID,
          tranId,
          amount: formattedAmount,
          items: itemsBase64,
          firstName,
          lastName,
          email,
          phone,
          purchaseType,
          paymentOption,
          callbackUrl: callbackBase64,
          returnDeeplink: null,
          currency,
          customFields: null,
          returnParams: null,
          payout: null,
          lifetime,
          qrImageTemplate,
        });


      /* =====================================================
         PAYWAY REQUEST
      ===================================================== */

      const payload = {
        req_time:
          reqTime,

        merchant_id:
          MERCHANT_ID,

        tran_id:
          tranId,

        first_name:
          firstName,

        last_name:
          lastName,

        email:
          email,

        phone:
          phone,

        amount:
          formattedAmount,

        purchase_type:
          purchaseType,

        payment_option:
          paymentOption,

        items:
          itemsBase64,

        currency,

        callback_url:
          callbackBase64,

        return_deeplink:
          null,

        custom_fields:
          null,

        return_params:
          null,

        payout:
          null,

        lifetime,

        qr_image_template:
          qrImageTemplate,

        hash,
      };


      console.log(
        "PAYWAY REQUEST:",
        {
          merchant_id:
            MERCHANT_ID,

          tran_id:
            tranId,

          amount:
            formattedAmount,

          currency,

          orderId,
        }
      );


      /* =====================================================
         CALL ABA PAYWAY
      ===================================================== */

      const response =
        await axios.post(
          PAYWAY_API_URL,
          payload,
          {
            headers: {
              "Content-Type":
                "application/json",
            },

            timeout: 30000,
          }
        );


      const data =
        response.data;


      console.log(
        "PAYWAY RESPONSE:",
        {
          status:
            data?.status,

          tran_id:
            tranId,
        }
      );

      console.log("PAYWAY QR STRING:", data?.qrString);
      console.log("PAYWAY DEEPLINK:", data?.abapay_deeplink);


      /* =====================================================
         CHECK PAYWAY RESPONSE
      ===================================================== */

      if (
        data?.status?.code !== "0"
      ) {
        return res.status(400).json({
          success: false,

          error:
            data?.status?.message ||
            "PayWay rejected the request.",

          payway:
            data,
        });
      }


      /* =====================================================
         SAVE PAYWAY TRANSACTION
         INTO REACHSEI ORDER
      ===================================================== */

      await pool.query(
        `
          UPDATE orders
          SET
            payment_reference = $1,
            payment_status = 'unpaid'
          WHERE id = $2
        `,
        [
          tranId,
          orderId,
        ]
      );


      console.log(
        "PAYWAY TRANSACTION SAVED:",
        {
          orderId,
          tranId,
        }
      );


      /* =====================================================
         SUCCESS
      ===================================================== */

      return res.json({
        success: true,

        orderId,

        tranId,

        amount:
          formattedAmount,

        currency,

        qrString:
          data.qrString,

        qrImage:
          data.qrImage,

        abaPayDeeplink:
          data.abapay_deeplink,

        status:
          data.status,
      });


    } catch (error) {

      console.error(
        "PAYWAY GENERATE QR ERROR:",
        error.response?.data ||
        error.message
      );

      return res.status(500).json({
        success: false,

        error:
          error.response?.data ||
          error.message,
      });
    }
  }
);


/* =========================================================
   ABA PAYWAY CALLBACK
   POST /api/payway/callback
========================================================= */

router.post(
  "/callback",
  async (req, res) => {

    try {

      console.log(
        "================================="
      );

      console.log(
        "PAYWAY CALLBACK RECEIVED"
      );

      console.log(
        JSON.stringify(
          req.body,
          null,
          2
        )
      );

      console.log(
        "================================="
      );


      /* =====================================================
         CALLBACK DATA
      ===================================================== */

      const {
        transaction_id,
        merchant_ref,
        payment_status,
        payment_status_code,
        payment_amount,
        original_amount,
        payment_currency,
        bank_ref,
        apv,
      } = req.body;


      /* =====================================================
         CHECK PAYMENT SUCCESS
      ===================================================== */

      const paymentApproved =
        Number(payment_status_code) === 0 ||
        payment_status === "APPROVED";


      if (!paymentApproved) {

        console.log(
          "PAYWAY PAYMENT NOT APPROVED:",
          {
            transaction_id,
            merchant_ref,
            payment_status,
            payment_status_code,
          }
        );

        return res.status(200).json({
          success: true,
          message:
            "Payment not approved.",
        });
      }


      /* =====================================================
         PAYMENT APPROVED
      ===================================================== */

      console.log(
        "PAYWAY PAYMENT APPROVED:",
        {
          transaction_id,
          merchant_ref,
          payment_amount,
          original_amount,
          payment_currency,
          bank_ref,
          apv,
        }
      );


      /* =====================================================
         FIND REACHSEI ORDER
      ===================================================== */

      const orderResult =
        await pool.query(
          `
            SELECT
              id,
              payment_status
            FROM orders
            WHERE
              payment_reference = $1
              OR payment_reference = $2
            LIMIT 1
          `,
          [
            transaction_id || "",
            merchant_ref || "",
          ]
        );


      if (
        orderResult.rows.length === 0
      ) {

        console.error(
          "PAYWAY ORDER NOT FOUND:",
          {
            transaction_id,
            merchant_ref,
          }
        );

        /*
          Return 200 because PayWay already
          delivered the callback.

          The payment can be investigated
          using the transaction ID.
        */

        return res.status(200).json({
          success: true,

          message:
            "Payment received but order was not found.",
        });
      }


      const order =
        orderResult.rows[0];


      /* =====================================================
         PREVENT DUPLICATE UPDATE
      ===================================================== */

      if (
        order.payment_status === "paid"
      ) {

        console.log(
          `ORDER ${order.id} IS ALREADY PAID`
        );

        return res.status(200).json({
          success: true,

          message:
            "Order already paid.",
        });
      }


      /* =====================================================
         UPDATE ORDER
      ===================================================== */

      const paymentReference =
        transaction_id ||
        merchant_ref;


      await pool.query(
        `
          UPDATE orders
          SET
            payment_status = 'paid',
            payment_reference = $1,
            payment_proof = NULL
          WHERE id = $2
        `,
        [
          paymentReference,
          order.id,
        ]
      );


      console.log(
        `PAYWAY ORDER ${order.id} MARKED AS PAID`
      );

      /* Send Telegram Notification on Paid */
      await sendPayWayTelegramNotification(order.id, paymentReference);


      /* =====================================================
         SUCCESS RESPONSE
      ===================================================== */

      return res.status(200).json({
        success: true,

        message:
          "Payment processed successfully.",

        orderId:
          order.id,

        transactionId:
          transaction_id,

        paymentStatus:
          "paid",
      });


    } catch (error) {

      console.error(
        "PAYWAY CALLBACK ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        error:
          error.message,
      });
    }
  }
);


/* =========================================================
   HELPERS FOR TELEGRAM NOTIFICATION
========================================================= */

async function sendPayWayTelegramNotification(orderId, paymentReference) {
  try {
    const orderRes = await pool.query(
      `
        SELECT 
          o.id,
          o.order_code,
          o.total,
          o.delivery_fee,
          od.full_name,
          od.phone,
          od.province,
          od.address,
          od.payment_method
        FROM orders o
        JOIN order_details od ON o.id = od.order_id
        WHERE o.id = $1
        LIMIT 1
      `,
      [orderId]
    );

    if (orderRes.rows.length === 0) return;
    const order = orderRes.rows[0];

    const itemsRes = await pool.query(
      `
        SELECT 
          oi.quantity,
          oi.price,
          oi.size,
          p.name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
      `,
      [orderId]
    );

    const telegramProductsText = itemsRes.rows
      .map((item) => {
        const size = item.size || "No size";
        return `• ${item.name || "Product"} | Size: ${size} | Qty: ${item.quantity} | $${Number(item.price).toFixed(2)}`;
      })
      .join("\n");

    const deliveryFee = Number(order.delivery_fee || 0);
    const total = Number(order.total || 0);

    await sendTelegramMessage(`
🛒 <b>New Reachsei Order (Paid via ABA PayWay)</b>

<b>Order:</b> ${order.order_code || order.id}
<b>Database ID:</b> ${order.id}

<b>Customer:</b> ${order.full_name || "Customer"}
<b>Phone:</b> ${order.phone || "N/A"}
<b>Province:</b> ${order.province || "N/A"}
<b>Address:</b> ${order.address || "N/A"}
<b>Payment Method:</b> ABA PayWay (Paid)
<b>Payment Reference:</b> ${paymentReference || "None"}
<b>Delivery Fee:</b> $${deliveryFee.toFixed(2)}
<b>Total:</b> $${total.toFixed(2)}

<b>Products:</b>
${telegramProductsText}
    `);
  } catch (error) {
    console.error("Failed to send Telegram notification for PayWay order:", error.message);
  }
}


/* =========================================================
   CHECK ORDER STATUS
   GET /api/payway/check-status/:orderId
========================================================= */

router.get("/check-status/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await pool.query(
      `SELECT id, order_code, payment_status, payment_reference FROM orders WHERE id = $1 LIMIT 1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Order not found." });
    }

    const order = result.rows[0];

    return res.json({
      success: true,
      orderId: order.id,
      orderCode: order.order_code,
      paymentStatus: order.payment_status,
      paymentReference: order.payment_reference,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});


/* =========================================================
   CONFIRM PAID (MANUAL / FALLBACK CONFIRMATION)
   POST /api/payway/confirm-paid
========================================================= */

router.post("/confirm-paid", async (req, res) => {
  try {
    const { orderId, tranId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: "orderId is required." });
    }

    const orderResult = await pool.query(
      `SELECT id, payment_status FROM orders WHERE id = $1 LIMIT 1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Order not found." });
    }

    const order = orderResult.rows[0];

    if (order.payment_status !== "paid") {
      await pool.query(
        `UPDATE orders SET payment_status = 'paid', payment_reference = COALESCE($1, payment_reference) WHERE id = $2`,
        [tranId || null, orderId]
      );

      await sendPayWayTelegramNotification(orderId, tranId || "Confirmed");
    }

    return res.json({ success: true, message: "Order confirmed as paid." });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* =========================================================
   EXPORT
========================================================= */

export default router;