import { useEffect, useState } from "react";
import axios from "axios";
import "./AdminOrders.css";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [openOrderId, setOpenOrderId] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("adminToken");

  /* =========================================================
     FETCH ORDERS
  ========================================================= */

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/orders`);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Fetch orders error:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);


  /* =========================================================
     UPDATE ORDER STATUS
  ========================================================= */

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

      setOrders((prev) =>
        prev.map((order) =>
          order.id === id
            ? { ...order, status }
            : order
        )
      );
    } catch (error) {
      console.error("Update order status error:", error);
      alert("Failed to update order status.");
    }
  };


  /* =========================================================
     UPDATE PAYMENT STATUS
  ========================================================= */

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

      setOrders((prev) =>
        prev.map((order) =>
          order.id === id
            ? {
                ...order,
                payment_status: paymentStatus,
              }
            : order
        )
      );
    } catch (error) {
      console.error("Update payment status error:", error);
      alert("Failed to update payment status.");
    }
  };


  /* =========================================================
     UPDATE ADMIN NOTE
  ========================================================= */

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
          order.id === id
            ? {
                ...order,
                admin_note: adminNote,
              }
            : order
        )
      );

      alert("Admin note saved.");
    } catch (error) {
      console.error("Update admin note error:", error);
      alert("Failed to save admin note.");
    }
  };


  /* =========================================================
     DELETE ORDER
  ========================================================= */

  const deleteOrder = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to remove this order?"
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(
        `${API_BASE_URL}/orders/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOrders((prev) =>
        prev.filter((order) => order.id !== id)
      );

      if (openOrderId === id) {
        setOpenOrderId(null);
      }
    } catch (error) {
      console.error("Delete order error:", error);
      alert(
        "Failed to delete order. Please check your backend delete API."
      );
    }
  };


  /* =========================================================
     COPY PHONE
  ========================================================= */

  const copyPhone = async (phone) => {
    try {
      await navigator.clipboard.writeText(phone);
      alert("Phone number copied!");
    } catch (error) {
      console.error("Copy phone error:", error);
      alert("Failed to copy phone number.");
    }
  };


  /* =========================================================
     TELEGRAM LINK
  ========================================================= */

  const getTelegramLink = (phone) => {
    if (!phone) return "#";

    const cleanPhone = String(phone)
      .replace(/\s/g, "")
      .replace(/-/g, "");

    if (cleanPhone.startsWith("+")) {
      return `https://t.me/${cleanPhone}`;
    }

    if (cleanPhone.startsWith("0")) {
      return `https://t.me/+855${cleanPhone.slice(1)}`;
    }

    return `https://t.me/${cleanPhone}`;
  };


  /* =========================================================
     ORDER ITEMS
  ========================================================= */

  const getOrderItems = (order) => {
    if (!order?.items) return [];

    if (Array.isArray(order.items)) {
      return order.items;
    }

    try {
      const parsed = JSON.parse(order.items);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  };


  /* =========================================================
     ITEM SIZE
  ========================================================= */

  const getItemSize = (item) => {
    return (
      item?.size ||
      item?.selectedSize ||
      item?.selected_size ||
      item?.productSize ||
      item?.product_size ||
      ""
    );
  };


  /* =========================================================
     ITEM PRICE
  ========================================================= */

  const getItemPrice = (item) => {
    return Number(
      item?.price ||
      item?.unitPrice ||
      item?.product_price ||
      0
    );
  };


  /* =========================================================
     ITEM QUANTITY
  ========================================================= */

  const getItemQuantity = (item) => {
    return Number(
      item?.quantity ||
      item?.qty ||
      1
    );
  };


  /* =========================================================
     IMAGE URL
  ========================================================= */

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";

    if (
      typeof imagePath === "string" &&
      imagePath.startsWith("http")
    ) {
      return imagePath;
    }

    if (
      typeof imagePath === "string" &&
      imagePath.startsWith("/")
    ) {
      return `${API_BASE_URL}${imagePath}`;
    }

    return `${API_BASE_URL}/${imagePath}`;
  };


  /* =========================================================
     PAYMENT STATUS CLASS
  ========================================================= */

  const getPaymentStatusClass = (status) => {
    return `payment-${status || "unpaid"}`;
  };


  /* =========================================================
     FORMAT TEXT
  ========================================================= */

  const formatText = (text) => {
    if (!text) return "Unknown";

    return String(text)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };


  /* =========================================================
     SUBTOTAL
  ========================================================= */

  const getSubtotal = (order) => {
    if (
      order?.subtotal !== undefined &&
      order?.subtotal !== null
    ) {
      return Number(order.subtotal);
    }

    const items = getOrderItems(order);

    return items.reduce((sum, item) => {
      const price = getItemPrice(item);
      const quantity = getItemQuantity(item);

      return sum + price * quantity;
    }, 0);
  };


  /* =========================================================
     DELIVERY FEE
  ========================================================= */

  const getDeliveryFee = (order) => {
    if (
      order?.delivery_fee !== undefined &&
      order?.delivery_fee !== null
    ) {
      return Number(order.delivery_fee);
    }

    if (
      order?.deliveryFee !== undefined &&
      order?.deliveryFee !== null
    ) {
      return Number(order.deliveryFee);
    }

    return 2;
  };


  /* =========================================================
     TOTAL
  ========================================================= */

  const getTotal = (order) => {
    if (
      order?.total !== undefined &&
      order?.total !== null
    ) {
      return Number(order.total);
    }

    return (
      getSubtotal(order) +
      getDeliveryFee(order)
    );
  };


  /* =========================================================
     DATE
  ========================================================= */

  const formatDate = (date) => {
    if (!date) return "No date";

    try {
      return new Date(date).toLocaleString();
    } catch {
      return "No date";
    }
  };


  /* =========================================================
     PAYMENT PROOF
  ========================================================= */

  const renderPaymentProof = (paymentProof) => {
    if (!paymentProof) {
      return (
        <div className="no-payment-proof">
          No payment proof uploaded.
        </div>
      );
    }

    const imageUrl = getImageUrl(paymentProof);

    return (
      <div className="payment-proof-box">
        <span className="field-label">
          Payment Proof
        </span>

        <a
          href={imageUrl}
          target="_blank"
          rel="noreferrer"
          className="payment-proof-link"
        >
          <img
            src={imageUrl}
            alt="Payment proof"
            className="payment-proof-img"
          />

          <span className="payment-proof-view">
            View Full Proof ↗
          </span>
        </a>
      </div>
    );
  };


  /* =========================================================
     EMPTY
  ========================================================= */

  if (orders.length === 0) {
    return (
      <section className="admin-orders-page">
        <div className="admin-orders-container">
          <div className="orders-page-header">
            <div>
              <span className="page-eyebrow">
                MANAGEMENT
              </span>

              <h1>Orders</h1>

              <p>
                Manage customer orders and payments.
              </p>
            </div>
          </div>

          <div className="empty-admin-orders">
            <div className="empty-orders-icon">
              🛍
            </div>

            <h2>No orders yet</h2>

            <p>
              Customer orders will appear here.
            </p>
          </div>
        </div>
      </section>
    );
  }


  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section className="admin-orders-page">
      <div className="admin-orders-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="orders-page-header">
          <div>
            <span className="page-eyebrow">
              MANAGEMENT
            </span>

            <h1>Orders</h1>

            <p>
              Review, manage and process customer orders.
            </p>
          </div>

          <div className="orders-count">
            <strong>{orders.length}</strong>
            <span>
              {orders.length === 1
                ? "Order"
                : "Orders"}
            </span>
          </div>
        </header>


        {/* =================================================
            ORDERS
        ================================================= */}

        <div className="orders-table">

          {orders.map((order) => {
            const items = getOrderItems(order);

            const paymentStatus =
              order.payment_status || "unpaid";

            const paymentProof =
              order.payment_proof;

            const paymentReference =
              order.payment_reference;

            const isOpen =
              openOrderId === order.id;

            const orderCode =
              order.order_code ||
              order.orderCode ||
              order.id;

            const subtotal =
              getSubtotal(order);

            const deliveryFee =
              getDeliveryFee(order);

            const total =
              getTotal(order);

            const customerName =
              order.full_name ||
              order.fullName ||
              "Unknown Customer";

            const phone =
              order.phone ||
              "No phone";

            return (
              <article
                key={order.id}
                className={`order-card ${
                  isOpen
                    ? "order-card-open"
                    : ""
                }`}
              >

                {/* =================================================
                    DELETE
                ================================================= */}

                <button
                  type="button"
                  className="delete-order-btn"
                  onClick={() =>
                    deleteOrder(order.id)
                  }
                  aria-label="Delete order"
                >
                  ×
                </button>


                {/* =================================================
                    ORDER HEADER
                ================================================= */}

                <div className="order-summary-main">

                  <div className="order-summary-info">

                    <div className="order-code-row">
                      <span className="order-label">
                        ORDER
                      </span>

                      <h3>
                        #{orderCode}
                      </h3>
                    </div>

                    <div className="order-meta-grid">

                      <div>
                        <span>Customer</span>
                        <strong>
                          {customerName}
                        </strong>
                      </div>

                      <div>
                        <span>Phone</span>
                        <strong>
                          {phone}
                        </strong>
                      </div>

                      <div>
                        <span>Total</span>
                        <strong className="order-total-preview">
                          ${total.toFixed(2)}
                        </strong>
                      </div>

                    </div>

                  </div>


                  {/* STATUS */}

                  <div className="order-summary-status">

                    <span
                      className={`admin-status status-${
                        order.status || "pending"
                      }`}
                    >
                      <i />
                      {formatText(
                        order.status || "pending"
                      )}
                    </span>

                    <span
                      className={`admin-payment-status ${
                        getPaymentStatusClass(
                          paymentStatus
                        )
                      }`}
                    >
                      <i />
                      {formatText(
                        paymentStatus
                      )}
                    </span>

                  </div>


                  {/* ACTIONS */}

                  <div className="order-summary-actions">

                    <select
                      value={
                        order.status || "pending"
                      }
                      onChange={(event) =>
                        updateStatus(
                          order.id,
                          event.target.value
                        )
                      }
                      aria-label="Order status"
                    >
                      <option value="pending">
                        Pending
                      </option>

                      <option value="confirmed">
                        Confirmed
                      </option>

                      <option value="shipped">
                        Shipped
                      </option>

                      <option value="delivered">
                        Delivered
                      </option>

                      <option value="cancelled">
                        Cancelled
                      </option>
                    </select>

                    <button
                      type="button"
                      className="view-details-btn"
                      onClick={() =>
                        setOpenOrderId(
                          isOpen
                            ? null
                            : order.id
                        )
                      }
                    >
                      {isOpen
                        ? "Hide Details"
                        : "View Details"}
                    </button>

                  </div>

                </div>


                {/* =================================================
                    DETAILS
                ================================================= */}

                {isOpen && (
                  <div className="admin-order-details">

                    <div className="details-grid">


                      {/* =================================================
                          CUSTOMER
                      ================================================= */}

                      <div className="details-box customer-box">

                        <div className="details-box-heading">
                          <span className="details-icon">
                            👤
                          </span>

                          <div>
                            <span>
                              CUSTOMER
                            </span>

                            <h4>
                              Customer Details
                            </h4>
                          </div>
                        </div>


                        <div className="customer-info">

                          <div className="info-row">
                            <span>Name</span>
                            <strong>
                              {customerName}
                            </strong>
                          </div>

                          <div className="info-row">
                            <span>Phone</span>
                            <strong>
                              {phone}
                            </strong>
                          </div>

                          <div className="info-row">
                            <span>Province</span>
                            <strong>
                              {order.province ||
                                "No province"}
                            </strong>
                          </div>

                          <div className="info-row info-row-address">
                            <span>Address</span>
                            <strong>
                              {order.address ||
                                "No address"}
                            </strong>
                          </div>

                          <div className="info-row">
                            <span>Order Date</span>
                            <strong>
                              {formatDate(
                                order.created_at
                              )}
                            </strong>
                          </div>

                        </div>


                        {/* CONTACT */}

                        {order.phone && (
                          <div className="admin-contact-actions">

                            <a
                              href={`tel:${order.phone}`}
                              className="admin-contact-btn call-btn"
                            >
                              Call
                            </a>

                            <button
                              type="button"
                              className="admin-contact-btn copy-btn"
                              onClick={() =>
                                copyPhone(
                                  order.phone
                                )
                              }
                            >
                              Copy Phone
                            </button>

                            <a
                              href={getTelegramLink(
                                order.phone
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="admin-contact-btn telegram-btn"
                            >
                              Telegram
                            </a>

                          </div>
                        )}

                      </div>


                      {/* =================================================
                          PAYMENT
                      ================================================= */}

                      <div className="details-box payment-box">

                        <div className="details-box-heading">
                          <span className="details-icon">
                            $
                          </span>

                          <div>
                            <span>
                              PAYMENT
                            </span>

                            <h4>
                              Payment Details
                            </h4>
                          </div>
                        </div>


                        <div className="payment-info">

                          <div className="info-row">
                            <span>Method</span>
                            <strong>
                              QR Payment
                            </strong>
                          </div>

                          <div className="info-row">
                            <span>Status</span>

                            <span
                              className={`admin-payment-status ${
                                getPaymentStatusClass(
                                  paymentStatus
                                )
                              }`}
                            >
                              <i />
                              {formatText(
                                paymentStatus
                              )}
                            </span>
                          </div>

                          {paymentReference && (
                            <div className="info-row">
                              <span>Reference</span>
                              <strong>
                                {paymentReference}
                              </strong>
                            </div>
                          )}

                        </div>


                        {renderPaymentProof(
                          paymentProof
                        )}


                        {/* PAYMENT ACTIONS */}

                        <div className="payment-action-buttons">

                          <button
                            type="button"
                            className="mark-paid-btn"
                            onClick={() =>
                              updatePaymentStatus(
                                order.id,
                                "paid"
                              )
                            }
                          >
                            ✓ Mark Paid
                          </button>

                          <button
                            type="button"
                            className="reject-payment-btn"
                            onClick={() =>
                              updatePaymentStatus(
                                order.id,
                                "rejected"
                              )
                            }
                          >
                            Reject Payment
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
                            ↻ Pending Review
                          </button>

                        </div>

                      </div>


                      {/* =================================================
                          ORDER SUMMARY
                      ================================================= */}

                      <div className="details-box summary-box">

                        <div className="details-box-heading">
                          <span className="details-icon">
                            #
                          </span>

                          <div>
                            <span>
                              TOTAL
                            </span>

                            <h4>
                              Order Summary
                            </h4>
                          </div>
                        </div>


                        <div className="order-price-summary">

                          <div className="order-price-row">
                            <span>
                              Subtotal
                            </span>

                            <strong>
                              ${subtotal.toFixed(2)}
                            </strong>
                          </div>


                          <div className="order-price-row delivery">
                            <span>
                              Delivery Fee
                            </span>

                            <strong>
                              ${deliveryFee.toFixed(2)}
                            </strong>
                          </div>


                          <div className="order-price-row total">
                            <span>
                              Total
                            </span>

                            <strong>
                              ${total.toFixed(2)}
                            </strong>
                          </div>

                        </div>


                        {/* ADMIN NOTE */}

                        <div className="admin-note-box">

                          <div className="admin-note-heading">
                            <strong>
                              Admin Note
                            </strong>

                            <span>
                              Customer visible
                            </span>
                          </div>

                          <textarea
                            placeholder="Write a note for the customer..."
                            defaultValue={
                              order.admin_note || ""
                            }
                            rows="5"
                            onBlur={(event) =>
                              updateAdminNote(
                                order.id,
                                event.target.value
                              )
                            }
                          />

                          <small>
                            This message will show
                            to the customer in My Orders.
                          </small>

                        </div>

                      </div>

                    </div>


                    {/* =================================================
                        ITEMS
                    ================================================= */}

                    <div className="order-items">

                      <div className="items-heading">
                        <div>
                          <span>
                            ORDER CONTENTS
                          </span>

                          <h4>
                            Items
                          </h4>
                        </div>

                        <strong>
                          {items.length}{" "}
                          {items.length === 1
                            ? "item"
                            : "items"}
                        </strong>
                      </div>


                      {items.length === 0 ? (
                        <div className="no-items">
                          No items found.
                        </div>
                      ) : (
                        <div className="order-items-list">

                          {items.map(
                            (item, index) => {
                              const size =
                                getItemSize(
                                  item
                                );

                              const price =
                                getItemPrice(
                                  item
                                );

                              const quantity =
                                getItemQuantity(
                                  item
                                );

                              const imageUrl =
                                item.image
                                  ? getImageUrl(
                                      item.image
                                    )
                                  : "";

                              const itemSubtotal =
                                price * quantity;

                              return (
                                <div
                                  key={
                                    item.cartId ||
                                    item.id ||
                                    index
                                  }
                                  className="order-item"
                                >

                                  {/* IMAGE */}

                                  <div className="order-item-image-wrap">

                                    {imageUrl ? (
                                      <img
                                        src={imageUrl}
                                        alt={
                                          item.name ||
                                          "Product"
                                        }
                                        className="order-item-image"
                                      />
                                    ) : (
                                      <div className="order-item-no-image">
                                        No Image
                                      </div>
                                    )}

                                  </div>


                                  {/* INFO */}

                                  <div className="order-item-info">

                                    <span className="item-category">
                                      Product
                                    </span>

                                    <h5>
                                      {item.name ||
                                        "Product"}
                                    </h5>

                                    <div className="item-meta">

                                      <span className="admin-order-size">
                                        Size:{" "}
                                        {size ||
                                          "No size"}
                                      </span>

                                      <span>
                                        Qty:{" "}
                                        {quantity}
                                      </span>

                                    </div>

                                    <span className="item-unit-price">
                                      ${price.toFixed(2)}{" "}
                                      each
                                    </span>

                                  </div>


                                  {/* PRICE */}

                                  <div className="order-item-price">

                                    <span>
                                      Subtotal
                                    </span>

                                    <strong>
                                      $
                                      {itemSubtotal.toFixed(
                                        2
                                      )}
                                    </strong>

                                  </div>

                                </div>
                              );
                            }
                          )}

                        </div>
                      )}

                    </div>

                  </div>
                )}

              </article>
            );
          })}

        </div>

      </div>
    </section>
  );
}