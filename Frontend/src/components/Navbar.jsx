import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./Navbar.module.css";
import { Link, useNavigate } from "react-router-dom";
import { removeToken, fetchWithAuth, getCurrentUser } from "../auth";
import NotificationItem from "./NotificationItem";

function Navbar({ userName }) {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState(null);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);

    const navigate = useNavigate();
    const notifRef = useRef(null);
    const searchRef = useRef(null);
    const debounceRef = useRef(null);
    const currentUser = getCurrentUser();

    const displayUserName = userName || (currentUser ? (currentUser.unique_name || currentUser.name || "User") : "User");

    const handleNotificationClick = async (notification) => {
        setShowNotifications(false);
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        if (!notification.isRead) {
            try {
                await fetchWithAuth(`/api/notifications/${notification.id}/mark-read`, { method: "POST" });
            } catch { /* ignore */ }
        }
    };

    const handleLogout = () => {
        removeToken();
        navigate("/");
    };

    // ─── Search ────────────────────────────────────────────────────────────────

    const doSearch = useCallback(async (q) => {
        if (!q.trim()) {
            setSearchResults(null);
            return;
        }
        setSearchLoading(true);
        try {
            const data = await fetchWithAuth(`/api/search?q=${encodeURIComponent(q.trim())}`);
            setSearchResults(data);
        } catch {
            setSearchResults(null);
        } finally {
            setSearchLoading(false);
        }
    }, []);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        setShowSearchResults(true);

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val), 300);
    };

    const handleSearchFocus = () => {
        if (searchQuery.trim()) setShowSearchResults(true);
    };

    const closeSearch = () => {
        setShowSearchResults(false);
        setSearchQuery("");
        setSearchResults(null);
    };

    const navigateTo = (path) => {
        closeSearch();
        navigate(path);
    };

    // Close search on outside click
    useEffect(() => {
        const handleClickOutside = e => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSearchResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ─── Notifications ────────────────────────────────────────────────────────

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
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showNotifications]);

    const hasResults = searchResults &&
        (searchResults.tasks?.length > 0 || searchResults.projects?.length > 0 || searchResults.workspaces?.length > 0);

    return (
        <div className={styles.navbar}>
            <div className={styles.navLeft}>
                <Link to="/home" className={styles.navLogo}>
                    TaskBoard
                </Link>

                <Link to="/home" className={styles.navLink}>
                    Home
                </Link>

                <div className={styles.searchWrapper} ref={searchRef}>
                    <input
                        className={styles.navSearch}
                        type="text"
                        placeholder="Search tasks, projects, workspaces..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={handleSearchFocus}
                        autoComplete="off"
                    />

                    {showSearchResults && searchQuery.trim() && (
                        <div className={styles.searchDropdown}>
                            {searchLoading && (
                                <div className={styles.searchEmpty}>Searching...</div>
                            )}

                            {!searchLoading && !hasResults && (
                                <div className={styles.searchEmpty}>No results found</div>
                            )}

                            {!searchLoading && searchResults?.workspaces?.length > 0 && (
                                <div className={styles.searchGroup}>
                                    <div className={styles.searchGroupTitle}>Workspaces</div>
                                    {searchResults.workspaces.map(w => (
                                        <div
                                            key={w.id}
                                            className={styles.searchResultItem}
                                            onClick={() => navigateTo(`/workspace/${w.id}/projects`)}
                                        >
                                            {w.name}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!searchLoading && searchResults?.projects?.length > 0 && (
                                <div className={styles.searchGroup}>
                                    <div className={styles.searchGroupTitle}>Projects</div>
                                    {searchResults.projects.map(p => (
                                        <div
                                            key={p.id}
                                            className={styles.searchResultItem}
                                            onClick={() => navigateTo(`/project/${p.id}/tasks`)}
                                        >
                                            {p.name}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!searchLoading && searchResults?.tasks?.length > 0 && (
                                <div className={styles.searchGroup}>
                                    <div className={styles.searchGroupTitle}>Tasks</div>
                                    {searchResults.tasks.map(t => (
                                        <div
                                            key={t.id}
                                            className={styles.searchResultItem}
                                            onClick={() => navigateTo(`/project/${t.projectId}/tasks/${t.id}`)}
                                        >
                                            {t.taskTypeIcon && (
                                                <img
                                                    src={`/cardicons/${t.taskTypeIcon}`}
                                                    alt=""
                                                    className={styles.searchTaskIcon}
                                                />
                                            )}
                                            <span className={t.completed ? styles.completedTask : ""}>
                                                {t.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
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
                                        onClick={() => handleNotificationClick(n)}
                                    />
                                ))}
                            </div>

                            <button
                                className={styles.viewAllBtn}
                                onClick={() => {
                                    setShowNotifications(false);
                                    navigate("/notifications");
                                }}
                            >
                                View all notifications
                            </button>
                        </div>
                    )}
                </div>

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
                                {displayUserName}
                            </div>
                            <Link
                                to="/user/settings"
                                className={styles.menuLink}
                                onClick={() => setShowUserMenu(false)}
                            >
                                Settings
                            </Link>
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
