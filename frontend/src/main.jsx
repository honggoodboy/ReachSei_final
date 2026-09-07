import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";

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

import "./index.css";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLayout from "./components/AdminLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyOrders from "./pages/MyOrders";
import AdminReviews from "./pages/AdminReviews";
import { WishlistProvider } from "./context/WishlistContext";
import WishlistPage from "./pages/WishlistPage";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import ChangePassword from "./pages/ChangePassword";
import NewsletterPage from "./pages/NewsletterPage";
import ContactPage from "./pages/ContactPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ShopLayout from "./components/ShopLayout";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <CartProvider>
        <WishlistProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
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
                element={
                  <ShopLayout>
                    <Register />
                  </ShopLayout>
                }
              />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/my-orders"
                element={
                  <ShopLayout>
                    <MyOrders />
                  </ShopLayout>
                }
              />
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
              <Route
                path="/forgot-password"
                element={
                  <ShopLayout>
                    <ForgotPassword />
                  </ShopLayout>
                }
              />
              <Route
                path="/reset-password/:token"
                element={
                  <ShopLayout>
                    <ResetPassword />
                  </ShopLayout>
                }
              />
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
  </React.StrictMode>,
);
