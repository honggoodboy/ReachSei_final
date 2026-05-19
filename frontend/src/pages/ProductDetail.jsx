import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useCart } from "../context/CartContext";
import "./ProductDetail.css";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { addToCart, cartCount } = useCart();

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [average, setAverage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reviewMessage, setReviewMessage] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
  });

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/products/${id}`)
      .then((res) => {
        setProduct(res.data);

        if (res.data.sizes) {
          const firstSize = res.data.sizes.split(",")[0].trim();
          setSelectedSize(firstSize);
        }
      })
      .catch((err) => console.error(err));

    axios
      .get(`${API_BASE_URL}/reviews/product/${id}`)
      .then((res) => setReviews(res.data))
      .catch((err) => console.error(err));

    axios
      .get(`${API_BASE_URL}/reviews/product/${id}/average`)
      .then((res) => setAverage(res.data))
      .catch((err) => console.error(err));
  }, [id, API_BASE_URL]);

  const getStockLabel = (status) => {
    if (status === "preorder") return "Pre-Order";
    if (status === "soldout") return "Sold Out";
    return "In Stock";
  };

  const addSelectedQuantity = () => {
    if (product.stock_status === "soldout") {
      return;
    }

    if (product.sizes && !selectedSize) {
      alert("Please choose a size first.");
      return;
    }

    const productWithSize = {
      ...product,
      size: selectedSize,
      selectedSize: selectedSize,
      cartId: `${product.id}-${selectedSize || "default"}`,
      price: Number(product.price) || 0,
    };

    for (let i = 0; i < quantity; i++) {
      addToCart(productWithSize);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      navigate("/login");
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/reviews`, {
        productId: id,
        userId: user.id,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment,
      });

      setReviewMessage("Review submitted successfully.");
      setReviewForm({
        rating: 5,
        comment: "",
      });

      const reviewsRes = await axios.get(`${API_BASE_URL}/reviews/product/${id}`);
      setReviews(reviewsRes.data);

      const avgRes = await axios.get(
        `${API_BASE_URL}/reviews/product/${id}/average`
      );
      setAverage(avgRes.data);
    } catch (error) {
      setReviewMessage(
        error.response?.data?.error || "Failed to submit review."
      );
    }
  };

  if (!product) {
    return <p className="detail-loading">Loading...</p>;
  }

  return (
    <section className="product-detail">
      <div className="detail-top-bar">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <Link to="/cart" className="detail-cart-link">
          <span className="detail-cart-icon">🛒</span>
          <span>Cart</span>

          {cartCount > 0 && (
            <span className="detail-cart-count">{cartCount}</span>
          )}
        </Link>
      </div>

      <div className="detail-container">
        <div className="detail-image-wrap">
          <img src={product.image} alt={product.name} />
        </div>

        <div className="detail-info">
          <p className="category">{product.category}</p>

          <h1>{product.name}</h1>

          {average && (
            <p className="average-rating">
              ⭐ {Number(average.average_rating).toFixed(1)} / 5
              <span> ({average.total_reviews} reviews)</span>
            </p>
          )}

          <p className="price">${product.price}</p>

          <p className="desc">{product.description}</p>

          <p className={`stock-badge stock-${product.stock_status || "instock"}`}>
            {getStockLabel(product.stock_status)}
          </p>

          {product.sizes && (
            <div className="size-section">
              <p>Choose Size</p>

              <div className="size-list">
                {product.sizes.split(",").map((size) => {
                  const cleanSize = size.trim();

                  return (
                    <button
                      key={cleanSize}
                      type="button"
                      className={`size-btn ${
                        selectedSize === cleanSize ? "active" : ""
                      }`}
                      onClick={() => setSelectedSize(cleanSize)}
                    >
                      {cleanSize}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="detail-cart-actions">
            <div className="quantity-box">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                -
              </button>

              <span>{quantity}</span>

              <button type="button" onClick={() => setQuantity((q) => q + 1)}>
                +
              </button>
            </div>

            <button
              className="add-to-cart-btn"
              onClick={addSelectedQuantity}
              disabled={product.stock_status === "soldout"}
            >
              {product.stock_status === "soldout"
                ? "Sold Out"
                : "🛒 Add to Cart"}
            </button>
          </div>
        </div>
      </div>

      <div className="reviews-section">
        <h2>Customer Reviews</h2>

        <form className="review-form" onSubmit={submitReview}>
          <select
            value={reviewForm.rating}
            onChange={(e) =>
              setReviewForm({
                ...reviewForm,
                rating: e.target.value,
              })
            }
          >
            <option value="5">★★★★★ 5</option>
            <option value="4">★★★★☆ 4</option>
            <option value="3">★★★☆☆ 3</option>
            <option value="2">★★☆☆☆ 2</option>
            <option value="1">★☆☆☆☆ 1</option>
          </select>

          <textarea
            placeholder="Write your review..."
            value={reviewForm.comment}
            onChange={(e) =>
              setReviewForm({
                ...reviewForm,
                comment: e.target.value,
              })
            }
            required
          />

          <button type="submit">Submit Review</button>
        </form>

        {reviewMessage && <p className="review-message">{reviewMessage}</p>}

        <div className="review-list">
          {reviews.length === 0 ? (
            <p>No reviews yet.</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="review-card">
                <strong>{review.user_name || "Customer"}</strong>

                <p className="review-stars">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </p>

                <p>{review.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* <div className="mobile-cart-bar">
        <div>
          <small>Total</small>
          <strong>${(Number(product.price) * quantity).toFixed(2)}</strong>
        </div>

        <button
          onClick={addSelectedQuantity}
          disabled={product.stock_status === "soldout"}
        >
          {product.stock_status === "soldout" ? "Sold Out" : "🛒 Add"}
        </button>
      </div> */}
    </section>
  );
}