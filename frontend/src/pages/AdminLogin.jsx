import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminLogin.css";

export default function AdminLogin() {
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/admin/login`, formData);

      localStorage.setItem("adminToken", res.data.token);

      navigate("/admin/products");
    } catch (error) {
      console.error(error);
      setMessage("Invalid email or password.");
    }
  };

  return (
    <section className="admin-login-page">
      <div className="admin-login-card">
        <p className="admin-login-tag">Reachsei Seller</p>
        <h1>Admin Login</h1>

        <form onSubmit={handleLogin} className="admin-login-form">
          <input
            type="email"
            name="email"
            placeholder="Admin email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <button type="submit">Login</button>
        </form>

        {message && <p className="login-message">{message}</p>}
      </div>
    </section>
  );
}