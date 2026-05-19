import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <CartProvider>
        <WishlistProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/products/:category" element={<Products />} />
              <Route path="/products/detail/:id" element={<ProductDetail />} />
              <Route path="/search" element={<Products />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/profile/password" element={<ChangePassword />} />
              <Route path="/newsletter" element={<NewsletterPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
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
