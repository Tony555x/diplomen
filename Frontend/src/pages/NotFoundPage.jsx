import React from "react";
import { Link } from "react-router-dom";
import { isLoggedIn } from "../auth";
import { usePageTitle } from "../hooks/usePageTitle";
import "./LandingPage.css";

export default function NotFoundPage() {
  usePageTitle("Page Not Found – TaskBoard");

  return (
    <div className="landing-root">
      {/* ── Background Blobs ──────────────────────────────────────── */}
      <div className="landing-background">
        <div className="landing-blob landing-blob-1" aria-hidden="true" />
        <div className="landing-blob landing-blob-2" aria-hidden="true" />
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="landing-header">
        <span className="landing-logo">TaskBoard</span>
        <nav className="landing-nav">
          {isLoggedIn() ? (
            <Link to="/home" className="landing-btn-primary">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="landing-nav-link">Login</Link>
              <Link to="/register" className="landing-btn-primary">Get Started</Link>
            </>
          )}
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h1 className="landing-hero-title">
            404<br />
            <span className="landing-hero-accent">Page Not Found.</span>
          </h1>
          <p className="landing-hero-sub">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="landing-hero-cta">
            {isLoggedIn() ? (
              <Link to="/home" className="landing-btn-primary landing-btn-lg">
                Back to Dashboard
              </Link>
            ) : (
              <Link to="/" className="landing-btn-primary landing-btn-lg">
                Back to Home
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        © {new Date().getFullYear()} TaskBoard
      </footer>
    </div>
  );
}
