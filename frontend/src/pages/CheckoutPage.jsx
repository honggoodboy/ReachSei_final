import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useCart } from "../context/CartContext";
import "./CheckoutPage.css";
import qrImage from "../assets/aba-qr.png";
import searchIcon from "../assets/search-icon.png";

const PROVINCES = [
  { name: "Pick Up", fee: 0 },
  { name: "រាជធានីភ្នំពេញ", fee: 1.5 },
  { name: "បន្ទាយមានជ័យ", fee: 2 },
  { name: "បាត់ដំបង", fee: 2 },
  { name: "កំពង់ចាម", fee: 2 },
  { name: "កំពង់ឆ្នាំង", fee: 2 },
  { name: "កំពង់ស្ពឺ", fee: 2 },
  { name: "កំពង់ធំ", fee: 2 },
  { name: "កំពត", fee: 2 },
  { name: "កណ្ដាល", fee: 2 },
  { name: "កោះកុង", fee: 2 },
  { name: "ក្រចេះ", fee: 2 },
  { name: "មណ្ឌលគិរី", fee: 2 },
  { name: "ព្រះវិហារ", fee: 2 },
  { name: "ព្រៃវែង", fee: 2 },
  { name: "ពោធិ៍សាត់", fee: 2 },
  { name: "រតនគិរី", fee: 2 },
  { name: "សៀមរាប", fee: 2 },
  { name: "ព្រះសីហនុ", fee: 2 },
  { name: "ស្ទឹងត្រែង", fee: 2 },
  { name: "ស្វាយរៀង", fee: 2 },
  { name: "តាកែវ", fee: 2 },
  { name: "ឧត្តរមានជ័យ", fee: 2 },
  { name: "កែប", fee: 2 },
  { name: "ប៉ៃលិន", fee: 2 },
  { name: "ត្បូងឃ្មុំ", fee: 2 },
];

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const provinceRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    province: "",
    address: "",
    paymentMethod: "bank",
    paymentReference: "",
  });

  const [provinceSearch, setProvinceSearch] = useState("");
  const [provinceOpen, setProvinceOpen] = useState(false);

  const [paymentProof, setPaymentProof] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /*
    =========================
    DELIVERY FEE
    Phnom Penh = $1.50
    Other provinces = $2.00
  =========================
  */

  const selectedProvince = PROVINCES.find(
    (province) => province.name === formData.province
  );

  const deliveryFee = selectedProvince?.fee ?? 0;
  const checkoutTotal = Number(cartTotal || 0) + deliveryFee;

  /*
    =========================
    CLOSE PROVINCE DROPDOWN
  =========================
  */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        provinceRef.current &&
        !provinceRef.current.contains(event.target)
      ) {
        setProvinceOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /*
    =========================
    HANDLE INPUT
  =========================
  */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /*
    =========================
    PROVINCE SELECT
  =========================
  */

  const handleProvinceSelect = (province) => {
    setFormData((prev) => ({
      ...prev,
      province: province.name,
    }));

    setProvinceSearch("");
    setProvinceOpen(false);
    setMessage("");
  };

  /*
    =========================
    PAYMENT PROOF
  =========================
  */

  const handleProofChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setPaymentProof(null);
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
    ];

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

  /*
    =========================
    ORDER ITEMS
  =========================
  */

  const orderItems = cartItems.map((item) => ({
    id: item.id,
    cartId: item.cartId,
    name: item.name,
    image: item.image,
    category: item.category,
    size: item.size || item.selectedSize || "",
    price: Number(item.price) || 0,
    quantity: Number(item.quantity) || 1,
    subtotal:
      (Number(item.price) || 0) *
      (Number(item.quantity) || 1),
  }));

  /*
    =========================
    CHECKOUT
  =========================
  */

  const handleCheckout = async (e) => {
    e.preventDefault();

    const user = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    if (cartItems.length === 0) {
      setMessage("Your cart is empty.");
      return;
    }

    if (!formData.fullName.trim()) {
      setMessage("Please enter your full name.");
      return;
    }

    if (!formData.phone.trim()) {
      setMessage("Please enter your phone number.");
      return;
    }

    if (!formData.province) {
      setMessage("Please select your province.");
      return;
    }

    if (!formData.address.trim()) {
      setMessage("Please enter your delivery address.");
      return;
    }

    if (!paymentProof) {
      setMessage("Please upload your payment screenshot.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const submitData = new FormData();

      // Guest checkout supported
      submitData.append("userId", user?.id || "");

      submitData.append(
        "fullName",
        formData.fullName.trim()
      );

      submitData.append(
        "phone",
        formData.phone.trim()
      );

      submitData.append(
        "province",
        formData.province.trim()
      );

      submitData.append(
        "address",
        formData.address.trim()
      );

      // QR / bank payment only
      submitData.append("paymentMethod", "bank");

      submitData.append(
        "paymentReference",
        formData.paymentReference.trim()
      );

      submitData.append(
        "items",
        JSON.stringify(orderItems)
      );

      /*
        Send these values for frontend/backend compatibility.
        Backend will recalculate them securely.
      */

      submitData.append(
        "subtotal",
        Number(cartTotal || 0).toFixed(2)
      );

      submitData.append(
        "deliveryFee",
        deliveryFee.toFixed(2)
      );

      submitData.append(
        "total",
        checkoutTotal.toFixed(2)
      );

      submitData.append(
        "paymentProof",
        paymentProof
      );

      await axios.post(
        `${API_BASE_URL}/orders`,
        submitData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessage("Order placed successfully!");

      clearCart();

      setFormData({
        fullName: "",
        phone: "",
        province: "",
        address: "",
        paymentMethod: "bank",
        paymentReference: "",
      });

      setProvinceSearch("");
      setProvinceOpen(false);
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

      setMessage(
        error.response?.data?.error ||
          "Failed to place order."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
    =========================
    FILTER PROVINCES
  =========================
  */

  const filteredProvinces = PROVINCES.filter(
    (province) =>
      province.name
        .toLowerCase()
        .includes(provinceSearch.toLowerCase())
  );

  return (
    <section className="checkout-page">
      <div className="checkout-container">

        {/* =========================
            CHECKOUT FORM
        ========================= */}

        <div className="checkout-form-card">

          <div className="checkout-head">
            <Link
              to="/cart"
              className="back-link"
            >
              ← Back to Cart
            </Link>
          </div>

          <h1>Checkout</h1>

          <form
            id="checkout-form"
            onSubmit={handleCheckout}
            className="checkout-form"
          >

            {/* FULL NAME */}

            <div className="checkout-field">
              <label>
                Full Name <span>*</span>
              </label>

              <input
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            {/* PHONE */}

            <div className="checkout-field">
              <label>
                Phone Number <span>*</span>
              </label>

              <input
                type="tel"
                name="phone"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            {/* PROVINCE */}

            <div
              className="checkout-field province-field"
              ref={provinceRef}
            >
              <label>
                Province <span>*</span>
              </label>

              <button
                type="button"
                className={`province-selector ${
                  provinceOpen ? "active" : ""
                }`}
                onClick={() =>
                  setProvinceOpen((prev) => !prev)
                }
              >
                <span
                  className={
                    formData.province
                      ? "selected"
                      : "placeholder"
                  }
                >
                  {formData.province ||
                    "Select province"}
                </span>

                <span className="province-arrow">
                  {provinceOpen ? "▲" : "▼"}
                </span>
              </button>

              {provinceOpen && (
                <div className="province-dropdown">

                  <div className="province-search-box">

                    <img
                      src={searchIcon}
                      alt="Search"
                      className="province-search-icon"
                    />

                    <input
                      type="text"
                      placeholder="Search province..."
                      value={provinceSearch}
                      onChange={(e) =>
                        setProvinceSearch(
                          e.target.value
                        )
                      }
                      autoFocus
                    />

                  </div>

                  <div className="province-list">

                    {filteredProvinces.length === 0 ? (
                      <div className="province-empty">
                        No province found
                      </div>
                    ) : (
                      filteredProvinces.map(
                        (province) => (
                          <button
                            type="button"
                            key={province.name}
                            className={`province-option ${
                              formData.province ===
                              province.name
                                ? "selected"
                                : ""
                            }`}
                            onClick={() =>
                              handleProvinceSelect(
                                province
                              )
                            }
                          >
                            <span>
                              {province.name}
                            </span>

                            <small>
                              ${province.fee.toFixed(2)}
                            </small>
                          </button>
                        )
                      )
                    )}

                  </div>

                </div>
              )}
            </div>

            {/* ADDRESS */}

            <div className="checkout-field">
              <label>
                Delivery Address <span>*</span>
              </label>

              <textarea
                name="address"
                placeholder="Enter your delivery address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                className="checkout-textbox"
                required
              />
            </div>

            {/* PAYMENT */}

            <div className="checkout-payment-method">

              <label>
                Payment Method
              </label>

              <div className="qr-only-payment">

                <div className="payment-radio">

                  <span className="radio-circle active">
                    ✓
                  </span>

                  <div>
                    <strong>
                      QR Payment
                    </strong>

                    <small>
                      ABA / KHQR
                    </small>
                  </div>

                </div>

              </div>

            </div>

            {/* BANK / QR PAYMENT */}

            <div className="bank-payment-box">

              <h3>
                QR Payment
              </h3>

              <p>
                Scan the QR code below to pay
                for your order.
              </p>

              <div className="bank-info">

                <p>
                  <strong>Bank:</strong>{" "}
                  ABA / KHQR
                </p>

                <p>
                  <strong>
                    Account Name:
                  </strong>{" "}
                  QUEENM BY S.YAT
                </p>

                <p>
                  <strong>
                    Account Number:
                  </strong>{" "}
                  002 278 797
                </p>

                <p>
                  <strong>
                    Amount:
                  </strong>{" "}
                  ${checkoutTotal.toFixed(2)}
                </p>

              </div>

              {/* QR */}

              <div className="qr-payment-box">

                <h4>
                  Scan ABA KHQR
                </h4>

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

                </div>

                <p className="qr-note">
                  Screenshot or download this
                  QR, pay with ABA/KHQR, then
                  upload your payment screenshot
                  below.
                </p>

              </div>

              {/* REFERENCE */}

              <div className="checkout-field">

                <label>
                  Transaction Reference

                  <small>
                    (Optional)
                  </small>
                </label>

                <input
                  type="text"
                  name="paymentReference"
                  placeholder="Enter transaction reference"
                  value={
                    formData.paymentReference
                  }
                  onChange={handleChange}
                />

              </div>

              {/* PAYMENT PROOF */}

              <label className="payment-proof-label">

                <span>
                  Upload Payment Screenshot{" "}
                  <b>*</b>
                </span>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleProofChange}
                  required
                />

              </label>

              {paymentProof && (
                <p className="payment-proof-name">
                  ✓ Selected:{" "}
                  {paymentProof.name}
                </p>
              )}

            </div>

            {/* DESKTOP / TABLET PLACE ORDER */}

            <button
              type="submit"
              disabled={loading}
              className="checkout-submit-btn desktop-place-order"
            >
              {loading
                ? "Placing Order..."
                : "Place Order"}
            </button>

          </form>

          {message && (
            <p
              className={`checkout-message ${
                message.includes("successfully")
                  ? "success"
                  : "error"
              }`}
            >
              {message}
            </p>
          )}

        </div>

        {/* =========================
            ORDER SUMMARY
        ========================= */}

        <div className="checkout-summary-card">

          <h2>
            Order Summary
          </h2>

          {cartItems.length === 0 ? (
            <p className="empty-checkout">
              Your cart is empty.
            </p>
          ) : (
            cartItems.map((item) => (
              <div
                key={
                  item.cartId ||
                  `${item.id}-${item.size}`
                }
                className="checkout-item"
              >

                <div>

                  <span className="checkout-item-name">
                    {item.name}
                  </span>

                  {item.size && (
                    <small className="checkout-item-size">
                      Size: {item.size}
                    </small>
                  )}

                  <small className="checkout-item-price">
                    Qty: {item.quantity} × $
                    {Number(item.price).toFixed(2)}
                  </small>

                </div>

                <strong>
                  $
                  {(
                    Number(item.price) *
                    Number(item.quantity)
                  ).toFixed(2)}
                </strong>

              </div>
            ))
          )}

          {/* PRICE SUMMARY */}

          <div className="checkout-price-summary">

            <div className="checkout-price-row">

              <span>
                Subtotal
              </span>

              <strong>
                ${Number(cartTotal || 0).toFixed(2)}
              </strong>

            </div>

            <div className="checkout-price-row delivery">

              <span>
                Delivery Fee
              </span>

              <strong>
                {formData.province
                  ? `$${deliveryFee.toFixed(2)}`
                  : "Select province"}
              </strong>

            </div>

            {formData.province && (
              <small className="delivery-province">
                {formData.province}
              </small>
            )}

            <div className="checkout-total">

              <span>
                Total
              </span>

              <strong>
                $
                {checkoutTotal.toFixed(2)}
              </strong>

            </div>

          </div>

          {/* PAYMENT NOTE */}

          <div className="checkout-payment-note">

            <p>
              Payment:{" "}
              <strong>
                QR Payment
              </strong>
            </p>

            <small>
              Your payment will be reviewed
              by admin after you upload your
              payment proof.
            </small>

          </div>

        </div>

        {/* =========================
            MOBILE PLACE ORDER
        ========================= */}

        <button
          type="submit"
          form="checkout-form"
          disabled={loading}
          className="checkout-submit-btn mobile-place-order"
        >
          {loading
            ? "Placing Order..."
            : "Place Order"}
        </button>

      </div>
    </section>
  );
}