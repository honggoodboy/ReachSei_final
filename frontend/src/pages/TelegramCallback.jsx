
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

        // Helper to parse Base64 URL encoded tgAuthResult JSON
        const parseTgAuthResult = (rawString) => {
          try {
            const match = rawString.match(/tgAuthResult=([^&]+)/);
            if (!match || !match[1]) return null;
            let base64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
            while (base64.length % 4 !== 0) {
              base64 += "=";
            }
            const binaryStr = atob(base64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            const jsonStr = new TextDecoder().decode(bytes);
            return JSON.parse(jsonStr);
          } catch (err) {
            console.error("Failed to parse tgAuthResult base64:", err);
            return null;
          }
        };

        // 2. Check if tgAuthResult is in search params
        if (!telegramData.id && window.location.search.includes("tgAuthResult=")) {
          const parsed = parseTgAuthResult(window.location.search);
          if (parsed) telegramData = parsed;
        }

        // 3. Try URL hash fragment (Telegram OAuth returns #tgAuthResult=... or #id=...)
        if (!telegramData.id && window.location.hash) {
          const rawHash = window.location.hash.replace(/^#/, "");
          if (rawHash.includes("tgAuthResult=")) {
            const parsed = parseTgAuthResult(rawHash);
            if (parsed) telegramData = parsed;
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

        const rawApiUrl = import.meta.env.VITE_API_URL || "";
        const apiUrl =
          window.location.hostname !== "localhost" &&
          (!rawApiUrl || rawApiUrl.includes("localhost"))
            ? "https://reachsei-final.onrender.com"
            : rawApiUrl || "http://localhost:5000";

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

        // If this callback loaded inside a popup window, close it cleanly
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.dispatchEvent(new Event("userUpdated"));
            window.opener.focus();
            window.close();
            return;
          } catch (e) {
            console.log("Could not communicate with opener window", e);
          }
        }

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
