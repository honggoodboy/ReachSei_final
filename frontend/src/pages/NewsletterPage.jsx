import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./NewsletterPage.css";

export default function NewsletterPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleSubscribe = (e) => {
    e.preventDefault();

    if (!email.trim()) return;

    setMessage("Thank you for subscribing!");
    setEmail("");
  };

  return (
    <section className="newsletter-page">
      <div className="newsletter-top">
        <button
          type="button"
          className="newsletter-back-btn"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </div>

      <div className="newsletter-card">
        <p className="newsletter-tag">Reachsei Updates</p>

        <h1>Get the Best Deals First</h1>

        <p>
          Subscribe to receive new product drops, discounts, and badminton gear
          updates.
        </p>

        <form onSubmit={handleSubscribe}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit">Subscribe</button>
        </form>

        {message && <p className="newsletter-message">{message}</p>}
      </div>
    </section>
  );
}