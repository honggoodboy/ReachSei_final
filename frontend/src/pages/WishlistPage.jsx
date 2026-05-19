import { Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import "./WishlistPage.css";

export default function WishlistPage() {
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  return (
    <section className="wishlist-page">
      <div className="wishlist-container">
        <div className="wishlist-head">
          <h1>My Wishlist</h1>
          <Link to="/">← Continue Shopping</Link>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="empty-wishlist">
            <p>Your wishlist is empty.</p>
            <Link to="/" className="shop-btn">Shop Now</Link>
          </div>
        ) : (
          <div className="wishlist-grid">
            {wishlistItems.map((item) => (
              <div key={item.id} className="wishlist-card">
                <img src={item.image} alt={item.name} />

                <div className="wishlist-body">
                  <p>{item.category}</p>
                  <h3>{item.name}</h3>
                  <strong>${item.price}</strong>

                  <div className="wishlist-actions">
                    <button onClick={() => addToCart(item)}>
                      Add to Cart
                    </button>

                    <button
                      className="remove-wishlist"
                      onClick={() => removeFromWishlist(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}