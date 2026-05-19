import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

export default function Login() {
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
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

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const res = await axios.post(`${API_BASE_URL}/users/login`, {
        identifier: formData.identifier.trim(),
        password: formData.password,
      });

      localStorage.setItem("userToken", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      setMessage(
        error.response?.data?.error || "Invalid email/phone or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
  <section className="auth-page">
    <div className="auth-card">
      <Link to="/" className="auth-back-btn">
        ← Back to Home
      </Link>

      <h1>Login</h1>

      <p className="auth-subtitle">
        Login with your email or phone number.
      </p>

      <form onSubmit={handleLogin} className="auth-form">
        <input
          name="identifier"
          type="text"
          placeholder="Email or phone number"
          value={formData.identifier}
          onChange={handleChange}
          required
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <div className="forgot-password-row">
          <Link to="/forgot-password" className="forgot-password-link">
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {message && <p className="auth-message">{message}</p>}

      <p className="auth-switch">
        Don&apos;t have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  </section>
);
}