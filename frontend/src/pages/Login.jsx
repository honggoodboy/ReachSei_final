
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { supabase } from "../lib/supabase.js";
import logo from "../img/logo_reachsei.png";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [koompiLoading, setKoompiLoading] = useState(false);

  // Redirect users who already have a saved login
  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Handle redirect fallback if Telegram redirects back to /login with hash or query
  useEffect(() => {
    const hasHash = window.location.hash && window.location.hash.includes("tgAuthResult=");
    const hasQuery = window.location.search && window.location.search.includes("hash=");

    if (hasHash || hasQuery) {
      navigate(`/auth/telegram/callback${window.location.search}${window.location.hash}`, {
        replace: true,
      });
    }
  }, [navigate]);

  // Google OAuth through Supabase
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

  // KOOMPI (KID) Login
  const handleKoompiLogin = () => {
    try {
      setKoompiLoading(true);
      setMessage("");

      const rawApiUrl = import.meta.env.VITE_API_URL || "";
      const apiUrl =
        window.location.hostname !== "localhost" &&
        (!rawApiUrl || rawApiUrl.includes("localhost"))
          ? "https://reachsei-final.onrender.com"
          : rawApiUrl || "http://localhost:5000";

      window.location.href = `${apiUrl}/users/koompi/login`;
    } catch (error) {
      console.error("KOOMPI login error:", error);
      setMessage("Unable to start KOOMPI login. Please try again.");
      setKoompiLoading(false);
    }
  };

  // Bind global onTelegramAuth handler for Telegram Widget (data-onauth)
  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      try {
        setTelegramLoading(true);
        setMessage("");

        const rawApiUrl = import.meta.env.VITE_API_URL || "";
        const apiUrl =
          window.location.hostname !== "localhost" &&
          (!rawApiUrl || rawApiUrl.includes("localhost"))
            ? "https://reachsei-final.onrender.com"
            : rawApiUrl || "http://localhost:5000";

        const response = await axios.post(
          `${apiUrl}/users/telegram-login`,
          user
        );

        const { token, user: userData } = response.data;

        if (!token || !userData) {
          throw new Error("The server did not return a valid login.");
        }

        localStorage.setItem("userToken", token);
        localStorage.setItem("user", JSON.stringify(userData));
        window.dispatchEvent(new Event("userUpdated"));

        navigate("/", { replace: true });
      } catch (err) {
        console.error("Telegram onTelegramAuth error:", err);
        setMessage(
          err.response?.data?.error ||
            err.message ||
            "Telegram login failed. Please try again."
        );
      } finally {
        setTelegramLoading(false);
      }
    };

    return () => {
      delete window.onTelegramAuth;
    };
  }, [navigate]);

  // Load official Telegram Login Widget
  useEffect(() => {
    const container = document.getElementById("telegram-login-widget");
    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", "ReachSei_Login_Bot");
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-request-access", "write");
    // data-onauth passes the authenticated user object directly to window.onTelegramAuth
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    // Fallback data-auth-url if browser or popup relies on navigation redirect
    script.setAttribute(
      "data-auth-url",
      `${window.location.origin}/auth/telegram/callback`
    );

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, []);


  return (
    <section className="auth-page">
      <div className="auth-card-wrapper">
        <Link to="/" className="auth-back-link">
          <span className="auth-back-arrow">←</span>
          <span>Return to Store</span>
        </Link>

        <div className="auth-card">
          {/* Logo and heading */}
          <div className="auth-header">
            <img
              src={logo}
              alt="ReachSei Badminton Store"
              className="auth-logo-img"
            />

            <h1 className="auth-title">Welcome to ReachSei</h1>

            <p className="auth-subtitle">
              Sign in to your account to continue shopping.
            </p>
          </div>

          {/* Error message */}
          {message && (
            <div className="auth-alert-error" role="alert">
              <span className="auth-alert-icon">!</span>
              <span>{message}</span>
            </div>
          )}

          {/* Google and Telegram buttons */}
          <div className="auth-actions">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="social-sign-in-btn"
            >
              <span className="social-btn-inner">
                <img
                  src="https://img.icons8.com/?size=100&id=17949&format=png&color=000000"
                  alt=""
                  className="social-login-icon"
                />

                <span>
                  {googleLoading
                    ? "Connecting to Google..."
                    : "Continue with Google"}
                </span>
              </span>
            </button>

            <div className="auth-divider-line">
              <span>or</span>
            </div>

            <div className="telegram-sign-in-box">
              <div
                id="telegram-login-widget"
                className="telegram-widget-wrapper"
              />
            </div>

            <div className="auth-divider-line">
              <span>or</span>
            </div>

            <button
              type="button"
              onClick={handleKoompiLogin}
              disabled={koompiLoading}
              className="social-sign-in-btn koompi-sign-in-btn"
            >
              <span className="social-btn-inner">
                <svg
                  className="social-login-icon koompi-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="10" fill="#1F4BF0" />
                  <path
                    d="M8 8V16M8 12L14 8M8 12L14 16"
                    stroke="#FFFFFF"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="16.5" cy="12" r="1.5" fill="#FFFFFF" />
                </svg>

                <span>
                  {koompiLoading
                    ? "Connecting to KOOMPI..."
                    : "Continue with KOOMPI ID"}
                </span>
              </span>
            </button>
          </div>


          {/* Terms */}
          <p className="auth-footer-terms">
            By signing in, you agree to ReachSei&apos;s{" "}
            <Link to="/contact">Terms of Service</Link>
            {" "}and{" "}
            <Link to="/contact">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
