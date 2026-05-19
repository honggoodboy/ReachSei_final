import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./EditProfile.css";

export default function EditProfile() {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const savedUser = JSON.parse(localStorage.getItem("user"));

  const [formData, setFormData] = useState({
    name: savedUser?.name || "",
    email: savedUser?.email || "",
  });

  const [message, setMessage] = useState("");

  if (!savedUser) {
    navigate("/login");
    return null;
  }

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.put(
        `${API_BASE_URL}/users/${savedUser.id}`,
        formData
      );

      localStorage.setItem("user", JSON.stringify(res.data.user));

      setMessage("Profile updated successfully.");

      setTimeout(() => {
        navigate("/profile");
      }, 800);
    } catch (error) {
      console.error(error);
      setMessage("Failed to update profile.");
    }
  };

  return (
    <section className="edit-profile-page">
      <div className="edit-profile-card">
        <div className="edit-profile-head">
          <h1>Edit Profile</h1>
          <Link to="/profile">← Back</Link>
        </div>

        <form onSubmit={handleUpdate} className="edit-profile-form">
          <input
            name="name"
            placeholder="Your name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <input
            name="email"
            type="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <button type="submit">Save Changes</button>
        </form>

        {message && <p className="edit-profile-message">{message}</p>}
      </div>
    </section>
  );
}