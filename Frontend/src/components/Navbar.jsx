import React, { useState } from "react";
import "./Navbar.css";
import { Link, useNavigate } from "react-router-dom";
import { removeToken } from "../auth";

function Navbar({ userName }) {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        removeToken();
        navigate("/");
    };

    return (
        <div className="navbar">
            <div className="nav-left">
                <Link
                    to="/home"
                    className="nav-logo"
                    style={{ textDecoration: "none", color: "inherit" }}
                >
                    MySite
                </Link>

                <Link
                    to="/home"
                    className="nav-link"
                    style={{ marginLeft: "1rem", textDecoration: "none", color: "#333" }}
                >
                    Home
                </Link>

                <input className="nav-search" type="text" placeholder="Search..." />
            </div>

            <div className="nav-right">
                <button className="nav-btn">🔔</button>
                <button className="nav-btn">⚙️</button>

                <div className="user-menu-wrapper">
                    <button
                        className="nav-btn"
                        onClick={() => setShowUserMenu(v => !v)}
                    >
                        👤
                    </button>

                    {showUserMenu && (
                        <div className="user-menu">
                            <div className="user-name">
                                {userName || "User"}
                            </div>

                            <button
                                className="logout-btn"
                                onClick={handleLogout}
                            >
                                Log out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Navbar;
