import React from "react";
import "./Navbar.css";

function Navbar() {
  return (
    <div className="navbar">
      <div className="nav-left">
        <div className="nav-logo">MySite</div>
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
