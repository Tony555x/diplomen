import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import styles from "./AssigneeAvatar.module.css";

function AssigneeAvatar({ assignee, onRemove }) {
    const [open, setOpen] = useState(false);
    const avatarRef = useRef(null);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

    // Close popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                avatarRef.current &&
                !avatarRef.current.contains(e.target) &&
                open
            ) {
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
                top: rect.bottom + window.scrollY + 4, // small offset
                left: rect.left + window.scrollX + rect.width / 2
            });
        }
        setOpen(prev => !prev);
    };

    const popup = open ? ReactDOM.createPortal(
        <div
            className={styles.portalPopup}
            style={{
                top: popupPosition.top,
                left: popupPosition.left,
                transform: "translateX(-50%)"
            }}
        >
            <div className={styles.username}>{assignee.userName}</div>
            <button disabled className={styles.popupBtn}>
                View Profile
            </button>
            <button
                onClick={() => {
                    console.log("w")
                    onRemove(assignee.userId);
                    setOpen(false);
                }}
                className={styles.popupBtn}
            >
                Remove from card
            </button>
        </div>,
        document.body
    ) : null;

    return (
        <>
            <button
                ref={avatarRef}
                className={styles.avatar}
                onClick={togglePopup}
                title={assignee.userName}
            >
                {assignee.userName?.charAt(0).toUpperCase()}
            </button>
            {popup}
        </>
    );
}

export default AssigneeAvatar;
