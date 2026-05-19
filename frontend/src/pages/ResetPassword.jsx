import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

export default function ResetPassword() {
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: localStorage.getItem("resetEmail") || "",
    code: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await axios.post(`${API_BASE_URL}/users/reset-password`, {
        email: formData.email.trim().toLowerCase(),
        code: formData.code.trim(),
        password: formData.password,
      });

      localStorage.removeItem("resetEmail");

      setMessage(res.data.message || "Password reset successfully.");

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      console.error("Reset password error:", error);
      setMessage(error.response?.data?.error || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Reset Password</h1>

        <p className="auth-subtitle">
          Enter the code from your email and create a new password.
        </p>

        <form onSubmit={handleResetPassword} className="auth-form">
          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="code"
            placeholder="6-digit reset code"
            value={formData.code}
            onChange={handleChange}
            maxLength="6"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="New password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm new password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        {message && <p className="auth-message">{message}</p>}

        <p className="auth-switch">
          Back to <Link to="/login">Login</Link>
        </p>
      </div>
    </section>
  );
}