import React from "react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import "./AuthPages.css";
import PageBackground from "../components/PageBackground";

export default function VerifyEmailSuccessPage() {
  usePageTitle("Email Verified");

  return (
    <div className="auth-root">
      <PageBackground />
      <div className="auth-page" style={{ textAlign: "center" }}>
        <h2 style={{ color: "#10b981" }}>Email Verified!</h2>
        <p style={{ color: "rgba(255, 255, 255, 0.7)", margin: "1rem 0" }}>
          Your email has been successfully verified. You can now log in to your account.
        </p>
        <Link to="/login">
          <button style={{ width: "100%" }}>Go to Login</button>
        </Link>
      </div>
    </div>
  );
}
