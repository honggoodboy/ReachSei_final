import express from "express";
import pool from "../db.js";
import verifyAdmin from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/stats", verifyAdmin, async (req, res) => {
  try {
    const products = await pool.query("SELECT COUNT(*) FROM products");
    const orders = await pool.query("SELECT COUNT(*) FROM orders");
    const pending = await pool.query(
      "SELECT COUNT(*) FROM orders WHERE status = 'pending'"
    );
    const revenue = await pool.query(
      "SELECT COALESCE(SUM(total), 0) AS total_revenue FROM orders"
    );

    const recentOrders = await pool.query(`
      SELECT 
        o.id,
        o.total,
        o.status,
        o.created_at,
        od.full_name
      FROM orders o
      LEFT JOIN order_details od ON o.id = od.order_id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    res.json({
      totalProducts: Number(products.rows[0].count),
      totalOrders: Number(orders.rows[0].count),
      pendingOrders: Number(pending.rows[0].count),
      totalRevenue: Number(revenue.rows[0].total_revenue),
      recentOrders: recentOrders.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;