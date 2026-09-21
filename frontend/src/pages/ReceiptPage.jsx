import { useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import "./ReceiptPage.css";

export default function ReceiptPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const order = state?.order;

  if (!order) {
    return (
      <section className="receipt-page">
        <div className="receipt-empty">
          <h1>Receipt not found</h1>
          <p>
            This receipt is no longer available on this page.
          </p>

          <button
            onClick={() => navigate("/")}
            className="receipt-home-btn"
          >
            Go to Home
          </button>
        </div>
      </section>
    );
  }

  /* =========================
     ORDER INFORMATION
  ========================= */

  const orderCode =
    order.order_code ||
    order.orderCode ||
    order.order_number ||
    order.orderNumber ||
    order.id ||
    "N/A";

  const items = order.items || [];

  const subtotal = Number(
    order.subtotal ??
      Number(order.total || 0) -
        Number(order.delivery_fee || 0)
  );

  const deliveryFee = Number(
    order.delivery_fee ??
      order.deliveryFee ??
      0
  );

  const total = Number(
    order.total ??
      order.totalAmount ??
      order.total_amount ??
      subtotal + deliveryFee
  );

  const paymentStatus =
    order.payment_status ||
    order.paymentStatus ||
    "pending_review";

  const paymentMethod =
    order.payment_method ||
    order.paymentMethod ||
    "bank";

  const createdAt = order.created_at
    ? new Date(order.created_at).toLocaleString()
    : new Date().toLocaleString();

  /* =========================
     CUSTOMER INFORMATION
  ========================= */

  const customerName =
    order.full_name ||
    order.fullName ||
    order.customer_name ||
    order.customerName ||
    "Guest Customer";

  const phone =
    order.phone ||
    order.phone_number ||
    order.phoneNumber ||
    "-";

  const province =
    order.province ||
    "-";

  const address =
    order.address ||
    order.shipping_address ||
    order.shippingAddress ||
    "-";

  /* =========================
     DOWNLOAD PNG
  ========================= */

  const downloadReceipt = async () => {
  const receipt = document.getElementById("reachsei-receipt");

  if (!receipt) {
    console.error("Receipt element not found.");
    return;
  }

  try {
    const canvas = await html2canvas(receipt, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error("Could not create receipt image.");
        return;
      }

      const file = new File(
        [blob],
        `Reachsei_Receipt_${orderCode}.png`,
        {
          type: "image/png",
        }
      );

      // 📱 Mobile: open the native share/save menu
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            title: "Reachsei Receipt",
            text: `Receipt ${orderCode}`,
            files: [file],
          });

          return;
        } catch (error) {
          // User cancelled the share menu
          if (error.name === "AbortError") {
            return;
          }
        }
      }

      // 💻 Desktop fallback: download PNG
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `Reachsei_Receipt_${orderCode}.png`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    }, "image/png");
  } catch (error) {
    console.error("Failed to create receipt:", error);
  }
};

  return (
    <section className="receipt-page">

      {/* =========================
          ACTION BUTTONS
      ========================= */}

      <div className="receipt-toolbar no-print">

        <button
          className="receipt-back-btn"
          onClick={() => navigate("/")}
        >
          ← Back to Home
        </button>

        <button
          className="receipt-download-btn"
          onClick={downloadReceipt}
        >
          ↓ Download Receipt
        </button>

      </div>

      {/* =========================
          RECEIPT
      ========================= */}

      <div
        className="receipt-paper"
        id="reachsei-receipt"
      >

        {/* HEADER */}

        <div className="receipt-header">

          <div>
            <div className="receipt-brand">
              REACHSEI
            </div>

            <p>
              Official Order Receipt
            </p>
          </div>

          <div className="receipt-status">
            ORDER CONFIRMED
          </div>

        </div>

        <div className="receipt-divider" />

        {/* ORDER INFORMATION */}

        <div className="receipt-order-meta">

          <div>
            <span>
              Order Number
            </span>

            <strong>
              {orderCode}
            </strong>
          </div>

          <div>
            <span>
              Order Date
            </span>

            <strong>
              {createdAt}
            </strong>
          </div>

        </div>

        {/* CUSTOMER */}

        <div className="receipt-section">

          <h2>
            Customer Information
          </h2>

          <div className="receipt-info-grid">

            <div>
              <span>Name</span>
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
              <span>Province</span>
              <strong>
                {province}
              </strong>
            </div>

            <div>
              <span>Address</span>
              <strong>
                {address}
              </strong>
            </div>

          </div>

        </div>

        {/* ITEMS */}

        <div className="receipt-section">

          <h2>
            Order Items
          </h2>

          <div className="receipt-items">

            {items.length === 0 ? (
              <p>
                No items found.
              </p>
            ) : (
              items.map(
                (item, index) => {

                  const quantity =
                    Number(
                      item.quantity || 1
                    );

                  const price =
                    Number(
                      item.price || 0
                    );

                  const itemSize =
                    item.size ||
                    item.selectedSize ||
                    "No size";

                  const itemName =
                    item.name ||
                    item.productName ||
                    item.product_name ||
                    "Product";

                  return (
                    <div
                      className="receipt-item"
                      key={
                        item.id ||
                        `${itemName}-${index}`
                      }
                    >

                      <div className="receipt-item-main">

                        <strong>
                          {itemName}
                        </strong>

                        <span>
                          Size: {itemSize}
                        </span>

                        <span>
                          Quantity: {quantity}
                        </span>

                      </div>

                      <div className="receipt-item-price">

                        <span>
                          ${price.toFixed(2)}
                          {" "}×{" "}
                          {quantity}
                        </span>

                        <strong>
                          $
                          {(
                            price *
                            quantity
                          ).toFixed(2)}
                        </strong>

                      </div>

                    </div>
                  );
                }
              )
            )}

          </div>

        </div>

        {/* TOTALS */}

        <div className="receipt-totals">

          <div>
            <span>
              Subtotal
            </span>

            <strong>
              ${subtotal.toFixed(2)}
            </strong>
          </div>

          <div>
            <span>
              Delivery Fee
            </span>

            <strong>
              ${deliveryFee.toFixed(2)}
            </strong>
          </div>

          <div className="receipt-grand-total">

            <span>
              Total
            </span>

            <strong>
              ${total.toFixed(2)}
            </strong>

          </div>

        </div>

        {/* PAYMENT */}

        <div className="receipt-payment">

          <div>

            <span>
              Payment Method
            </span>

            <strong>
              {paymentMethod === "bank"
                ? "ABA / KHQR"
                : paymentMethod}
            </strong>

          </div>

          <div>

            <span>
              Payment Status
            </span>

            <strong
              className={`receipt-payment-status payment-${paymentStatus}`}
            >
              {paymentStatus.replaceAll(
                "_",
                " "
              )}
            </strong>

          </div>

          {order.payment_reference && (
            <div>

              <span>
                Payment Reference
              </span>

              <strong>
                {order.payment_reference}
              </strong>

            </div>
          )}

        </div>

        {/* FOOTER */}

        <div className="receipt-footer">

          <strong>
            Thank you for shopping with
            Reachsei.
          </strong>

          <span>
            Please keep this receipt
            for your order reference.
          </span>

          <span>
            Reachsei · Badminton & Sports
          </span>

        </div>

      </div>

    </section>
  );
}