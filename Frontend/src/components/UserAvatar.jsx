import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import styles from "./UserAvatar.module.css";

/**
 * UserAvatar — reusable avatar circle for any user in a project context.
 *
 * Props:
 *   user        { userId, userName, avatarColor? }
 *   onRemove    optional — if provided, shows "Remove from card" button
 *   size        "sm" | "md" (default "md")
 */
function UserAvatar({ user, onRemove, size = "md" }) {
    const [open, setOpen] = useState(false);
    const avatarRef = useRef(null);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (avatarRef.current && !avatarRef.current.contains(e.target) && open) {
                setOpen(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [open]);

    const togglePopup = () => {
        if (!open && avatarRef.current) {
            const rect = avatarRef.current.getBoundingClientRect();
            setPopupPosition({
                top: rect.bottom + window.scrollY + 6,
                left: rect.left + window.scrollX + rect.width / 2
            });
        }
        setOpen(prev => !prev);
    };

    const bg = user.avatarColor || "#3b82f6";
    const initial = user.userName?.charAt(0).toUpperCase() ?? "?";

    const popup = open ? ReactDOM.createPortal(
        <div
            className={styles.portalPopup}
            style={{ top: popupPosition.top, left: popupPosition.left, transform: "translateX(-50%)" }}
        >
            <div className={styles.popupAvatar} style={{ backgroundColor: bg }}>{initial}</div>
            <div className={styles.username}>{user.userName}</div>
            {onRemove && (
                <button
                    onClick={() => { onRemove(user.userId); setOpen(false); }}
                    className={styles.popupBtn}
                >
                    Remove from card
                </button>
            )}
        </div>,
        document.body
    ) : null;

    return (
        <>
            <button
                ref={avatarRef}
                className={`${styles.avatar} ${styles[size]}`}
                style={{ backgroundColor: bg }}
                onClick={togglePopup}
                title={user.userName}
            >
                {initial}
            </button>
            {popup}
        </>
    );
}

export default UserAvatar;
