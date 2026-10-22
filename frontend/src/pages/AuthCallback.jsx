import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import axios from "axios";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Completing Google login...");

  useEffect(() => {
    let active = true;

    async function finishLogin() {
      try {
        let accessToken = null;

        // 1. Check if Supabase client already parsed session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          accessToken = session.access_token;
        }

        // 2. Check URL search params for PKCE code
        if (!accessToken) {
          const searchParams = new URLSearchParams(window.location.search);
          const code = searchParams.get("code");
          if (code) {
            const { data: codeData } =
              await supabase.auth.exchangeCodeForSession(code);
            if (codeData?.session?.access_token) {
              accessToken = codeData.session.access_token;
            }
          }
        }

        // 3. Check URL hash fragment for implicit access_token
        if (!accessToken && window.location.hash) {
          const hashParams = new URLSearchParams(
            window.location.hash.replace(/^#/, "")
          );
          accessToken = hashParams.get("access_token");
        }

        if (!accessToken) {
          throw new Error(
            "Google session not found. Please try logging in again."
          );
        }

        if (active) {
          setMessage("Connecting your Google account to ReachSei...");
        }

        const rawApiUrl = import.meta.env.VITE_API_URL || "";
        const API_BASE_URL =
          window.location.hostname !== "localhost" &&
          (!rawApiUrl || rawApiUrl.includes("localhost"))
            ? "https://reachsei-final.onrender.com"
            : rawApiUrl || "http://localhost:5000";

        // Exchange the Supabase session for a ReachSei backend JWT.
        const response = await axios.post(
          `${API_BASE_URL}/users/google-login`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const { token, user } = response.data;

        if (!token || !user) {
          throw new Error("Backend did not return a valid login.");
        }

        // Save the same values as the existing password login.
        localStorage.setItem("userToken", token);
        localStorage.setItem("user", JSON.stringify(user));
        window.dispatchEvent(new Event("userUpdated"));

        if (active) {
          setMessage("Login successful! Redirecting...");
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error(
          "Google callback error:",
          error.response?.data || error
        );

        if (active) {
          setMessage(
            error.response?.data?.error ||
              error.message ||
              "Google login failed. Please try again."
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
        <h1>Google Login</h1>
        <p role="status">{message}</p>

        <button
          type="button"
          onClick={() => navigate("/login")}
        >
          Back to Login
        </button>
      </div>
    </section>
  );
}
