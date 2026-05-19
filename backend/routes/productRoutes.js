import express from "express";
import multer from "multer";
import axios from "axios";
import pool from "../db.js";
import verifyAdmin from "../middleware/authMiddleware.js";
import { productImageStorage } from "../utils/cloudinary.js";

const router = express.Router();

/* =========================
   PRODUCT IMAGE UPLOAD SETUP
   Uploads product images to Cloudinary
========================= */
const upload = multer({
  storage: productImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, WEBP allowed"));
    }

    cb(null, true);
  },
});

/* =========================
   SEND PRODUCT TO GOOGLE SHEET
========================= */
const sendProductToGoogleSheet = async (product) => {
  try {
    const webAppUrl = process.env.GOOGLE_SHEET_WEBAPP_URL;

    if (!webAppUrl) {
      console.log("GOOGLE_SHEET_WEBAPP_URL is missing");
      return;
    }

    await axios.post(webAppUrl, {
      type: "product",
      productId: product.id,
      name: product.name,
      category: product.category,
      price: Number(product.price) || 0,
      sizes: product.sizes || "",
      stockStatus: product.stock_status || "instock",
      image: product.image || "",
      description: product.description || "",
      createdAt: new Date().toLocaleString(),
    });
  } catch (error) {
    console.error("GOOGLE SHEET PRODUCT ERROR:", error.message);
  }
};

/* =========================
   SYNC OLD PRODUCTS TO GOOGLE SHEET
========================= */
router.post("/sync-to-sheet", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM products
      ORDER BY id ASC
    `);

    const products = result.rows;

    for (const product of products) {
      await sendProductToGoogleSheet(product);
    }

    res.json({
      message: "Products synced to Google Sheet successfully",
      total: products.length,
    });
  } catch (error) {
    console.error("SYNC PRODUCTS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   PUBLIC ROUTES
========================= */

// GET PRODUCTS + SEARCH + CATEGORY
router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;

    if (search) {
      const result = await pool.query(
        `
        SELECT *
        FROM products
        WHERE name ILIKE $1
        ORDER BY id DESC
        `,
        [`%${search}%`]
      );

      return res.json(result.rows);
    }

    if (category) {
      const result = await pool.query(
        `
        SELECT *
        FROM products
        WHERE category = $1
        ORDER BY id DESC
        `,
        [category]
      );

      return res.json(result.rows);
    }

    const result = await pool.query(`
      SELECT *
      FROM products
      ORDER BY id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET SINGLE PRODUCT
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM products
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("GET SINGLE PRODUCT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   ADMIN PROTECTED ROUTES
========================= */

// CREATE PRODUCT WITH CLOUDINARY IMAGE
router.post("/", verifyAdmin, upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, category, sizes, stock_status } = req.body;

    if (!req.file) {
      return res.status(400).json({
        error: "Image is required",
      });
    }

    /*
      Cloudinary image URL:
      req.file.path = https://res.cloudinary.com/...
    */
    const imageUrl = req.file.path;

    const result = await pool.query(
      `
      INSERT INTO products
      (name, description, price, image, category, sizes, stock_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        name,
        description,
        Number(price) || 0,
        imageUrl,
        category,
        sizes || "",
        stock_status || "instock",
      ]
    );

    const product = result.rows[0];

    await sendProductToGoogleSheet(product);

    res.status(201).json({
      message: "Product created!",
      product,
    });
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE PRODUCT TEXT INFO
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, sizes, stock_status } = req.body;

    const result = await pool.query(
      `
      UPDATE products
      SET name = $1,
          description = $2,
          price = $3,
          category = $4,
          sizes = $5,
          stock_status = $6
      WHERE id = $7
      RETURNING *
      `,
      [
        name,
        description,
        Number(price) || 0,
        category,
        sizes || "",
        stock_status || "instock",
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    res.json({
      message: "Product updated",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE PRODUCT IMAGE TO CLOUDINARY
router.put("/:id/image", verifyAdmin, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        error: "Image is required",
      });
    }

    const imageUrl = req.file.path;

    const result = await pool.query(
      `
      UPDATE products
      SET image = $1
      WHERE id = $2
      RETURNING *
      `,
      [imageUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    await sendProductToGoogleSheet(result.rows[0]);

    res.json({
      message: "Image updated",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("UPDATE PRODUCT IMAGE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE PRODUCT
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM products
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    res.json({
      message: "Product deleted",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;