import React from "react";
import { NavLink, Routes, Route, Navigate, useParams } from "react-router-dom";
import GeneralSettings from "./settings/GeneralSettings";
import styles from "./ProjectSettings.module.css";

function ProjectSettings() {
    const { projectId } = useParams();

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <NavLink
                    to={`/project/${projectId}/settings/general`}
                    className={({ isActive }) =>
                        isActive ? styles.activeLink : styles.link
                    }
                >
                    General
                </NavLink>
            </aside>

            <main className={styles.content}>
                <Routes>
                    <Route path="/" element={<Navigate to="general" replace />} />
                    <Route path="general" element={<GeneralSettings projectId={projectId} />} />
                </Routes>
            </main>
        </div>
    );
}

export default ProjectSettings;
