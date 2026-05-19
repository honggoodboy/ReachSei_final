import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./MyOrders.css";

export default function MyOrders() {
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const orderSteps = ["pending", "confirmed", "shipped", "delivered"];

  const getStepIndex = (status) => {
    return orderSteps.indexOf(status);
  };

  const formatStatus = (status) => {
    if (!status) return "Unknown";
    return status.replace("_", " ");
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";

    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    return `${API_BASE_URL}${imagePath}`;
  };

  const fetchOrders = async () => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.get(`${API_BASE_URL}/orders/user/${user.id}`);

      setOrders(res.data);
    } catch (error) {
      console.error("Fetch my orders error:", error);
      alert("Failed to load your orders.");
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (id) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order?"
    );

    if (!confirmCancel) return;

    try {
      await axios.put(`${API_BASE_URL}/orders/${id}/cancel`);

      setOrders((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, status: "cancelled" } : order
        )
      );
    } catch (error) {
      console.error("Cancel order error:", error);
      alert(error.response?.data?.error || "Failed to cancel order.");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [API_BASE_URL, navigate]);

  if (loading) {
    return (
      <section className="my-orders-page">
        <div className="my-orders-container">
          <p>Loading your orders...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="my-orders-page">
      <div className="my-orders-container">
        <div className="my-orders-head">
          <div>
            <h1>My Orders</h1>
            <p>Track your order history, payment, and delivery status.</p>
          </div>

          <Link to="/" className="my-orders-back">
            ← Continue Shopping
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="no-orders">
            <h2>No orders yet</h2>
            <p>You have no orders yet.</p>

            <Link to="/" className="shop-btn">
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="my-orders-list">
            {orders.map((order) => {
              const paymentMethod =
                order.payment_method || order.paymentMethod || "cash";

              const paymentStatus = order.payment_status || "unpaid";

              const orderCode = order.order_code || order.orderCode || order.id;

              return (
                <div key={order.id} className="my-order-card">
                  <div className="my-order-top">
                    <div>
                      <h3>Order #{orderCode}</h3>

                      {order.order_code && (
                        <p className="my-order-db-id">
                          Reference ID: {order.id}
                        </p>
                      )}

                      <p>
                        {order.created_at
                          ? new Date(order.created_at).toLocaleString()
                          : "No date"}
                      </p>
                    </div>

                    <div className="my-order-badges">
                      <span className={`order-status status-${order.status}`}>
                        {formatStatus(order.status)}
                      </span>
                    </div>
                  </div>

                  {order.status !== "cancelled" && (
                    <div className="order-progress">
                      {orderSteps.map((step, index) => (
                        <div
                          key={step}
                          className={`progress-step ${
                            index <= getStepIndex(order.status) ? "active" : ""
                          }`}
                        >
                          <div className="progress-dot">{index + 1}</div>
                          <span>{formatStatus(step)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="my-order-payment-info">
                    <p>
                      <strong>Payment Method:</strong>{" "}
                      {paymentMethod === "bank"
                        ? "Bank Transfer"
                        : "Cash on Delivery"}
                    </p>

                    <p>
                      <strong>Payment Status:</strong>{" "}
                      <span
                        className={`payment-status payment-${paymentStatus}`}
                      >
                        {formatStatus(paymentStatus)}
                      </span>
                    </p>

                    {order.payment_reference && (
                      <p>
                        <strong>Reference:</strong> {order.payment_reference}
                      </p>
                    )}

                    {order.payment_proof && (
                      <p>
                        <strong>Payment Proof:</strong>{" "}
                        <a
                          href={getImageUrl(order.payment_proof)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View uploaded proof
                        </a>
                      </p>
                    )}
                  </div>

                  {order.customer_note && (
                    <div className="my-order-note">
                      <strong>Your Note:</strong>
                      <p>{order.customer_note}</p>
                    </div>
                  )}

                  {order.admin_note && (
                    <div className="my-admin-note">
                      <strong>Message from Reachsei:</strong>
                      <p>{order.admin_note}</p>
                    </div>
                  )}

                  <div className="my-order-items">
                    {order.items?.map((item) => (
                      <div
                        key={
                          item.cartId ||
                          `${item.id}-${
                            item.size || item.selectedSize || "default"
                          }`
                        }
                        className="my-order-item"
                      >
                        <img src={getImageUrl(item.image)} alt={item.name} />

                        <div>
                          <strong>{item.name}</strong>

                          <p className="my-order-category">
                            {item.category || "Product"}
                          </p>

                          <p className="my-order-size">
                            Size: {item.size || item.selectedSize || "No size"}
                          </p>

                          <p>
                            Qty: {item.quantity} × $
                            {Number(item.price || 0).toFixed(2)}
                          </p>

                          <p>
                            Subtotal: $
                            {(
                              Number(item.price || 0) *
                              Number(item.quantity || 1)
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="my-order-total">
                    Total:{" "}
                    <strong>${Number(order.total || 0).toFixed(2)}</strong>
                  </div>

                  <div className="my-order-actions">
                    {order.status === "pending" && (
                      <button
                        type="button"
                        className="cancel-order-btn"
                        onClick={() => cancelOrder(order.id)}
                      >
                        Cancel Order
                      </button>
                    )}

                    <Link to="/contact" className="contact-support-btn">
                      Contact Support
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}