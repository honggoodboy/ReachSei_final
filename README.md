# Reachsei Store

Reachsei Store is an online storefront with a React frontend, an Express API, and a PostgreSQL database. It includes product browsing, a cart, checkout, customer accounts, order history, receipts, and admin management pages.

## Current payment plan

For the initial one-month trial, use **manual QR payments only**:

1. The customer reviews the cart and selects pickup or delivery.
2. The customer downloads the store QR code and pays through their banking app.
3. The customer uploads a screenshot of the completed payment as proof.
4. The backend creates the order with payment status `pending_review`.
5. An admin checks the actual bank transaction, amount, and reference before marking payment `paid` or `rejected`.

Uploading a screenshot is not payment approval. Payment status and fulfillment status are separate.

ABA PayWay and Baray automated payments are reserved for later testing. Their source files remain in the project. The server currently blocks all PayWay endpoints and Baray mutation endpoints; Baray read endpoints remain available for existing status and receipt pages. Order creation accepts only the `bank` payment method and requires proof. Do not enable automated payment routes without a separate review and explicit approval.

Current delivery fees:

| Method | Fee |
| --- | --- |
| Pickup | $0.00 |
| Phnom Penh delivery | $1.50 |
| Other provinces | $2.00 |

The backend calculates product prices and delivery fees. Never trust totals supplied by the browser.

## Project structure

```text
backend/
  server.js          Express entry point and route registration
  db.js              PostgreSQL connection
  middleware/        Authentication middleware
  routes/            Products, orders, accounts, reviews, payment providers
  utils/             Cloudinary uploads, email, Telegram notifications
  sql/               Partial database changes
frontend/
  src/components/    Storefront and admin components
  src/context/       Cart, wishlist, and toast state
  src/pages/         Customer and admin screens
  src/assets/        Images, including the manual payment QR
  src/main.jsx       Frontend entry point and routing
```

## Local setup

Install Node.js/npm and prepare a PostgreSQL database compatible with the application. Use a Node version supported by the installed Vite version.

From the project root:

```sh
npm run install:all
```

Create `backend/.env` with your own values:

```dotenv
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-password
FRONTEND_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Cloudinary is used for product images and payment proof uploads. Optional features also reference `EMAIL_USER`, `EMAIL_PASS`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `GOOGLE_SHEET_WEBAPP_URL`, and KOOMPI authentication settings. Configure those only when testing the corresponding features. Automated payment credentials are not required for the manual QR trial.

Create `frontend/.env.local`:

```dotenv
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Supabase settings support the frontend authentication integration. Values prefixed with `VITE_` are exposed to the browser; never put server secrets there. Keep real environment files and credentials out of Git.

The repository does not include a complete database schema or a full migration setup. The SQL directory contains partial changes only. Obtain the existing schema or document a complete migration before attempting a fresh database installation. `db.js` currently configures SSL for PostgreSQL; local database settings may need adjustment.

Start the API and frontend in separate terminals, from the project root:

```sh
npm run dev:backend
```

```sh
npm run dev:frontend
```

The API defaults to port 5000. Open the frontend URL printed by Vite, normally `http://localhost:5173`.
