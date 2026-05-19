import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

export default function ForgotPassword() {
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const res = await axios.post(`${API_BASE_URL}/users/forgot-password`, {
        email: email.trim().toLowerCase(),
      });

      localStorage.setItem("resetEmail", email.trim().toLowerCase());

      setMessage(res.data.message || "Reset code sent to your email.");

      setTimeout(() => {
        navigate("/reset-password");
      }, 1000);
    } catch (error) {
      console.error("Forgot password error:", error);
      setMessage(
        error.response?.data?.error ||
          "Could not send reset code. Please contact support."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <Link to="/login" className="auth-back-btn">
          ← Back to Login
        </Link>

        <h1>Forgot Password</h1>

        <p className="auth-subtitle">
          Enter your email and we will send you a 6-digit reset code.
        </p>

        <form onSubmit={handleForgotPassword} className="auth-form">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Code"}
          </button>
        </form>

        {message && <p className="auth-message">{message}</p>}

        <p className="auth-switch">
          Didn&apos;t receive code? <Link to="/contact">Contact Support</Link>
        </p>
      </div>
    </section>
  );
}