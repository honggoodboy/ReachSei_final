
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import { WishlistProvider } from "./context/WishlistContext";

import App from "./App";
import AddProduct from "./components/AddProduct";
import Products from "./components/Products";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import AdminOrders from "./pages/AdminOrders";
import ProductDetail from "./pages/ProductDetail";
import AdminProducts from "./pages/AdminProducts";
import EditProduct from "./pages/EditProduct";
import AdminLogin from "./pages/AdminLogin";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLayout from "./components/AdminLayout";
import ShopLayout from "./components/ShopLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback.jsx";
import MyOrders from "./pages/MyOrders";
import AdminReviews from "./pages/AdminReviews";
import WishlistPage from "./pages/WishlistPage";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import ChangePassword from "./pages/ChangePassword";
import NewsletterPage from "./pages/NewsletterPage";
import ContactPage from "./pages/ContactPage";
import ReceiptPage from "./pages/ReceiptPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import TelegramCallback from "./pages/TelegramCallback.jsx";
import KoompiCallback from "./pages/KoompiCallback.jsx";
import "./index.css";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AuthHashHandler() {
  const location = useLocation();

  useEffect(() => {
    if (
      window.location.hash &&
      window.location.hash.includes("access_token=") &&
      location.pathname !== "/auth/callback"
    ) {
      window.location.replace(`/auth/callback${window.location.hash}`);
    } else if (
      window.location.hash &&
      window.location.hash.includes("tgAuthResult=") &&
      location.pathname !== "/auth/telegram/callback"
    ) {
      window.location.replace(`/auth/telegram/callback${window.location.hash}`);
    }
  }, [location]);

  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <CartProvider>
        <WishlistProvider>
          <BrowserRouter>
            <ScrollToTop />
            <AuthHashHandler />

            <Routes>
              {/* Main shop */}
              <Route
                path="/"
                element={
                  <ShopLayout>
                    <App />
                  </ShopLayout>
                }
              />

              <Route
                path="/products/:category"
                element={
                  <ShopLayout>
                    <Products />
                  </ShopLayout>
                }
              />

              <Route
                path="/products/detail/:id"
                element={
                  <ShopLayout>
                    <ProductDetail />
                  </ShopLayout>
                }
              />

              <Route
                path="/search"
                element={
                  <ShopLayout>
                    <Products />
                  </ShopLayout>
                }
              />

              {/* Cart and checkout */}
              <Route
                path="/cart"
                element={
                  <ShopLayout>
                    <CartPage />
                  </ShopLayout>
                }
              />

              <Route
                path="/checkout"
                element={
                  <ShopLayout>
                    <CheckoutPage />
                  </ShopLayout>
                }
              />

              {/* Authentication */}
              <Route
                path="/login"
                element={
                  <ShopLayout>
                    <Login />
                  </ShopLayout>
                }
              />

              <Route
                path="/register"
                element={<Navigate to="/login" replace />}
              />

              {/* Google OAuth callback */}
              <Route
                path="/auth/callback"
                element={<AuthCallback />}
              />
              <Route
                path="/auth/telegram/callback"
                element={<TelegramCallback />}
              />
              <Route
                path="/auth/koompi/callback"
                element={<KoompiCallback />}
              />

              <Route
                path="/forgot-password"
                element={<Navigate to="/login" replace />}
              />

              <Route
                path="/reset-password/:token"
                element={<Navigate to="/login" replace />}
              />

              {/* Orders and receipts */}
              <Route
                path="/receipt"
                element={
                  <ShopLayout>
                    <ReceiptPage />
                  </ShopLayout>
                }
              />

              <Route
                path="/my-orders"
                element={
                  <ShopLayout>
                    <MyOrders />
                  </ShopLayout>
                }
              />

              {/* Customer pages */}
              <Route
                path="/wishlist"
                element={
                  <ShopLayout>
                    <WishlistPage />
                  </ShopLayout>
                }
              />

              <Route
                path="/profile"
                element={
                  <ShopLayout>
                    <Profile />
                  </ShopLayout>
                }
              />

              <Route
                path="/profile/edit"
                element={
                  <ShopLayout>
                    <EditProfile />
                  </ShopLayout>
                }
              />

              <Route
                path="/profile/password"
                element={
                  <ShopLayout>
                    <ChangePassword />
                  </ShopLayout>
                }
              />

              <Route
                path="/newsletter"
                element={
                  <ShopLayout>
                    <NewsletterPage />
                  </ShopLayout>
                }
              />

              <Route
                path="/contact"
                element={
                  <ShopLayout>
                    <ContactPage />
                  </ShopLayout>
                }
              />

              {/* Admin login */}
              <Route
                path="/admin/login"
                element={<AdminLogin />}
              />

              {/* Admin dashboard */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout>
                      <AdminDashboard />
                    </AdminLayout>
                  </ProtectedAdminRoute>
                }
              />

              <Route
                path="/admin/products"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout>
                      <AdminProducts />
                    </AdminLayout>
                  </ProtectedAdminRoute>
                }
              />

              <Route
                path="/admin/products/new"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout>
                      <AddProduct />
                    </AdminLayout>
                  </ProtectedAdminRoute>
                }
              />

              <Route
                path="/admin/products/edit/:id"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout>
                      <EditProduct />
                    </AdminLayout>
                  </ProtectedAdminRoute>
                }
              />

              <Route
                path="/admin/orders"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout>
                      <AdminOrders />
                    </AdminLayout>
                  </ProtectedAdminRoute>
                }
              />

              <Route
                path="/admin/reviews"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout>
                      <AdminReviews />
                    </AdminLayout>
                  </ProtectedAdminRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </WishlistProvider>
      </CartProvider>
    </ToastProvider>
  </React.StrictMode>
);
