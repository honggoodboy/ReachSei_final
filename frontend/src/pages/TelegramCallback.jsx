
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
        const params = new URLSearchParams(window.location.search);
        const telegramData = Object.fromEntries(params.entries());

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
