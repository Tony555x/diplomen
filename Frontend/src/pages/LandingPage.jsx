import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { isLoggedIn } from "../auth";
import { usePageTitle } from "../hooks/usePageTitle";
import "./LandingPage.css";

export default function LandingPage() {
  usePageTitle("TaskBoard – Manage your work");
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isLoggedIn()) {
      navigate("/home");
    }
  }, [navigate]);

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
          <Link to="/login" className="landing-nav-link">Login</Link>
          <Link to="/register" className="landing-btn-primary">Get Started</Link>
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h1 className="landing-hero-title">
            Organize work.<br />
            <span className="landing-hero-accent">Ship faster.</span>
          </h1>
          <p className="landing-hero-sub">
            TaskBoard brings your team's projects, tasks, and workflows into one
            beautifully simple space — so you can focus on what matters.
          </p>
          <div className="landing-hero-cta">
            <Link to="/register" className="landing-btn-primary landing-btn-lg">
              Create free account
            </Link>
            <Link to="/login" className="landing-btn-ghost landing-btn-lg">
              Sign in
            </Link>
          </div>
        </div>

      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="landing-features">
        <div className="landing-feature-split">
          <div className="landing-feature-text">
            <h2 className="landing-section-title" style={{ textAlign: "left", margin: "0 0 2rem" }}>
              Everything your team needs
            </h2>
            <ul className="landing-feature-list">
              <li><strong>Tasks</strong> to capture, assign, and track work</li>
              <li><strong>Collections</strong> to organize boards effectively</li>
              <li><strong>Users</strong> to collaborate and manage roles</li>
              <li><strong>Widgets</strong> to build custom dashboard insights</li>
            </ul>
          </div>
          <div className="landing-feature-image-wrapper">
            <img 
              src="/landingpage/column_and_widget.png" 
              alt="Taskboard Preview" 
              className="landing-feature-img" 
            />
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────── */}
      {/*<section className="landing-cta-banner">
        <h2 className="landing-cta-title">Ready to get started?</h2>
        <p className="landing-cta-sub">Join thousands of teams already using TaskBoard.</p>
        <Link to="/register" className="landing-btn-primary landing-btn-lg">
          Sign up for free
        </Link>
      </section>*/}

      <footer className="landing-footer">
        © {new Date().getFullYear()} TaskBoard
      </footer>
    </div>
  );
}
