import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../auth";
import { usePageTitle } from "../hooks/usePageTitle";
import "./AuthPages.css";
import PageBackground from "../components/PageBackground";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  usePageTitle("Register");

  const handleRegister = async () => {
    setError("");
    setSuccess("");
    try {
      const res = await register(username, email, password);
      if (!res.success) {
        setError(res.message || "Registration failed.");
      } else {
        setSuccess("Registration successful! Please check your email to verify your account.");
        setUsername("");
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      console.log(err);
      setError("Network or server error");
    }
  };

  return (
    <div className="auth-root">
      <PageBackground />
      <div className="auth-page">
        <h2>Register</h2>
        <div className="field-container">
          <label>Username</label>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>
        <div className="field-container">
          <label>Email</label>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
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
        <button onClick={handleRegister}>Register</button>
        {error && <div className="error">{error}</div>}
        {success && <div className="success" style={{ color: "#10b981", marginTop: "10px", fontSize: "0.9rem", textAlign: "center" }}>{success}</div>}
        <div className="switch-page">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
