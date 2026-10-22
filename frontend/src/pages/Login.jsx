
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { supabase } from "../lib/supabase.js";
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
  const [googleLoading, setGoogleLoading] = useState(false);

  // Load Telegram's official Login Widget.
  useEffect(() => {
    const container = document.getElementById("telegram-login-widget");
    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", "ReachSei_Login_Bot");
    script.setAttribute("data-size", "medium");
    script.setAttribute(
      "data-auth-url",
      `${window.location.origin}/auth/telegram/callback`
    );
    script.setAttribute("data-request-access", "write");

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Existing email/password login
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
        error.response?.data?.error ||
          "Invalid email/phone or password."
      );
    } finally {
      setLoading(false);
    }
  };

  // Existing Google login through Supabase
  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setMessage("");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage(error.message);
        setGoogleLoading(false);
      }
    } catch (error) {
      console.error("Google login error:", error);
      setMessage("Unable to start Google login. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
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
            <Link
              to="/forgot-password"
              className="forgot-password-link"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="google-login-button"
        >
          {googleLoading
            ? "Connecting to Google..."
            : "Continue with Google"}
        </button>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <div
          id="telegram-login-widget"
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "16px 0",
            minHeight: "40px",
          }}
        />

        {message && (
          <p className="auth-message" role="alert">
            {message}
          </p>
        )}

        <p className="auth-switch">
          Don&apos;t have an account?{" "}
          <Link to="/register">Register</Link>
        </p>
      </div>
    </section>
  );
}
