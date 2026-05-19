import { useEffect, useState } from "react";
import axios from "axios";
import "./AdminOrders.css";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [openOrderId, setOpenOrderId] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("adminToken");

  const fetchOrders = () => {
    axios
      .get(`${API_BASE_URL}/orders`)
      .then((res) => {
        setOrders(res.data);
      })
      .catch((err) => console.error("Fetch orders error:", err));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await axios.put(
        `${API_BASE_URL}/orders/${id}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      fetchOrders();
    } catch (error) {
      console.error("Update order status error:", error);
      alert("Failed to update order status.");
    }
  };

  const updatePaymentStatus = async (id, paymentStatus) => {
    try {
      await axios.put(
        `${API_BASE_URL}/orders/${id}/payment-status`,
        { paymentStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      fetchOrders();
    } catch (error) {
      console.error("Update payment status error:", error);
      alert("Failed to update payment status.");
    }
  };

  const updateAdminNote = async (id, adminNote) => {
    try {
      await axios.put(
        `${API_BASE_URL}/orders/${id}/admin-note`,
        { adminNote },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOrders((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, admin_note: adminNote } : order
        )
      );

      alert("Admin note saved.");
    } catch (error) {
      console.error("Update admin note error:", error);
      alert("Failed to save admin note.");
    }
  };

  const deleteOrder = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to remove this order?"
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_BASE_URL}/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setOrders((prev) => prev.filter((order) => order.id !== id));
    } catch (error) {
      console.error("Delete order error:", error);
      alert("Failed to delete order. Please check your backend delete API.");
    }
  };

  const copyPhone = async (phone) => {
    try {
      await navigator.clipboard.writeText(phone);
      alert("Phone number copied!");
    } catch (error) {
      console.error("Copy phone error:", error);
      alert("Failed to copy phone number.");
    }
  };

  const getTelegramLink = (phone) => {
    if (!phone) return "#";

    const cleanPhone = phone.replace(/\s/g, "").replace(/-/g, "");

    if (cleanPhone.startsWith("+")) {
      return `https://t.me/${cleanPhone}`;
    }

    if (cleanPhone.startsWith("0")) {
      return `https://t.me/+855${cleanPhone.slice(1)}`;
    }

    return `https://t.me/${cleanPhone}`;
  };

  const getOrderItems = (order) => {
    if (!order.items) return [];

    if (Array.isArray(order.items)) {
      return order.items;
    }

    try {
      return JSON.parse(order.items);
    } catch {
      return [];
    }
  };

  const getItemSize = (item) => {
    return (
      item.size ||
      item.selectedSize ||
      item.selected_size ||
      item.productSize ||
      item.product_size ||
      ""
    );
  };

  const getItemPrice = (item) => {
    return Number(item.price || item.unitPrice || item.product_price || 0);
  };

  const getItemQuantity = (item) => {
    return Number(item.quantity || item.qty || 1);
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";

    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    return `${API_BASE_URL}${imagePath}`;
  };

  const getPaymentStatusClass = (status) => {
    return `payment-${status || "unpaid"}`;
  };

  const formatText = (text) => {
    if (!text) return "Unknown";
    return text.replace("_", " ");
  };

  return (
    <section className="admin-orders-page">
      <div className="admin-orders-container">
        <h1>Admin Orders</h1>

        <div className="orders-table">
          {orders.length === 0 ? (
            <div className="empty-admin-orders">
              <p>No orders found.</p>
            </div>
          ) : (
            orders.map((order) => {
              const items = getOrderItems(order);
              const paymentMethod =
                order.payment_method || order.paymentMethod || "cash";
              const paymentStatus = order.payment_status || "unpaid";
              const paymentProof = order.payment_proof;
              const paymentReference = order.payment_reference;
              const isOpen = openOrderId === order.id;
              const orderCode = order.order_code || order.orderCode || order.id;

              return (
                <div key={order.id} className="order-card clean-order-card">
                  <button
                    type="button"
                    className="delete-order-btn"
                    onClick={() => deleteOrder(order.id)}
                  >
                    ×
                  </button>

                  <div className="order-summary-main">
                    <div className="order-summary-info">
                      <h3>Order #{orderCode}</h3>

                      {order.order_code && (
                        <p>
                          <strong>Database ID:</strong> {order.id}
                        </p>
                      )}

                      <p>
                        <strong>Customer:</strong>{" "}
                        {order.full_name || order.fullName || "Unknown"}
                      </p>

                      <p>
                        <strong>Phone:</strong> {order.phone || "No phone"}
                      </p>

                      <p>
                        <strong>Total:</strong> $
                        {Number(order.total || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="order-summary-status">
                      <span className={`admin-status status-${order.status}`}>
                        {formatText(order.status)}
                      </span>

                      <span
                        className={`admin-payment-status ${getPaymentStatusClass(
                          paymentStatus
                        )}`}
                      >
                        {formatText(paymentStatus)}
                      </span>
                    </div>

                    <div className="order-summary-actions">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          updateStatus(order.id, e.target.value)
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <button
                        type="button"
                        className="view-details-btn"
                        onClick={() => setOpenOrderId(isOpen ? null : order.id)}
                      >
                        {isOpen ? "Hide Details" : "View Details"}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="admin-order-details">
                      <div className="details-grid">
                        <div className="details-box">
                          <h4>Customer Details</h4>

                          <p>
                            <strong>Address:</strong>{" "}
                            {order.address || "No address"}
                          </p>

                          <p>
                            <strong>Date:</strong>{" "}
                            {order.created_at
                              ? new Date(order.created_at).toLocaleString()
                              : "No date"}
                          </p>

                          {order.phone && (
                            <div className="admin-contact-actions">
                              <a
                                href={`tel:${order.phone}`}
                                className="admin-contact-btn"
                              >
                                Call
                              </a>

                              <button
                                type="button"
                                className="admin-contact-btn"
                                onClick={() => copyPhone(order.phone)}
                              >
                                Copy Phone
                              </button>

                              <a
                                href={getTelegramLink(order.phone)}
                                target="_blank"
                                rel="noreferrer"
                                className="admin-contact-btn telegram-btn"
                              >
                                Telegram
                              </a>
                            </div>
                          )}

                          {order.customer_note ? (
                            <div className="admin-note-box customer-note-box">
                              <strong>Customer Note:</strong>
                              <p>{order.customer_note}</p>
                            </div>
                          ) : (
                            <p className="empty-note">No customer note</p>
                          )}
                        </div>

                        <div className="details-box">
                          <h4>Payment Details</h4>

                          <p>
                            <strong>Method:</strong>{" "}
                            {paymentMethod === "bank"
                              ? "Bank Transfer"
                              : "Cash on Delivery"}
                          </p>

                          <p>
                            <strong>Status:</strong>{" "}
                            <span
                              className={`admin-payment-status ${getPaymentStatusClass(
                                paymentStatus
                              )}`}
                            >
                              {formatText(paymentStatus)}
                            </span>
                          </p>

                          {paymentReference && (
                            <p>
                              <strong>Reference:</strong> {paymentReference}
                            </p>
                          )}

                          {paymentProof ? (
                            <div className="payment-proof-box">
                              <p>
                                <strong>Payment Proof:</strong>
                              </p>

                              <a
                                href={getImageUrl(paymentProof)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={getImageUrl(paymentProof)}
                                  alt="Payment proof"
                                  className="payment-proof-img"
                                />
                              </a>
                            </div>
                          ) : (
                            <p className="no-payment-proof">No payment proof</p>
                          )}

                          <div className="payment-action-buttons">
                            <button
                              type="button"
                              className="mark-paid-btn"
                              onClick={() =>
                                updatePaymentStatus(order.id, "paid")
                              }
                            >
                              Mark Paid
                            </button>

                            <button
                              type="button"
                              className="reject-payment-btn"
                              onClick={() =>
                                updatePaymentStatus(order.id, "rejected")
                              }
                            >
                              Reject
                            </button>

                            <button
                              type="button"
                              className="pending-payment-btn"
                              onClick={() =>
                                updatePaymentStatus(
                                  order.id,
                                  "pending_review"
                                )
                              }
                            >
                              Pending Review
                            </button>
                          </div>
                        </div>

                        <div className="details-box">
                          <h4>Admin Note</h4>

                          <textarea
                            placeholder="Write note for customer..."
                            defaultValue={order.admin_note || ""}
                            rows="4"
                            onBlur={(e) =>
                              updateAdminNote(order.id, e.target.value)
                            }
                          />

                          <small>
                            This message will show to customer in My Orders.
                          </small>
                        </div>
                      </div>

                      <div className="order-items clean-order-items">
                        <h4>Items</h4>

                        {items.length === 0 ? (
                          <p>No items found.</p>
                        ) : (
                          items.map((item, index) => {
                            const size = getItemSize(item);
                            const price = getItemPrice(item);
                            const quantity = getItemQuantity(item);

                            return (
                              <div
                                key={item.cartId || item.id || index}
                                className="order-item"
                              >
                                <img
                                  src={getImageUrl(item.image)}
                                  alt={item.name || "Product"}
                                />

                                <div>
                                  <p>{item.name || "Product"}</p>

                                  <small className="admin-order-size">
                                    Size: {size || "No size"}
                                  </small>

                                  <small>
                                    Qty: {quantity} × ${price.toFixed(2)}
                                  </small>

                                  <small>
                                    Subtotal: ${(price * quantity).toFixed(2)}
                                  </small>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}