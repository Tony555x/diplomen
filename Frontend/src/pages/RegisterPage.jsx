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
  const navigate = useNavigate();
  usePageTitle("Register");

  const handleRegister = async () => {
    setError("");
    try {
      const res = await register(username, email, password);
      if (!res.success) {
        setError(res.message || "Registration failed.");
      } else {
        navigate("/login");
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
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button onClick={handleRegister}>Register</button>
        {error && <div className="error">{error}</div>}
        <div className="switch-page">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
