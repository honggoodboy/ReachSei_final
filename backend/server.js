import "dotenv/config";

import express from "express";
import cors from "cors";
import pool from "./db.js";
import path from "path";
import { fileURLToPath } from "url";

import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import userAuthRoutes from "./routes/userAuthRoutes.js";
import reviewRoutes from "./routes/ReviewRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import barayRoutes from "./routes/baray.routes.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());

app.use(express.json());

/* =========================
   STATIC FILES
========================= */

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

/* =========================
   PAYWAY ROUTES
========================= */

// Manual QR payments only during the trial. Keep provider source files for
// later integration, but do not expose payment creation or confirmation.
const automatedPaymentsDisabled = (_req, res) => {
  res.status(503).json({
    success: false,
    error: "Online payments are disabled. Upload your QR payment proof at checkout for admin review.",
  });
};

app.use(["/api/payway", "/payway"], automatedPaymentsDisabled);

// Baray status polling can mark an order paid without the current manual review.
// Keep all Baray routes closed until automated payments are intentionally enabled.
app.use(["/api/baray", "/baray"], automatedPaymentsDisabled);
app.use(
  "/api/baray",
  barayRoutes
);
app.use(
  "/baray",
  barayRoutes
);
/* =========================
   MAIN ROUTES
========================= */

app.get("/", (req, res) => {
  res.send(
    "Reachsei Store API is running..."
  );
});

app.use(
  "/contact",
  contactRoutes
);

app.use(
  "/products",
  productRoutes
);

app.use(
  "/orders",
  orderRoutes
);
app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/auth",
  authRoutes
);

app.use(
  "/dashboard",
  dashboardRoutes
);

app.use(
  "/users",
  userAuthRoutes
);

/* Aliases for KOOMPI auth */
app.get("/koompi/login", (req, res) => {
  res.redirect("/users/koompi/login");
});
app.use("/api/auth/koompi", (req, res, next) => {
  req.url = `/koompi${req.url}`;
  userAuthRoutes(req, res, next);
});



app.use(
  "/reviews",
  reviewRoutes
);

/* =========================
   TEST DATABASE
========================= */

app.get(
  "/test-db",
  async (req, res) => {
    try {
      const result =
        await pool.query(
          "SELECT NOW()"
        );

      res.json({
        success: true,
        time: result.rows[0],
      });

    } catch (err) {

      console.error(
        "DB TEST ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        error: "Database unavailable",
      });
    }
  }
);

/* =========================
   START SERVER
========================= */

const PORT =
  process.env.PORT || 5000;

const server = app.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      "Uploads path:",
      path.join(
        __dirname,
        "uploads"
      )
    );

    console.log(
      "Manual QR payments enabled; automated payments disabled"
    );
  }
);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`ERROR: Port ${PORT} is already in use by another process!`);
  } else {
    console.error("SERVER ERROR:", err);
  }
  process.exit(1);
});
