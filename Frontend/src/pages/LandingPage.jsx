import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isLoggedIn } from "../auth";
import { usePageTitle } from "../hooks/usePageTitle";
import PageBackground from "../components/PageBackground";
import styles from "./LandingPage.module.css";

export default function LandingPage() {
  usePageTitle("TaskBoard – Manage your work");
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  React.useEffect(() => {
    if (isLoggedIn()) {
      navigate("/home");
    }
  }, [navigate]);

  const handleNavClick = () => setMenuOpen(false);

  return (
    <div className={styles.root}>
      {/* ── Shared animated background ───────────────────────────── */}
      <PageBackground />

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className={styles.header}>
        <span className={styles.logo}>TaskBoard</span>

        {/* Desktop nav */}
        <nav className={styles.nav} aria-label="Main navigation">
          <Link to="/login" className={styles.btnGhost}>Login</Link>
          <Link to="/register" className={styles.btnPrimary}>Get Started</Link>
        </nav>

        {/* Hamburger button (mobile only) */}
        <button
          className={`${styles.hamburger}${menuOpen ? ` ${styles.hamburgerOpen}` : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {/* ── Mobile nav drawer ────────────────────────────────────── */}
      {menuOpen && (
        <div className={styles.mobileNav} role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <Link to="/login" className={styles.mobileNavLink} onClick={handleNavClick}>Login</Link>
          <Link to="/register" className={`${styles.btnPrimary} ${styles.mobileNavCta}`} onClick={handleNavClick}>Get Started</Link>
        </div>
      )}

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Organize work.<br />
            <span className={styles.heroAccent}>Ship faster.</span>
          </h1>
          <p className={styles.heroSub}>
            TaskBoard brings your team's projects, tasks, and workflows into one
            beautifully simple space — so you can focus on what matters.
          </p>
          <div className={styles.heroCta}>
            <Link to="/register" className={`${styles.btnPrimary} ${styles.btnLg}`}>
              Create free account
            </Link>
            <Link to="/login" className={`${styles.btnGhost} ${styles.btnLg}`}>
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className={styles.features}>
        <div className={styles.featureSplit}>
          <div className={styles.featureText}>
            <h2 className={styles.sectionTitle} style={{ textAlign: "left", margin: "0 0 2rem" }}>
              Everything your team needs
            </h2>
            <ul className={styles.featureList}>
              <li><strong>Tasks</strong> to capture, assign, and track work</li>
              <li><strong>Collections</strong> to organize boards effectively</li>
              <li><strong>Users</strong> to collaborate and manage roles</li>
              <li><strong>Widgets</strong> to build custom dashboard insights</li>
            </ul>
          </div>
          <div className={styles.featureImageWrapper}>
            <img
              src="/landingpage/column_and_widget.png"
              alt="Taskboard Preview"
              className={styles.featureImg}
            />
          </div>
        </div>
      </section>


    </div>
  );
}
