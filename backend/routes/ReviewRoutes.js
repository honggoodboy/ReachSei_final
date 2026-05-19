import express from "express";
import pool from "../db.js";
import verifyAdmin from "../middleware/authMiddleware.js";

const router = express.Router();

// Add review
router.post("/", async (req, res) => {
  try {
    const { productId, userId, rating, comment } = req.body;

    const result = await pool.query(
      `
      INSERT INTO reviews (product_id, user_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [productId, userId, rating, comment]
    );

    res.status(201).json({
      message: "Review added",
      review: result.rows[0],
    });
  }  catch (error) {
  if (error.code === "23505") {
    return res.status(400).json({
      error: "You already reviewed this product.",
    });
  }

  res.status(500).json({ error: error.message });
}
});

// Get reviews by product
router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await pool.query(
      `
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.name AS user_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.product_id = $1
      ORDER BY r.created_at DESC
      `,
      [productId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get average rating
router.get("/product/:productId/average", async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await pool.query(
      `
      SELECT 
        COALESCE(AVG(rating), 0) AS average_rating,
        COUNT(*) AS total_reviews
      FROM reviews
      WHERE product_id = $1
      `,
      [productId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Admin: get all reviews
router.get("/",verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.name AS user_name,
        p.name AS product_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      ORDER BY r.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: delete review
router.delete("/:id",verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM reviews WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Review not found" });
    }

    res.json({ message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
export default router;