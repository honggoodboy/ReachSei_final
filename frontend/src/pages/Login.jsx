
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import logo from "../img/logo_reachsei.png";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [koompiLoading, setKoompiLoading] = useState(false);

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

          {/* Sign-in options */}
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
                  alt="Google"
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
              id="koompi-login-btn"
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
