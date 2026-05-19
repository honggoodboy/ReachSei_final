import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ChangePassword.css";

export default function ChangePassword() {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const user = JSON.parse(localStorage.getItem("user"));

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.put(
        `${API_BASE_URL}/users/${user.id}/password`,
        form
      );

      setMessage("Password updated successfully");

      setTimeout(() => {
        navigate("/profile");
      }, 1000);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to update password");
    }
  };

  return (
    <section className="change-password-page">
      <div className="change-password-card">
        <h1>Change Password</h1>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            name="currentPassword"
            placeholder="Current password"
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="newPassword"
            placeholder="New password"
            onChange={handleChange}
            required
          />

          <button type="submit">Update Password</button>
        </form>

        {message && <p>{message}</p>}
      </div>
    </section>
  );
}