import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function KoompiCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Completing KOOMPI login...");

  useEffect(() => {
    let active = true;

    async function finishLogin() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const error = searchParams.get("error");
        if (error) {
          throw new Error(decodeURIComponent(error));
        }

        // 1. Direct token from backend redirect
        const directToken = searchParams.get("token");
        const directUser = searchParams.get("user");

        if (directToken && directUser) {
          try {
            const parsedUser = JSON.parse(decodeURIComponent(directUser));
            localStorage.setItem("userToken", directToken);
            localStorage.setItem("user", JSON.stringify(parsedUser));
            window.dispatchEvent(new Event("userUpdated"));

            if (active) {
              setMessage("Login successful! Redirecting...");
              navigate("/", { replace: true });
            }
            return;
          } catch (e) {
            console.error("Failed to parse direct user from query:", e);
          }
        }

        // 2. Authorization code exchange
        const code = searchParams.get("code");
        if (!code) {
          throw new Error("No authorization code provided by KOOMPI");
        }

        const rawApiUrl = import.meta.env.VITE_API_URL || "";
        const apiUrl =
          window.location.hostname !== "localhost" &&
          (!rawApiUrl || rawApiUrl.includes("localhost"))
            ? "https://reachsei-final.onrender.com"
            : rawApiUrl || "http://localhost:5000";

        const redirectUri = `${window.location.origin}/auth/koompi/callback`;

        const response = await axios.post(`${apiUrl}/users/koompi/callback`, {
          code,
          redirectUri,
        });

        const { token, user } = response.data;
        if (!token || !user) {
          throw new Error("The server did not return a valid login.");
        }

        localStorage.setItem("userToken", token);
        localStorage.setItem("user", JSON.stringify(user));
        window.dispatchEvent(new Event("userUpdated"));

        if (active) {
          setMessage("Login successful! Redirecting...");
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.error("KOOMPI callback error:", err.response?.data || err);
        if (active) {
          setMessage(
            err.response?.data?.error ||
              err.message ||
              "KOOMPI login failed. Please try again."
          );
        }
      }
    }

    finishLogin();

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>KOOMPI Login</h1>
        <p role="status">{message}</p>
        <button type="button" onClick={() => navigate("/login")}>
          Back to Login
        </button>
      </div>
    </section>
  );
}
