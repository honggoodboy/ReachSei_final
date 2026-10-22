
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import logo from "../img/logo_reachsei.png";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Official Telegram Login Widget
  useEffect(() => {
    const container = document.getElementById(
      "telegram-login-widget"
    );

    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", "ReachSei_Login_Bot");
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
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

  // Google OAuth via Supabase
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
      <div className="auth-card-wrapper">
        <Link to="/" className="auth-back-link">
          <span className="auth-back-arrow">←</span>
          <span>Return to Store</span>
        </Link>

        <div className="auth-card">
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

          {message && (
            <div className="auth-alert-error" role="alert">
              <span className="auth-alert-icon">!</span>
              <span>{message}</span>
            </div>
          )}

          <div className="auth-actions">
            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="google-sign-in-btn"
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

            {/* Telegram Login */}
            <div className="telegram-sign-in-box">
              <div
                id="telegram-login-widget"
                className="telegram-widget-wrapper"
              />
            </div>
          </div>

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
