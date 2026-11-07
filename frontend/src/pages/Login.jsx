import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../img/logo_reachsei.png";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const [message, setMessage] = useState(() =>
    new URLSearchParams(window.location.search).has("error")
      ? "KOOMPI sign-in could not be completed. Please try again."
      : ""
  );
  const [koompiLoading, setKoompiLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("user")) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

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
      setMessage("Unable to start KOOMPI sign-in. Please try again.");
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
          <div className="auth-header">
            <img
              src={logo}
              alt="ReachSei Badminton Store"
              className="auth-logo-img"
            />
            <h1 className="auth-title">Welcome to ReachSei</h1>
            <p className="auth-subtitle">
              Sign in or create your account securely with KOOMPI ID.
            </p>
          </div>

          {message && (
            <div className="auth-alert-error" role="alert">
              <span className="auth-alert-icon">!</span>
              <span>{message}</span>
            </div>
          )}

          <div className="auth-actions">
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
                  aria-hidden="true"
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
            <p className="auth-subtitle">
              New to ReachSei? Your account will be created when you continue
              with KOOMPI ID.
            </p>
          </div>

          <p className="auth-footer-terms">
            By continuing, you agree to ReachSei&apos;s{" "}
            <Link to="/contact">Terms of Service</Link>
            {" "}and{" "}
            <Link to="/contact">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
