import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./WorkspaceNavbar.module.css";

function WorkspaceNavbar({ workspaceId, workspaceName }) {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { name: "Projects", path: `/workspace/${workspaceId}/projects` },
        { name: "Members & Settings", path: `/workspace/${workspaceId}/members` }
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className={styles.navbar}>
            <h2 className={styles.title}>{workspaceName}</h2>
            <div className={styles.tabs}>
                {tabs.map((tab) => (
                    <button
                        key={tab.name}
                        className={`${styles.tab}${isActive(tab.path) ? ` ${styles.tabActive}` : ""}`}
                        onClick={() => navigate(tab.path)}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default WorkspaceNavbar;
