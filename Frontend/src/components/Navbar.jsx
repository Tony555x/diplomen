import React from "react";
import "./Navbar.css";

import { Link } from "react-router-dom";

function Navbar() {
  return (
    <div className="navbar">
      <div className="nav-left">
        <Link to="/home" className="nav-logo" style={{ textDecoration: 'none', color: 'inherit' }}>MySite</Link>
        <Link to="/home" className="nav-link" style={{ marginLeft: '1rem', textDecoration: 'none', color: '#333' }}>Home</Link>
        <input className="nav-search" type="text" placeholder="Search..." />
      </div>

      <div className="nav-right">
        <button className="nav-btn">🔔</button>
        <button className="nav-btn">⚙️</button>
        <button className="nav-btn">👤</button>
      </div>
    </div>
  );
}

export default Navbar;
