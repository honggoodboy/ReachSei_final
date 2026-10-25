import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import html2canvas from "html2canvas";
import "./PaymentSuccess.css";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const rawApiUrl = (
    import.meta.env.VITE_API_URL || "http://localhost:5000"
  ).replace(/\/+$/, "");

  const fetchStatus = async () => {
    if (!orderId) {
      setError("No order ID provided in URL.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(
        `${rawApiUrl}/baray/status/${encodeURIComponent(orderId)}`
      );

      const fetchedOrder = res.data?.order;
      setOrder(fetchedOrder);

      // Always clear loading after the first successful fetch so the receipt shows immediately
      setLoading(false);

      // Continue polling silently in background if still unpaid (up to 5 times)
      if (
        fetchedOrder &&
        fetchedOrder.payment_status !== "paid" &&
        pollCount < 5
      ) {
        setTimeout(() => {
          setPollCount((prev) => prev + 1);
        }, 3000);
      }
    } catch (err) {
      console.error("Fetch order status error:", err);
      setError(
        err.response?.data?.error ||
          "Failed to verify order payment status."
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [orderId, pollCount]);

  /* =========================================================
     DOWNLOAD RECEIPT (PNG)
  ========================================================= */
  const downloadReceipt = async () => {
    const receiptBox = document.getElementById("payment-receipt-box");
    if (!receiptBox) {
      console.error("Receipt element not found.");
      return;
    }

    try {
      setDownloading(true);
      const canvas = await html2canvas(receiptBox, {
        scale: 2,
        backgroundColor: "#faf9f6",
        useCORS: true,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error("Could not create receipt image.");
          setDownloading(false);
          return;
        }

        const fileName = `Reachsei_Receipt_${order.order_code || order.id}.png`;
        const file = new File([blob], fileName, { type: "image/png" });

        // Mobile share/save sheet if supported
        if (
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          try {
            await navigator.share({
              title: "Reachsei Order Receipt",
              text: `Receipt for Order #${order.order_code || order.id}`,
              files: [file],
            });
            setDownloading(false);
            return;
          } catch (e) {
            if (e.name === "AbortError") {
              setDownloading(false);
              return;
            }
          }
        }

        // Desktop direct download
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setDownloading(false);
      }, "image/png");
    } catch (err) {
      console.error("Failed to download receipt:", err);
      setDownloading(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="payment-success-page">
        <div className="payment-card loading-card">
          <div className="payment-spinner"></div>
          <h2>Verifying Payment...</h2>
          <p>Please wait while we confirm your payment with Baray (ABA / ACLEDA).</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="payment-success-page">
        <div className="payment-card error-card">
          <div className="status-icon error-icon">✕</div>
          <h2>Payment Verification</h2>
          <p>{error || "Order details could not be found."}</p>
          <div className="action-buttons">
            <button
              onClick={() => navigate("/")}
              className="btn btn-secondary"
            >
              Go to Home
            </button>
            <button
              onClick={() => navigate("/my-orders")}
              className="btn btn-primary"
            >
              View My Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = order.payment_status === "paid";
  const items = order.items || [];
  const subtotal = Number(order.total || 0) - Number(order.delivery_fee || 0);

  return (
    <div className="payment-success-page">
      <div className="payment-card success-card">
        {/* Header Icon */}
        <div className="status-badge-wrap">
          <div
            className={`status-icon ${
              isPaid ? "success-icon" : "pending-icon"
            }`}
          >
            {isPaid ? "✓" : "⏳"}
          </div>
        </div>

        <h1 className="payment-title">
          {isPaid ? "Payment Confirmed!" : "Payment Processing"}
        </h1>

        <p className="payment-subtitle">
          {isPaid
            ? "Your payment via ABA / ACLEDA (Baray) was successful. We're now preparing your order!"
            : "Your payment has been submitted. If you just authorized it in your banking app, please allow a moment for confirmation."}
        </p>

        {/* Bank & Order Tag */}
        <div className="payment-meta-pills">
          <span className="pill pill-order">
            Order #{order.order_code || order.id}
          </span>
          <span
            className={`pill pill-status ${
              isPaid ? "status-paid" : "status-pending"
            }`}
          >
            {isPaid ? "PAID" : "PENDING CONFIRMATION"}
          </span>
          <span className="pill pill-bank">
            {order.payment_reference || "Baray (ABA / ACLEDA)"}
          </span>
        </div>

        {/* Receipt Details Box */}
        <div className="receipt-box" id="payment-receipt-box">
          <div className="receipt-header-row">
            <h3 className="receipt-store-title">REACHSEI STORE</h3>
            <span className="receipt-tag">Official Receipt</span>
          </div>

          <div className="receipt-row">
            <span>Order Code:</span>
            <strong>#{order.order_code || order.id}</strong>
          </div>
          <div className="receipt-row">
            <span>Customer Name:</span>
            <strong>{order.full_name || "Valued Customer"}</strong>
          </div>
          <div className="receipt-row">
            <span>Phone:</span>
            <strong>{order.phone || "N/A"}</strong>
          </div>
          <div className="receipt-row">
            <span>Delivery Address:</span>
            <strong>
              {order.address
                ? `${order.address}, ${order.province || ""}`
                : order.province || "N/A"}
            </strong>
          </div>

          <div className="receipt-divider"></div>

          {/* Items Breakdown */}
          <div className="receipt-items-list">
            <h4>Order Items ({items.length})</h4>
            {items.map((item, idx) => (
              <div key={item.id || idx} className="receipt-item-line">
                <div className="item-main">
                  <span className="item-name">
                    {item.name || "ReachSei Product"}
                  </span>
                  {item.size && (
                    <span className="item-size">Size: {item.size}</span>
                  )}
                  <span className="item-qty">x{item.quantity}</span>
                </div>
                <div className="item-price">
                  ${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="receipt-divider"></div>

          {/* Price Summary */}
          <div className="receipt-row summary-sub">
            <span>Subtotal:</span>
            <span>${(subtotal > 0 ? subtotal : Number(order.total)).toFixed(2)}</span>
          </div>
          <div className="receipt-row summary-sub">
            <span>Delivery Fee:</span>
            <span>${Number(order.delivery_fee || 0).toFixed(2)}</span>
          </div>
          <div className="receipt-row summary-total">
            <span>Total Paid:</span>
            <span className="total-highlight">
              ${Number(order.total || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="action-buttons">
          <button
            onClick={downloadReceipt}
            disabled={downloading}
            className="btn btn-download"
          >
            {downloading ? "Generating PNG..." : "📥 Download Receipt (PNG)"}
          </button>

          <button
            onClick={() => navigate(`/receipt?orderId=${order.id}`, { state: { order } })}
            className="btn btn-receipt"
          >
            🧾 View Full Receipt
          </button>

          <Link to="/my-orders" className="btn btn-primary">
            View My Orders
          </Link>
          <Link to="/" className="btn btn-secondary">
            Continue Shopping
          </Link>
          {!isPaid && (
            <button onClick={fetchStatus} className="btn btn-outline">
              Refresh Status
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
