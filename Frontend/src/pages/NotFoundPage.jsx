import React from "react";
import { Link } from "react-router-dom";
import { isLoggedIn } from "../auth";
import { usePageTitle } from "../hooks/usePageTitle";
import PageBackground from "../components/PageBackground";
import styles from "./LandingPage.module.css";

export default function NotFoundPage() {
  usePageTitle("Page Not Found – TaskBoard");

  return (
    <div className={styles.root}>
      {/* ── Shared animated background ───────────────────────────── */}
      <PageBackground />

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className={styles.header}>
        <span className={styles.logo}>TaskBoard</span>
        <nav className={styles.nav}>
          {isLoggedIn() ? (
            <Link to="/home" className={styles.btnPrimary}>Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className={styles.btnGhost}>Login</Link>
              <Link to="/register" className={styles.btnPrimary}>Get Started</Link>
            </>
          ) }
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            404<br />
            <span className={styles.heroAccent}>Page Not Found.</span>
          </h1>
          <p className={styles.heroSub}>
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className={styles.heroCta}>
            {isLoggedIn() ? (
              <Link to="/home" className={`${styles.btnPrimary} ${styles.btnLg}`}>
                Back to Dashboard
              </Link>
            ) : (
              <Link to="/" className={`${styles.btnPrimary} ${styles.btnLg}`}>
                Back to Home
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        © {new Date().getFullYear()} TaskBoard
      </footer>
    </div>
  );
}
