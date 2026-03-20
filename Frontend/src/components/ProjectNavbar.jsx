import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./InnerNavbar.module.css";

function ProjectNavbar({ projectId, projectName }) {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { name: "Dashboard", path: `/project/${projectId}/dashboard` },
        { name: "Tasks", path: `/project/${projectId}/tasks` },
        { name: "Members", path: `/project/${projectId}/members` },
        { name: "Settings", path: `/project/${projectId}/settings` }
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className={styles.navbar}>
            <h2 className={styles.title}>{projectName}</h2>
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

export default ProjectNavbar;

