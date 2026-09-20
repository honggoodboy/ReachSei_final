import express from "express";
import axios from "axios";
import multer from "multer";
import pool from "../db.js";
import { sendTelegramMessage } from "../utils/telegram.js";
import { paymentProofStorage } from "../utils/cloudinary.js";
import { verifyAdmin, verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   PAYMENT PROOF UPLOAD
========================= */

const upload = multer({
  storage: paymentProofStorage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Only JPG, PNG, and WEBP images are allowed"
        )
      );
    }

    cb(null, true);
  },
});

/* =========================
   PROVINCE DELIVERY FEE
========================= */

const PHNOM_PENH = "រាជធានីភ្នំពេញ";

const getDeliveryFee = (province, deliveryMethod) => {
  if (deliveryMethod === "pickup") {
    return 0;
  }

  const cleanProvince = String(province || "").trim();

  if (cleanProvince === PHNOM_PENH) {
    return 1.5;
  }

  return 2.0;
};

/* =========================
   GENERATE DAILY ORDER CODE
========================= */

const generateDailyOrderCode = async () => {
  const todayCountResult = await pool.query(`
    SELECT COUNT(*)
    FROM orders
    WHERE order_date = CURRENT_DATE
  `);

  const dailyOrderNumber =
    Number(todayCountResult.rows[0].count) + 1;

  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  const dateCode =
    `${year}${month}${day}`;

  const numberCode =
    String(dailyOrderNumber).padStart(3, "0");

  return {
    dailyOrderNumber,
    orderCode:
      `RS-${dateCode}-${numberCode}`,
  };
};

/* =========================
   GOOGLE SHEET
========================= */

const sendOrderToGoogleSheet = async ({
  orderId,
  orderCode,
  fullName,
  phone,
  province,
  address,
  paymentMethod,
  paymentStatus,
  paymentReference,
  items,
  subtotal,
  deliveryFee,
  total,
  status,
  createdAt,
}) => {
  try {
    const webAppUrl =
      process.env.GOOGLE_SHEET_WEBAPP_URL;

    if (!webAppUrl) {
      console.log(
        "GOOGLE_SHEET_WEBAPP_URL is missing"
      );

      return;
    }

    const productsText = (items || [])
      .map((item) => {
        const size =
          item.size ||
          item.selectedSize ||
          "No size";

        const quantity =
          Number(item.quantity) || 1;

        const price =
          Number(item.price) || 0;

        return (
          `${item.name || "Product"} | ` +
          `Size: ${size} | ` +
          `Qty: ${quantity} | ` +
          `Price: $${price.toFixed(2)}`
        );
      })
      .join("\n");

    await axios.post(webAppUrl, {
      type: "order",

      orderId,
      orderCode,

      fullName,
      phone,
      province,
      address,

      paymentMethod,
      paymentStatus,
      paymentReference,

      products: productsText,

      subtotal:
        Number(subtotal) || 0,

      deliveryFee:
        Number(deliveryFee) || 0,

      total:
        Number(total) || 0,

      status,
      createdAt,
    });
  } catch (error) {
    console.error(
      "GOOGLE SHEET ERROR:",
      error.message
    );
  }
};

/* =========================
   GET ALL ORDERS
   ADMIN
========================= */

router.get("/", verifyAdmin, async (req, res) => {
  try {
    const ordersResult =
      await pool.query(`
        SELECT
          o.id,
          o.order_date,
          o.daily_order_number,
          o.order_code,

          o.total,
          o.delivery_fee,

          o.status,

          o.payment_status,
          o.payment_proof,
          o.payment_reference,

          o.admin_note,
          o.created_at,

          od.full_name,
          od.phone,
          od.province,
          od.address,
          od.payment_method

        FROM orders o

        LEFT JOIN order_details od
          ON o.id = od.order_id

        ORDER BY o.created_at DESC
      `);

    const orders =
      ordersResult.rows;

    for (const order of orders) {
      const itemsResult =
        await pool.query(
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

          LEFT JOIN products p
            ON oi.product_id = p.id

          WHERE oi.order_id = $1
          `,
          [order.id]
        );

      order.items =
        itemsResult.rows;
    }

    res.json(orders);
  } catch (error) {
    console.error(
      "GET ORDERS ERROR:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   CREATE ORDER
   QR PAYMENT ONLY
========================= */

router.post(
  "/",
  upload.single("paymentProof"),
  async (req, res) => {
    try {
      let {
        userId,
        fullName,
        phone,
        province,
        address,
        paymentReference,
        items,
      } = req.body;

      /* =========================
         VALIDATION
      ========================= */

      if (!fullName?.trim()) {
        return res.status(400).json({
          error: "Full name is required",
        });
      }

      if (!phone?.trim()) {
        return res.status(400).json({
          error: "Phone number is required",
        });
      }

      if (!province?.trim()) {
        return res.status(400).json({
          error: "Province is required",
        });
      }

      if (!address?.trim()) {
        return res.status(400).json({
          error: "Delivery address is required",
        });
      }

      /*
        Payment is QR / bank only.
        Do not accept cash.
      */

      const paymentMethod = "bank";

      if (!req.file) {
        return res.status(400).json({
          error:
            "Payment proof is required",
        });
      }

      /* =========================
         PARSE ITEMS
      ========================= */

      if (typeof items === "string") {
        try {
          items = JSON.parse(items);
        } catch {
          return res.status(400).json({
            error:
              "Invalid order items data",
          });
        }
      }

      if (!Array.isArray(items)) {
        return res.status(400).json({
          error:
            "Order items are required",
        });
      }

      if (items.length === 0) {
        return res.status(400).json({
          error:
            "Order must contain at least one item",
        });
      }

      /* =========================
         VERIFY PRICES FROM DB & CALCULATE SUBTOTAL
      ========================= */

      let calculatedSubtotal = 0;
      const verifiedItems = [];

      for (const item of items) {
        const productId = item.id || item.product_id;
        const quantity = Number(item.quantity) || 1;

        if (!productId) {
          return res.status(400).json({ error: "Invalid product ID in items" });
        }

        const productRes = await pool.query(
          "SELECT id, name, price FROM products WHERE id = $1",
          [productId]
        );

        if (productRes.rows.length === 0) {
          return res.status(400).json({ error: `Product with ID ${productId} not found` });
        }

        const dbProduct = productRes.rows[0];
        const dbPrice = Number(dbProduct.price) || 0;

        calculatedSubtotal += dbPrice * quantity;

        verifiedItems.push({
          id: dbProduct.id,
          name: dbProduct.name,
          price: dbPrice,
          quantity: quantity,
          size: item.size || item.selectedSize || "",
        });
      }

      /* =========================
         DELIVERY FEE & TOTAL
      ========================= */

      const calculatedDeliveryFee = getDeliveryFee(province);
      const calculatedTotal = calculatedSubtotal + calculatedDeliveryFee;

      /* =========================
         PAYMENT PROOF & ORDER CODE
      ========================= */

      const paymentProof = req.file.path;
      const paymentStatus = "pending_review";

      const { dailyOrderNumber, orderCode } = await generateDailyOrderCode();

      /* =========================
         DATABASE TRANSACTION
      ========================= */

      const dbClient = await pool.connect();
      let order;

      try {
        await dbClient.query("BEGIN");

        const orderResult = await dbClient.query(
          `
          INSERT INTO orders
          (
            user_id,
            total,
            delivery_fee,
            status,
            payment_status,
            payment_proof,
            payment_reference,
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
            calculatedTotal,
            calculatedDeliveryFee,
            "pending",
            paymentStatus,
            paymentProof,
            paymentReference?.trim() || null,
            null,
            dailyOrderNumber,
            orderCode,
          ]
        );

        order = orderResult.rows[0];

        await dbClient.query(
          `
          INSERT INTO order_details
          (order_id, full_name, phone, province, address, payment_method)
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            order.id,
            fullName.trim(),
            phone.trim(),
            province.trim(),
            address.trim(),
            paymentMethod,
          ]
        );

        for (const item of verifiedItems) {
          await dbClient.query(
            `
            INSERT INTO order_items
            (order_id, product_id, quantity, price, size)
            VALUES ($1, $2, $3, $4, $5)
            `,
            [
              order.id,
              item.id,
              item.quantity,
              item.price,
              item.size,
            ]
          );
        }

        await dbClient.query("COMMIT");
      } catch (transactionError) {
        await dbClient.query("ROLLBACK");
        throw transactionError;
      } finally {
        dbClient.release();
      }

      /* =========================
         GOOGLE SHEET SYNC
      ========================= */

      await sendOrderToGoogleSheet({
        orderId: order.id,
        orderCode: order.order_code,
        fullName: fullName.trim(),
        phone: phone.trim(),
        province: province.trim(),
        address: address.trim(),
        paymentMethod,
        paymentStatus,
        paymentReference: paymentReference?.trim() || null,
        items: verifiedItems,
        subtotal: calculatedSubtotal,
        deliveryFee: calculatedDeliveryFee,
        total: calculatedTotal,
        status: "pending",
        createdAt: new Date().toLocaleString(),
      });

      /* =========================
         TELEGRAM NOTIFICATION
      ========================= */

      const telegramProductsText = verifiedItems
        .map((item) => {
          const size = item.size || "No size";
          return `• ${item.name || "Product"} | Size: ${size} | Qty: ${item.quantity} | $${item.price.toFixed(2)}`;
        })
        .join("\n");

      await sendTelegramMessage(`
🛒 <b>New Reachsei Order</b>

<b>Order:</b> ${order.order_code || order.id}
<b>Database ID:</b> ${order.id}
<b>Customer:</b> ${fullName}
<b>Phone:</b> ${phone}
<b>Province:</b> ${province}
<b>Address:</b> ${address}
<b>Payment Method:</b> QR Payment
<b>Payment Status:</b> ${paymentStatus}
<b>Payment Reference:</b> ${paymentReference || "None"}
<b>Subtotal:</b> $${calculatedSubtotal.toFixed(2)}
<b>Delivery Fee:</b> $${calculatedDeliveryFee.toFixed(2)}
<b>Total:</b> $${calculatedTotal.toFixed(2)}
<b>Payment Proof:</b> ${paymentProof}

<b>Products:</b>
${telegramProductsText}
      `);

      /* =========================
         RESPONSE
      ========================= */

      res.status(201).json({
        message: "Order placed successfully",
        order,
      });
    } catch (error) {
      console.error("ORDER ERROR:", error);
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

/* =========================
   GET CUSTOMER ORDERS
========================= */

router.get(
  "/user/:userId",
  verifyUser,
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (req.user.id !== Number(userId) && req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const ordersResult = await pool.query(
        `
        SELECT
          o.id,
          o.user_id,

          o.order_date,
          o.daily_order_number,
          o.order_code,

          o.total,
          o.delivery_fee,

          o.status,

          o.payment_status,
          o.payment_proof,
          o.payment_reference,

          o.admin_note,
          o.created_at,

          od.full_name,
          od.phone,
          od.province,
          od.address,
          od.payment_method

        FROM orders o

        LEFT JOIN order_details od
          ON o.id = od.order_id

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

          LEFT JOIN products p
            ON oi.product_id = p.id

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
  }
);

/* =========================
   UPDATE ORDER STATUS
========================= */

router.put(
  "/:id/status",
  verifyAdmin,
  async (req, res) => {
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
  }
);

/* =========================
   UPDATE PAYMENT STATUS
========================= */

router.put(
  "/:id/payment-status",
  verifyAdmin,
  async (req, res) => {
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
  }
);

/* =========================
   UPDATE ADMIN NOTE
========================= */

router.put(
  "/:id/admin-note",
  verifyAdmin,
  async (req, res) => {
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
  }
);

/* =========================
   CANCEL ORDER
========================= */

router.put(
  "/:id/cancel",
  verifyUser,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        UPDATE orders
        SET status = 'cancelled'
        WHERE id = $1
          AND status = 'pending'
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
  }
);

/* =========================
   DELETE ORDER
========================= */

router.delete(
  "/:id",
  verifyAdmin,
  async (req, res) => {
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
  }
);

export default router;