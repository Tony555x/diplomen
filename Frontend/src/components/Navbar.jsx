import React, { useState } from "react";
import styles from "./Navbar.module.css";
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
        <div className={styles.navbar}>
            <div className={styles.navLeft}>
                <Link
                    to="/home"
                    className={styles.navLogo}
                    style={{ textDecoration: "none", color: "inherit" }}
                >
                    MySite
                </Link>

                <Link
                    to="/home"
                    className={styles.navLink}
                    style={{ marginLeft: "1rem", textDecoration: "none", color: "#333" }}
                >
                    Home
                </Link>

                <input
                    className={styles.navSearch}
                    type="text"
                    placeholder="Search..."
                />
            </div>

            <div className={styles.navRight}>
                <button className={styles.navBtn}>🔔</button>
                <button className={styles.navBtn}>⚙️</button>

                <div className={styles.userMenuWrapper}>
                    <button
                        className={styles.navBtn}
                        onClick={() => setShowUserMenu(v => !v)}
                    >
                        👤
                    </button>

                    {showUserMenu && (
                        <div className={styles.userMenu}>
                            <div className={styles.userName}>
                                {userName || "User"}
                            </div>

                            <button
                                className={styles.logoutBtn}
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
