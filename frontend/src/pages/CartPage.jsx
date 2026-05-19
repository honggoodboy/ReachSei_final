import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "./CartPage.css";

export default function CartPage() {
  const {
    cartItems,
    removeFromCart,
    increaseQty,
    decreaseQty,
    clearCart,
    cartTotal,
  } = useCart();

  return (
    <section className="cart-page">
      <div className="cart-container">
        <div className="cart-head">
          <h1>Your Cart</h1>

          <Link to="/" className="back-link">
            ← Continue Shopping
          </Link>
        </div>

        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is empty.</p>

            <Link to="/" className="shop-btn">
              Shop Now
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-list">
              {cartItems.map((item) => (
                <div key={item.cartId} className="cart-item">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="cart-item-image"
                  />

                  <div className="cart-item-info">
                    <p className="cart-item-category">{item.category}</p>

                    <h3>{item.name}</h3>

                    <p className="cart-item-price">${Number(item.price).toFixed(2)}</p>

                    {(item.size || item.selectedSize) && (
                      <p className="cart-item-size">
                        Size: {item.size || item.selectedSize}
                      </p>
                    )}
                  </div>

                  <div className="cart-qty">
                    <button
                      type="button"
                      onClick={() => decreaseQty(item.cartId)}
                    >
                      -
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      type="button"
                      onClick={() => increaseQty(item.cartId)}
                    >
                      +
                    </button>
                  </div>

                  <div className="cart-subtotal">
                    ${(Number(item.price) * item.quantity).toFixed(2)}
                  </div>

                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeFromCart(item.cartId)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h2>Order Summary</h2>

              <p>
                Total: <strong>${cartTotal.toFixed(2)}</strong>
              </p>

              <div className="cart-summary-actions">
                <button
                  type="button"
                  className="clear-btn"
                  onClick={clearCart}
                >
                  Clear Cart
                </button>

                <Link to="/checkout" className="checkout-btn">
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}