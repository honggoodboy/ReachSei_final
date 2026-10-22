
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function TelegramCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Completing Telegram login...");

  useEffect(() => {
    let active = true;

    async function finishLogin() {
      try {
        let telegramData = {};

        // 1. Try URL query parameters
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("id") && searchParams.get("hash")) {
          telegramData = Object.fromEntries(searchParams.entries());
        }

        // 2. Try URL hash fragment (Telegram OAuth web returns #tgAuthResult=... or #id=...)
        if (!telegramData.id && window.location.hash) {
          const rawHash = window.location.hash.replace(/^#/, "");
          if (rawHash.includes("tgAuthResult=")) {
            try {
              const match = rawHash.match(/tgAuthResult=([^&]+)/);
              if (match && match[1]) {
                const base64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
                const jsonStr = decodeURIComponent(
                  atob(base64)
                    .split("")
                    .map(
                      (c) =>
                        "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
                    )
                    .join("")
                );
                telegramData = JSON.parse(jsonStr);
              }
            } catch (err) {
              console.error("Failed to parse tgAuthResult base64:", err);
            }
          } else {
            const hashParams = new URLSearchParams(rawHash);
            if (hashParams.get("id") && hashParams.get("hash")) {
              telegramData = Object.fromEntries(hashParams.entries());
            }
          }
        }

        if (!telegramData.id || !telegramData.hash) {
          throw new Error(
            "Telegram login data is missing. Please try again."
          );
        }

        const apiUrl = import.meta.env.VITE_API_URL;

        if (!apiUrl) {
          throw new Error("Backend API URL is not configured.");
        }

        const response = await axios.post(
          `${apiUrl}/users/telegram-login`,
          telegramData
        );

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
      } catch (error) {
        console.error(
          "Telegram login error:",
          error.response?.data || error
        );

        if (active) {
          setMessage(
            error.response?.data?.error ||
              error.message ||
              "Telegram login failed."
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
        <h1>Telegram Login</h1>
        <p role="status">{message}</p>
        <button type="button" onClick={() => navigate("/login")}>
          Back to Login
        </button>
      </div>
    </section>
  );
}
