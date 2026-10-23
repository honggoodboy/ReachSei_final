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
import paywayRoutes from "./routes/payway.routes.js";
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

app.use(
  "/api/payway",
  paywayRoutes
);
app.use(
  "/api/baray",
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

/* Aliases for Telegram auth at root path */
app.get("/telegram/login", (req, res) => {
  res.redirect("/users/telegram/login");
});
app.post("/telegram-login", (req, res, next) => {
  req.url = "/telegram-login";
  userAuthRoutes(req, res, next);
});

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
        error: err.message,
        code: err.code,
        detail: err.detail,
        stack: err.stack,
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
      "PayWay route: /api/payway"
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