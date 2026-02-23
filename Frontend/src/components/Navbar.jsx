import React, { useState, useEffect, useRef } from "react";
import styles from "./Navbar.module.css";
import { Link, useNavigate } from "react-router-dom";
import { removeToken, fetchWithAuth } from "../auth";
import NotificationItem from "./NotificationItem";

function Navbar({ userName }) {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const navigate = useNavigate();
    const notifRef = useRef(null);

    const handleLogout = () => {
        removeToken();
        navigate("/");
    };

    useEffect(() => {
        if (!showNotifications) return;

        const loadNotifications = async () => {
            try {
                const data = await fetchWithAuth("/api/notifications/latest");
                setNotifications(data);
            } catch {
                setNotifications([]);
            }
        };

        loadNotifications();
    }, [showNotifications]);

    useEffect(() => {
        const handleClickOutside = e => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };

        if (showNotifications) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showNotifications]);

    return (
        <div className={styles.navbar}>
            <div className={styles.navLeft}>
                <Link to="/home" className={styles.navLogo}>
                    TaskBoard
                </Link>

                <Link to="/home" className={styles.navLink}>
                    Home
                </Link>

                <input
                    className={styles.navSearch}
                    type="text"
                    placeholder="Search..."
                />
            </div>

            <div className={styles.navRight}>
                <div className={styles.userMenuWrapper} ref={notifRef}>
                    <button
                        className={styles.navBtn}
                        onClick={() => setShowNotifications(v => !v)}
                    >
                        🔔
                    </button>

                    {showNotifications && (
                        <div className={styles.notificationPopup}>
                            <div className={styles.notificationHeader}>
                                Notifications
                            </div>

                            <div className={styles.notificationList}>
                                {notifications.length === 0 && (
                                    <div className={styles.notificationEmpty}>
                                        No notifications
                                    </div>
                                )}

                                {notifications.map(n => (
                                    <NotificationItem
                                        key={n.id}
                                        notification={n}
                                        onClick={() => setShowNotifications(false)}
                                    />
                                ))}
                            </div>


                            <button
                                className={styles.viewAllBtn}
                                disabled
                                onClick={() => navigate("/notifications")}
                            >
                                View all notifications
                            </button>
                        </div>
                    )}
                </div>

                <Link to="/user/settings" className={styles.navBtn} title="User Settings">
                    ⚙️
                </Link>

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
