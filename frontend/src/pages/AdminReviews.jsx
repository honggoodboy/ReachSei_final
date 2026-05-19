import { useEffect, useState } from "react";
import axios from "axios";
import "./AdminReviews.css";

export default function AdminReviews() {
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const [reviews, setReviews] = useState([]);
  const token = localStorage.getItem("adminToken");
 const fetchReviews = async () => {
    await axios.delete(`${API_BASE_URL}/reviews/${id}`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
await axios.delete(`${API_BASE_URL}/reviews/${id}`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
    axios
      .get(`${API_BASE_URL}/reviews`)
      .then((res) => setReviews(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const deleteReview = async (id) => {
    const confirmDelete = confirm("Delete this review?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_BASE_URL}/reviews/${id}`);
      fetchReviews();
    } catch (error) {
      console.error(error);
      alert("Failed to delete review.");
    }
  };

  return (
    <section className="admin-reviews-page">
      <div className="admin-reviews-container">
        <h1>Review Management</h1>

        {reviews.length === 0 ? (
          <p>No reviews found.</p>
        ) : (
          <div className="admin-review-list">
            {reviews.map((review) => (
              <div key={review.id} className="admin-review-card">
                <div>
                  <h3>{review.product_name}</h3>
                  <p className="review-user">By {review.user_name || "Customer"}</p>
                  <p className="review-stars">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </p>
                  <p>{review.comment}</p>
                  <small>{new Date(review.created_at).toLocaleString()}</small>
                </div>

                <button
                  className="delete-review-btn"
                  onClick={() => deleteReview(review.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}