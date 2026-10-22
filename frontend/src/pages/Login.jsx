
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import logo from "../img/logo_reachsei.png";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);

  // Redirect users who already have a saved login
  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      navigate("/", { replace: true });
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

  // Telegram OAuth direct login
  const handleTelegramLogin = () => {
    try {
      setTelegramLoading(true);
      setMessage("");

      const botId = "8885168265";
      const origin = window.location.origin.includes("localhost")
        ? "https://reachsei.vercel.app"
        : window.location.origin;

      const returnTo = `${origin}/auth/telegram/callback`;

      const telegramAuthUrl = `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${encodeURIComponent(
        origin
      )}&embed=0&request_access=write&return_to=${encodeURIComponent(returnTo)}`;

      window.location.assign(telegramAuthUrl);
    } catch (err) {
      console.error("Telegram login error:", err);
      setMessage("Unable to start Telegram login. Please try again.");
      setTelegramLoading(false);
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
              disabled={googleLoading || telegramLoading}
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

            <button
              type="button"
              onClick={handleTelegramLogin}
              disabled={googleLoading || telegramLoading}
              className="social-sign-in-btn"
            >
              <span className="social-btn-inner">
                <img
                  src="https://img.icons8.com/?size=100&id=lUktdBVdL4Kb&format=png&color=228BE6"
                  alt=""
                  className="social-login-icon"
                />

                <span>
                  {telegramLoading
                    ? "Connecting to Telegram..."
                    : "Continue with Telegram"}
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
