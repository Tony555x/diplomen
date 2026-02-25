import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import Navbar from "../components/Navbar";
import { handleNotificationAction } from "./notificationActions";
import styles from "./AllNotificationsPage.module.css";

function AllNotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchWithAuth("/api/notifications");
                setNotifications(data);
            } catch {
                setNotifications([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleClick = async (notification) => {
        // Mark as read
        if (!notification.isRead) {
            try {
                await fetchWithAuth(`/api/notifications/${notification.id}/mark-read`, { method: "POST" });
                setNotifications(prev =>
                    prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
                );
            } catch { /* ignore */ }
        }
        handleNotificationAction(notification, navigate);
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <>
            <Navbar />
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.header}>
                        <h1>Notifications</h1>
                        {unreadCount > 0 && (
                            <span className={styles.badge}>{unreadCount} unread</span>
                        )}
                    </div>

                    {loading ? (
                        <div className={styles.state}>Loading…</div>
                    ) : notifications.length === 0 ? (
                        <div className={styles.state}>No notifications yet.</div>
                    ) : (
                        <div className={styles.list}>
                            {notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`${styles.item} ${!n.isRead ? styles.unread : ""}`}
                                    onClick={() => handleClick(n)}
                                >
                                    <div className={styles.itemTop}>
                                        <span className={styles.title}>{n.title}</span>
                                        <span className={styles.time}>
                                            {new Date(n.createdAt).toLocaleDateString(undefined, {
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}
                                        </span>
                                    </div>
                                    <div className={styles.message}>{n.message}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default AllNotificationsPage;
