import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./ContactPage.css";

export default function ContactPage() {
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    message: "",
  });

  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setStatusMessage("");

      const res = await axios.post(`${API_BASE_URL}/contact`, {
        name: formData.name.trim(),
        contact: formData.contact.trim(),
        message: formData.message.trim(),
      });

      setStatusMessage(res.data.message || "Message sent successfully.");

      setFormData({
        name: "",
        contact: "",
        message: "",
      });
    } catch (error) {
      console.error("Contact error:", error);
      setStatusMessage(
        error.response?.data?.error || "Failed to send message."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="contact-page">
      <div className="contact-container">
        <div className="contact-info">
          <Link to="/" className="contact-back-btn">
            ← Back to Home
          </Link>

          <p className="contact-tag">Contact Us</p>
          <h1>Need help with your badminton gear?</h1>

          <p>
            Reachsei Store is ready to help with orders, product questions,
            delivery information, and account support.
          </p>

          <div className="contact-list">
            <p>
              <strong>📍 Address:</strong> Orkide Badminton
            </p>
            <p>
              <strong>📞 Phone:</strong> +855 96 684 8484
            </p>
            <p>
              <strong>⏰ Hours:</strong> 8:00 AM – 10:00 PM
            </p>
            <p>
              <strong>🌐 Social:</strong> Facebook / TikTok / Telegram
            </p>
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            name="name"
            placeholder="Your name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="contact"
            placeholder="Email or phone number"
            value={formData.contact}
            onChange={handleChange}
            required
          />

          <textarea
            name="message"
            rows="5"
            placeholder="Your message"
            value={formData.message}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Message"}
          </button>

          {statusMessage && (
            <p className="contact-message">{statusMessage}</p>
          )}
        </form>
      </div>
    </section>
  );
}