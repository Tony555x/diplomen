import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../auth";
import Navbar from "../components/Navbar";
import "./AuthPages.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <Navbar />
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
    </>
  );
}
