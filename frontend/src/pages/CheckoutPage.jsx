import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useCart } from "../context/CartContext";
import "./CheckoutPage.css";
import qrImage from "../img/aba-qr.png";
export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    customerNote: "",
    paymentMethod: "cash",
    paymentReference: "",
  });

  const [paymentProof, setPaymentProof] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProofChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      setPaymentProof(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Please upload only JPG, PNG, or WEBP image.");
      e.target.value = "";
      setPaymentProof(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Payment proof image must be less than 5MB.");
      e.target.value = "";
      setPaymentProof(null);
      return;
    }

    setMessage("");
    setPaymentProof(file);
  };

  const orderItems = cartItems.map((item) => ({
    id: item.id,
    cartId: item.cartId,
    name: item.name,
    image: item.image,
    category: item.category,
    size: item.size || item.selectedSize || "",
    price: Number(item.price) || 0,
    quantity: Number(item.quantity) || 1,
    subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 1),
  }));

  const handleCheckout = async (e) => {
  e.preventDefault();

  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (cartItems.length === 0) {
    setMessage("Your cart is empty.");
    return;
  }

  if (formData.paymentMethod === "bank" && !paymentProof) {
    setMessage("Please upload your bank transfer screenshot.");
    return;
  }

  try {
    setLoading(true);
    setMessage("");

    const submitData = new FormData();

    // Guest checkout supported
    submitData.append("userId", user?.id || "");

    submitData.append("fullName", formData.fullName.trim());
    submitData.append("phone", formData.phone.trim());
    submitData.append("address", formData.address.trim());
    submitData.append("customerNote", formData.customerNote.trim());
    submitData.append("paymentMethod", formData.paymentMethod);
    submitData.append("paymentReference", formData.paymentReference.trim());
    submitData.append("items", JSON.stringify(orderItems));
    submitData.append("total", cartTotal);

    if (paymentProof) {
      submitData.append("paymentProof", paymentProof);
    }

    await axios.post(`${API_BASE_URL}/orders`, submitData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    setMessage("Order placed successfully!");
    clearCart();

    setFormData({
      fullName: "",
      phone: "",
      address: "",
      customerNote: "",
      paymentMethod: "cash",
      paymentReference: "",
    });

    setPaymentProof(null);

    setTimeout(() => {
      if (user) {
        navigate("/my-orders");
      } else {
        navigate("/");
      }
    }, 1500);
  } catch (error) {
    console.error("Checkout error:", error);
    setMessage(error.response?.data?.error || "Failed to place order.");
  } finally {
    setLoading(false);
  }
};

  return (
    <section className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-form-card">
          <div className="checkout-head">
            <Link to="/cart" className="back-link">
              ← Back to Cart
            </Link>
          </div>

          <h1>Checkout</h1>

          <form onSubmit={handleCheckout} className="checkout-form">
            <input
              type="text"
              name="fullName"
              placeholder="Full name"
              value={formData.fullName}
              onChange={handleChange}
              required
            />

            <input
              type="text"
              name="phone"
              placeholder="Phone number"
              value={formData.phone}
              onChange={handleChange}
              required
            />

            <textarea
              name="address"
              placeholder="Delivery address"
              value={formData.address}
              onChange={handleChange}
              rows="1"
              className="checkout-textbox"
              required
            />

            <textarea
              name="customerNote"
              placeholder="Order note optional:..."
              value={formData.customerNote}
              onChange={handleChange}
              rows="1"
              className="checkout-textbox"
            />

            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
            >
              <option value="cash">Cash on Delivery</option>
              <option value="bank">Bank Transfer</option>
            </select>

            {formData.paymentMethod === "bank" && (
              <div className="bank-payment-box">
                <h3>Bank Transfer Payment</h3>

                <p>
                  Please transfer to Reachsei Store, then upload your payment
                  screenshot below.
                </p>

                <div className="bank-info">
                  <p>
                    <strong>Bank:</strong> ABA / KHQR
                  </p>
                  <p>
                    <strong>Account Name:</strong> QUEENM BY S.YAT
                  </p>
                  <p>
                    <strong> Account Number:</strong> 002 278 797
                  </p>
                  <p>
                    <strong>Amount:</strong> ${cartTotal.toFixed(2)}
                  </p>
                </div>

                <div className="qr-payment-box">
                  <h4>Scan ABA KHQR</h4>

                  <img
                    src={qrImage}
                    alt="ABA KHQR payment"
                    className="aba-qr-image"
                  />

                  <div className="qr-actions">
                    <a
                      href={qrImage}
                      download
                      className="download-qr-btn"
                    >
                      Download QR
                    </a>

                    {/* <a
                      href="/images/aba-qr.png"
                      target="_blank"
                      rel="noreferrer"
                      className="open-qr-btn"
                    >
                      Open QR
                    </a> */}
                  </div>

                  <p className="qr-note">
                    Screenshot or download this QR, pay with ABA/KHQR, then
                    upload your payment screenshot below.
                  </p>
                </div>

                <input
                  type="text"
                  name="paymentReference"
                  placeholder="Transaction reference / note optional"
                  value={formData.paymentReference}
                  onChange={handleChange}
                />

                <label className="payment-proof-label">
                  Upload payment screenshot
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleProofChange}
                    required={formData.paymentMethod === "bank"}
                  />
                </label>

                {paymentProof && (
                  <p className="payment-proof-name">
                    Selected: {paymentProof.name}
                  </p>
                )}
              </div>
            )}

            <button type="submit" disabled={loading}>
              {loading ? "Placing Order..." : "Place Order"}
            </button>
          </form>

          {message && <p className="checkout-message">{message}</p>}
        </div>

        <div className="checkout-summary-card">
          <h2>Order Summary</h2>

          {cartItems.map((item) => (
            <div
              key={item.cartId || `${item.id}-${item.size}`}
              className="checkout-item"
            >
              <div>
                <span className="checkout-item-name">{item.name}</span>

                {item.size && (
                  <small className="checkout-item-size">
                    Size: {item.size}
                  </small>
                )}

                <small className="checkout-item-price">
                  Qty: {item.quantity} × ${Number(item.price).toFixed(2)}
                </small>
              </div>

              <strong>
                ${(Number(item.price) * Number(item.quantity)).toFixed(2)}
              </strong>
            </div>
          ))}

          <div className="checkout-total">
            <span>Total</span>
            <strong>${cartTotal.toFixed(2)}</strong>
          </div>

          <div className="checkout-payment-note">
            <p>
              Payment:{" "}
              <strong>
                {formData.paymentMethod === "cash"
                  ? "Cash on Delivery"
                  : "Bank Transfer"}
              </strong>
            </p>

            {formData.customerNote && (
              <p>
                Note: <strong>{formData.customerNote}</strong>
              </p>
            )}

            {formData.paymentMethod === "bank" && (
              <small>
                Your payment will be reviewed by admin after you upload proof.
              </small>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}