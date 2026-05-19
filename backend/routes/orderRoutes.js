import express from "express";
import axios from "axios";
import multer from "multer";
import pool from "../db.js";
import { sendTelegramMessage } from "../utils/telegram.js";
import { paymentProofStorage } from "../utils/cloudinary.js";

const router = express.Router();

/* =========================
   PAYMENT PROOF UPLOAD SETUP
   Uploads payment proof to Cloudinary
========================= */
const upload = multer({
  storage: paymentProofStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only image files are allowed"));
    }

    cb(null, true);
  },
});

/* =========================
   GENERATE DAILY ORDER CODE
   Example: RS-20260519-001
========================= */
const generateDailyOrderCode = async () => {
  const todayCountResult = await pool.query(`
    SELECT COUNT(*) 
    FROM orders 
    WHERE order_date = CURRENT_DATE
  `);

  const dailyOrderNumber = Number(todayCountResult.rows[0].count) + 1;

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  const dateCode = `${year}${month}${day}`;
  const numberCode = String(dailyOrderNumber).padStart(3, "0");

  return {
    dailyOrderNumber,
    orderCode: `RS-${dateCode}-${numberCode}`,
  };
};

/* =========================
   SEND ORDER TO GOOGLE SHEET
========================= */
const sendOrderToGoogleSheet = async ({
  orderId,
  orderCode,
  fullName,
  phone,
  address,
  paymentMethod,
  paymentStatus,
  paymentReference,
  customerNote,
  items,
  total,
  status,
  createdAt,
}) => {
  try {
    const webAppUrl = process.env.GOOGLE_SHEET_WEBAPP_URL;

    if (!webAppUrl) {
      console.log("GOOGLE_SHEET_WEBAPP_URL is missing");
      return;
    }

    const productsText = (items || [])
      .map((item) => {
        const size = item.size || item.selectedSize || "No size";
        const quantity = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;

        return `${item.name || "Product"} | Size: ${size} | Qty: ${quantity} | Price: $${price.toFixed(
          2
        )}`;
      })
      .join("\n");

    await axios.post(webAppUrl, {
      type: "order",
      orderId,
      orderCode,
      fullName,
      phone,
      address,
      paymentMethod,
      paymentStatus,
      paymentReference,
      customerNote,
      products: productsText,
      total: Number(total) || 0,
      status,
      createdAt,
    });
  } catch (error) {
    console.error("GOOGLE SHEET ERROR:", error.message);
  }
};

/* =========================
   GET ALL ORDERS FOR ADMIN
========================= */
router.get("/", async (req, res) => {
  try {
    const ordersResult = await pool.query(`
      SELECT 
        o.id,
        o.order_date,
        o.daily_order_number,
        o.order_code,
        o.total,
        o.status,
        o.payment_status,
        o.payment_proof,
        o.payment_reference,
        o.customer_note,
        o.admin_note,
        o.created_at,
        od.full_name,
        od.phone,
        od.address,
        od.payment_method
      FROM orders o
      LEFT JOIN order_details od ON o.id = od.order_id
      ORDER BY o.created_at DESC
    `);

    const orders = ordersResult.rows;

    for (const order of orders) {
      const itemsResult = await pool.query(
        `
        SELECT 
          oi.id,
          oi.product_id,
          oi.quantity,
          oi.price,
          oi.size,
          p.name,
          p.image,
          p.category
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
        `,
        [order.id]
      );

      order.items = itemsResult.rows;
    }

    res.json(orders);
  } catch (error) {
    console.error("GET ORDERS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   CREATE ORDER
   Supports multipart/form-data
========================= */
router.post("/", upload.single("paymentProof"), async (req, res) => {
  try {
    let {
      userId,
      fullName,
      phone,
      address,
      paymentMethod,
      paymentReference,
      customerNote,
      items,
      total,
    } = req.body;

    if (typeof items === "string") {
      items = JSON.parse(items);
    }

    /*
      IMPORTANT:
      With Cloudinary, req.file.path is already a full image URL:
      https://res.cloudinary.com/...
    */
    const paymentProof = req.file ? req.file.path : null;

    let paymentStatus = "unpaid";

    if (paymentMethod === "bank") {
      paymentStatus = paymentProof ? "pending_review" : "unpaid";
    }

    if (paymentMethod === "cash") {
      paymentStatus = "unpaid";
    }

    const { dailyOrderNumber, orderCode } = await generateDailyOrderCode();

    const orderResult = await pool.query(
      `
      INSERT INTO orders 
      (
        user_id, 
        total, 
        status, 
        payment_status, 
        payment_proof, 
        payment_reference,
        customer_note,
        admin_note,
        order_date,
        daily_order_number,
        order_code
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9, $10)
      RETURNING *
      `,
      [
        userId || null,
        Number(total) || 0,
        "pending",
        paymentStatus,
        paymentProof,
        paymentReference || null,
        customerNote || null,
        null,
        dailyOrderNumber,
        orderCode,
      ]
    );

    const order = orderResult.rows[0];

    await pool.query(
      `
      INSERT INTO order_details 
      (order_id, full_name, phone, address, payment_method)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [order.id, fullName, phone, address, paymentMethod]
    );

    for (const item of items || []) {
      await pool.query(
        `
        INSERT INTO order_items 
        (order_id, product_id, quantity, price, size)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          order.id,
          item.id,
          Number(item.quantity) || 1,
          Number(item.price) || 0,
          item.size || item.selectedSize || "",
        ]
      );
    }

    await sendOrderToGoogleSheet({
      orderId: order.id,
      orderCode: order.order_code,
      fullName,
      phone,
      address,
      paymentMethod,
      paymentStatus,
      paymentReference,
      customerNote,
      items,
      total,
      status: "pending",
      createdAt: new Date().toLocaleString(),
    });

    const telegramProductsText = (items || [])
      .map((item) => {
        const size = item.size || item.selectedSize || "No size";
        const quantity = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;

        return `• ${item.name || "Product"} | Size: ${size} | Qty: ${quantity} | $${price.toFixed(
          2
        )}`;
      })
      .join("\n");

    await sendTelegramMessage(`
🛒 <b>New Reachsei Order</b>

<b>Order:</b> ${order.order_code || order.id}
<b>Database ID:</b> ${order.id}
<b>Customer:</b> ${fullName}
<b>Phone:</b> ${phone}
<b>Address:</b> ${address}
<b>Payment Method:</b> ${paymentMethod}
<b>Payment Status:</b> ${paymentStatus}
<b>Payment Reference:</b> ${paymentReference || "None"}
<b>Customer Note:</b> ${customerNote || "None"}
<b>Total:</b> $${Number(total || 0).toFixed(2)}
<b>Payment Proof:</b> ${paymentProof || "None"}

<b>Products:</b>
${telegramProductsText}
`);

    res.status(201).json({
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.error("ORDER ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   GET ORDERS BY CUSTOMER
========================= */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const ordersResult = await pool.query(
      `
      SELECT 
        o.id,
        o.user_id,
        o.order_date,
        o.daily_order_number,
        o.order_code,
        o.total,
        o.status,
        o.payment_status,
        o.payment_proof,
        o.payment_reference,
        o.customer_note,
        o.admin_note,
        o.created_at,
        od.full_name,
        od.phone,
        od.address,
        od.payment_method
      FROM orders o
      LEFT JOIN order_details od ON o.id = od.order_id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      `,
      [userId]
    );

    const orders = ordersResult.rows;

    for (const order of orders) {
      const itemsResult = await pool.query(
        `
        SELECT 
          oi.id,
          oi.product_id,
          oi.quantity,
          oi.price,
          oi.size,
          p.name,
          p.image,
          p.category
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
        `,
        [order.id]
      );

      order.items = itemsResult.rows;
    }

    res.json(orders);
  } catch (error) {
    console.error("GET USER ORDERS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   UPDATE ORDER STATUS
========================= */
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const allowedStatus = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        error: "Invalid order status",
      });
    }

    const result = await pool.query(
      `
      UPDATE orders 
      SET status = $1 
      WHERE id = $2 
      RETURNING *
      `,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    res.json({
      message: "Order status updated",
      order: result.rows[0],
    });
  } catch (error) {
    console.error("UPDATE STATUS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   UPDATE PAYMENT STATUS
========================= */
router.put("/:id/payment-status", async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    const allowedPaymentStatus = [
      "unpaid",
      "pending_review",
      "paid",
      "rejected",
    ];

    if (!allowedPaymentStatus.includes(paymentStatus)) {
      return res.status(400).json({
        error: "Invalid payment status",
      });
    }

    const result = await pool.query(
      `
      UPDATE orders
      SET payment_status = $1
      WHERE id = $2
      RETURNING *
      `,
      [paymentStatus, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    res.json({
      message: "Payment status updated",
      order: result.rows[0],
    });
  } catch (error) {
    console.error("UPDATE PAYMENT STATUS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   UPDATE ADMIN NOTE
========================= */
router.put("/:id/admin-note", async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const result = await pool.query(
      `
      UPDATE orders
      SET admin_note = $1
      WHERE id = $2
      RETURNING *
      `,
      [adminNote || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    res.json({
      message: "Admin note updated",
      order: result.rows[0],
    });
  } catch (error) {
    console.error("UPDATE ADMIN NOTE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   CANCEL ORDER
========================= */
router.put("/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE orders
      SET status = 'cancelled'
      WHERE id = $1 AND status = 'pending'
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "Only pending orders can be cancelled",
      });
    }

    res.json({
      message: "Order cancelled",
      order: result.rows[0],
    });
  } catch (error) {
    console.error("CANCEL ORDER ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   DELETE ORDER
========================= */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
      DELETE FROM order_items
      WHERE order_id = $1
      `,
      [id]
    );

    await pool.query(
      `
      DELETE FROM order_details
      WHERE order_id = $1
      `,
      [id]
    );

    const result = await pool.query(
      `
      DELETE FROM orders
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    res.json({
      message: "Order deleted successfully",
      order: result.rows[0],
    });
  } catch (error) {
    console.error("DELETE ORDER ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;