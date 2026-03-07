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

        {/* decorative blobs */}
        <div className="landing-blob landing-blob-1" aria-hidden="true" />
        <div className="landing-blob landing-blob-2" aria-hidden="true" />
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="landing-features">
        <h2 className="landing-section-title">Everything your team needs</h2>
        <div className="landing-feature-grid">
          {[
            {
              icon: "📋",
              title: "Tasks & Boards",
              desc: "Create tasks, assign owners, set deadlines, and track progress with Kanban-style boards.",
            },
            {
              icon: "👥",
              title: "Team Workspaces",
              desc: "Invite teammates to dedicated workspaces with fine-grained roles and permissions.",
            },
            {
              icon: "🔔",
              title: "Real-time Notifications",
              desc: "Stay informed with live notifications for assignments, comments, and status changes.",
            },
            {
              icon: "🔍",
              title: "Powerful Search",
              desc: "Find any task, project, or workspace in seconds with full-text global search.",
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="landing-feature-card">
              <span className="landing-feature-icon">{icon}</span>
              <h3 className="landing-feature-title">{title}</h3>
              <p className="landing-feature-desc">{desc}</p>
            </div>
          ))}
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
