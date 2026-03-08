import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, isLoggedIn } from "../auth";
import { usePageTitle } from "../hooks/usePageTitle";
import "./AuthPages.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  usePageTitle("Login");

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isLoggedIn()) {
      navigate("/home");
    }
  }, [navigate]);

  const handleLogin = async () => {
    setError("");
    try {
      const res = await login(username, password); // auth.js function that calls fetch
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
    <div className="auth-page">
      <h2>Login</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
      {error && <div className="error">{error}</div>}
      <div className="switch-page">
        Don't have an account? <Link to="/register">Register</Link>
      </div>
    </div>
  );
}
