import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, isLoggedIn } from "../auth";
import { usePageTitle } from "../hooks/usePageTitle";
import "./AuthPages.css";
import PageBackground from "../components/PageBackground";

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  usePageTitle("Login");

  useEffect(() => {
    if (isLoggedIn()) {
      navigate("/home");
    }
  }, [navigate]);

  const handleLogin = async () => {
    setError("");
    try {
      const res = await login(usernameOrEmail, password);
      if (!res.success) {
        setError(res.message || "Login failed.");
        return;
      }
      navigate("/home");
    } catch {
      setError("Network or server error");
    }
  };

  return (
    <div className="auth-root">
      <PageBackground />
      <div className="auth-page">
        <h2>Login</h2>
        <div className="field-container">
          <label>Email or Username</label>
          <input
            type="text"
            placeholder="Email or Username"
            value={usernameOrEmail}
            onChange={e => setUsernameOrEmail(e.target.value)}
          />
        </div>
        <div className="field-container">
          <label>Password</label>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
        <button onClick={handleLogin}>Login</button>
        {error && <div className="error">{error}</div>}
        <div className="switch-page">
          Don't have an account? <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  );
}
