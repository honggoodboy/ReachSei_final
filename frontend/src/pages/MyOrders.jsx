import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./MyOrders.css";

const stepLabels = ["pending", "confirmed", "shipped", "delivered"];
const filters = [
  { value: "all", label: "All orders" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

function formatStatus(status) {
  if (!status) return "Unknown";
  return status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function MyOrders() {
  const rawApiUrl = import.meta.env.VITE_API_URL || "";
  const API_BASE_URL =
    window.location.hostname !== "localhost" && (!rawApiUrl || rawApiUrl.includes("localhost"))
      ? "https://reachsei-final.onrender.com"
      : rawApiUrl || "http://localhost:5000";

  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("userToken");
    if (!user) {
      navigate("/login");
      return undefined;
    }

    let active = true;
    axios.get(API_BASE_URL + "/orders/user/" + user.id, {
      headers: token ? { Authorization: "Bearer " + token } : {},
    })
      .then(({ data }) => {
        if (active) setOrders(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Fetch my orders error:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("userToken");
          localStorage.removeItem("user");
          alert("Session expired – please log in again.");
          navigate("/login");
        } else {
          alert("Unable to load orders.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [API_BASE_URL, navigate]);

  const cancelOrder = async (id) => {
    if (!window.confirm("Cancel this order?")) return;
    const token = localStorage.getItem("userToken");
    try {
      await axios.put(API_BASE_URL + "/orders/" + id + "/cancel", {}, {
        headers: token ? { Authorization: "Bearer " + token } : {},
      });
      setOrders((current) =>
        current.map((order) =>
          order.id === id ? { ...order, status: "cancelled" } : order
        )
      );
    } catch (error) {
      console.error("Cancel order error:", error);
      alert(error.response?.data?.error || "Failed to cancel order.");
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";
    return imagePath.startsWith("http") ? imagePath : API_BASE_URL + imagePath;
  };

  const getStepIndex = (status) => {
    const normalized = status === "processing" ? "confirmed" : status;
    return stepLabels.indexOf(normalized);
  };

  const filterCounts = useMemo(() => filters.reduce((counts, filter) => {
    counts[filter.value] = filter.value === "all"
      ? orders.length
      : orders.filter((order) => filter.value === "confirmed"
        ? ["confirmed", "processing"].includes(order.status)
        : order.status === filter.value).length;
    return counts;
  }, {}), [orders]);

  const visibleOrders = useMemo(
    () => activeFilter === "all"
      ? orders
      : orders.filter((order) => activeFilter === "confirmed"
        ? ["confirmed", "processing"].includes(order.status)
        : order.status === activeFilter),
    [activeFilter, orders]
  );

  if (loading) {
    return (
      <main className="my-orders-page">
        <div className="my-orders-container">
          <div className="orders-loading" role="status">Loading your orders…</div>
        </div>
      </main>
    );
  }

  return (
    <main className="my-orders-page">
      <div className="my-orders-container">
        <header className="my-orders-header">
          <div>
            <p className="orders-eyebrow">ACCOUNT / ORDER HISTORY</p>
            <h1>My Orders</h1>
            <p className="orders-intro">Follow your ReachSei purchases from payment review through delivery.</p>
          </div>
          <div className="orders-count" aria-label={orders.length + " total orders"}>
            <strong>{orders.length}</strong>
            <span>{orders.length === 1 ? "order" : "orders"}</span>
          </div>
        </header>

        {orders.length > 0 && (
          <nav className="order-filters" aria-label="Filter orders">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={"order-filter " + (activeFilter === filter.value ? "active" : "")}
                aria-pressed={activeFilter === filter.value}
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
                <span>{filterCounts[filter.value] || 0}</span>
              </button>
            ))}
          </nav>
        )}

        {orders.length === 0 ? (
          <section className="orders-empty">
            <span className="empty-mark" aria-hidden="true">RS</span>
            <h2>Your next game starts here.</h2>
            <p>You haven’t placed an order yet. Explore the collection and find your next court-ready essential.</p>
            <Link to="/" className="shop-btn">Explore the collection</Link>
          </section>
        ) : visibleOrders.length === 0 ? (
          <section className="orders-empty orders-empty-filtered">
            <h2>No {activeFilter} orders</h2>
            <p>Choose another status to see more of your order history.</p>
            <button type="button" className="clear-filter-btn" onClick={() => setActiveFilter("all")}>
              Show all orders
            </button>
          </section>
        ) : (
          <div className="orders-list">
            {visibleOrders.map((order) => {
              const isOpen = expanded[order.id] ?? false;
              const stepIndex = getStepIndex(order.status);
              const subtotal = Number(order.subtotal ?? 0);
              const deliveryFee = Number(order.delivery_fee ?? 0);
              const total = Number(order.total ?? subtotal + deliveryFee);
              const paymentMethod = order.payment_method || order.paymentMethod || "bank";
              const paymentStatus = order.payment_status || "unpaid";
              const orderCode = order.order_code || order.orderCode || order.id;
              const orderElementId = "order-details-" + order.id;

              return (
                <article key={order.id} className={"order-card " + (isOpen ? "is-open" : "")}>
                  <button
                    type="button"
                    className="order-header"
                    aria-expanded={isOpen}
                    aria-controls={orderElementId}
                    onClick={() => setExpanded((current) => ({ ...current, [order.id]: !isOpen }))}
                  >
                    <span className="order-header-main">
                      <span className="order-id">Order #{orderCode}</span>
                      <span className="order-header-meta">
                        <span>Reference ID: {order.id}</span>
                        <span className="meta-separator" aria-hidden="true">·</span>
                        <time dateTime={order.created_at || undefined}>{formatDate(order.created_at)}</time>
                      </span>
                    </span>
                    <span className={"status-badge status-" + (order.status || "pending")}>
                      {formatStatus(order.status)}
                    </span>
                    <span className="order-total">{"$" + total.toFixed(2)}</span>
                    <span className={"chevron " + (isOpen ? "open" : "")} aria-hidden="true">⌄</span>
                  </button>

                  {isOpen && (
                    <div className="order-body" id={orderElementId}>
                      {order.status === "cancelled" ? (
                        <div className="cancelled-note">This order was cancelled.</div>
                      ) : (
                        <div className="tracking-section">
                          <div className="section-heading">
                            <h2>Order progress</h2>
                            <span>{formatStatus(order.status)}</span>
                          </div>
                          <div className="timeline" aria-label={"Order progress: " + formatStatus(order.status)}>
                            {stepLabels.map((step, index) => (
                              <div
                                key={step}
                                className={"timeline-step " + (index <= stepIndex ? "active" : "")}
                              >
                                <span className="timeline-dot">{index < stepIndex ? "✓" : index + 1}</span>
                                <span className="timeline-label">{formatStatus(step)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <section className="payment-info" aria-label="Payment information">
                        <div className="payment-cell">
                          <span>Payment method</span>
                          <strong>{paymentMethod === "bank" ? "Manual QR payment" : formatStatus(paymentMethod)}</strong>
                        </div>
                        <div className="payment-cell">
                          <span>Payment status</span>
                          <strong className={"pay-badge pay-" + paymentStatus}>
                            {formatStatus(paymentStatus)}
                          </strong>
                        </div>
                        {order.payment_reference && (
                          <div className="payment-cell">
                            <span>Transaction reference</span>
                            <strong>{order.payment_reference}</strong>
                          </div>
                        )}
                        {order.payment_proof && (
                          <div className="payment-cell payment-proof-cell">
                            <span>Uploaded proof</span>
                            <a href={getImageUrl(order.payment_proof)} target="_blank" rel="noreferrer">
                              View payment screenshot
                            </a>
                          </div>
                        )}
                      </section>

                      <section className="items-list" aria-label="Products in this order">
                        {order.items?.map((item, index) => {
                          const price = Number(item.price || 0);
                          const quantity = Number(item.quantity || 1);
                          const lineSubtotal = price * quantity;
                          return (
                            <div key={item.id || item.product_id || order.id + "-" + index} className="item">
                              <div className="item-image-wrap">
                                {item.image ? (
                                  <img src={getImageUrl(item.image)} alt="" className="item-image" />
                                ) : (
                                  <span className="item-placeholder" aria-hidden="true">RS</span>
                                )}
                              </div>
                              <div className="item-info">
                                <strong className="item-name">{item.name || "ReachSei product"}</strong>
                                <span className="item-category">{item.category || "Sportswear & equipment"}</span>
                                <span className="item-attributes">
                                  {item.size || item.selectedSize ? "Size " + (item.size || item.selectedSize) : "Standard size"}
                                  <span aria-hidden="true"> · </span>
                                  Qty {quantity}
                                </span>
                              </div>
                              <strong className="item-subtotal">{"$" + lineSubtotal.toFixed(2)}</strong>
                            </div>
                          );
                        })}
                      </section>

                      <div className="order-totals">
                        <div><span>Subtotal</span><strong>{"$" + (subtotal || total - deliveryFee).toFixed(2)}</strong></div>
                        <div><span>Delivery fee</span><strong>{"$" + deliveryFee.toFixed(2)}</strong></div>
                        <div className="order-grand-total"><span>Total</span><strong>{"$" + total.toFixed(2)}</strong></div>
                      </div>

                      <div className="order-actions">
                        <button
                          type="button"
                          className="order-action-btn order-action-receipt"
                          onClick={() => {
                            sessionStorage.setItem("reachsei_last_receipt", JSON.stringify(order));
                            navigate("/receipt", { state: { order } });
                          }}
                        >
                          Download receipt
                        </button>
                        {order.status === "pending" && (
                        <button type="button" className="order-action-btn order-action-cancel" onClick={() => cancelOrder(order.id)}>
                            Cancel order
                          </button>
                        )}
                        <Link to="/contact" className="order-action-btn order-action-support">Contact support</Link>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

