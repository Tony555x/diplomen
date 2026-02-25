import React from "react";
import styles from "./NotificationItem.module.css";
import { handleNotificationAction } from "../pages/notificationActions";
import { useNavigate } from "react-router-dom";

function NotificationItem({ notification, onClick }) {
    const navigate = useNavigate();

    const handleClick = () => {
        if (onClick) onClick(notification);
        handleNotificationAction(notification, navigate);
    };

    return (
        <div
            className={`${styles.item} ${!notification.isRead ? styles.unread : ""}`}
            onClick={handleClick}
        >
            <div className={styles.title}>
                {notification.title}
            </div>

            <div className={styles.message}>
                {notification.message}
            </div>
        </div>
    );
}

export default NotificationItem;
