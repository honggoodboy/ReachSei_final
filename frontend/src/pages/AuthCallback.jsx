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
        // Get the authenticated Supabase session.
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session?.access_token || !session.user?.email) {
          throw new Error(
            "Google session not found. Please try logging in again."
          );
        }

        if (active) {
          setMessage("Connecting your Google account to ReachSei...");
        }

        const API_BASE_URL = import.meta.env.VITE_API_URL;

        if (!API_BASE_URL) {
          throw new Error("Backend API URL is not configured.");
        }

        // Exchange the Supabase session for a ReachSei backend JWT.
        const response = await axios.post(
          `${API_BASE_URL}/users/google-login`,
          {},
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
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
