import React, { useEffect, useState } from "react";
import { NavLink, Routes, Route, Navigate, useParams } from "react-router-dom";
import GeneralSettings from "./settings/GeneralSettings";
import TaskTypesSettings from "./settings/TaskTypesSettings";
import { fetchWithAuth } from "../auth";
import styles from "./ProjectSettings.module.css";

function ProjectSettings() {
    const { projectId } = useParams();
    const [currentUserRole, setCurrentUserRole] = useState(null);

    useEffect(() => {
        fetchWithAuth(`/api/projects/${projectId}/members`)
            .then(data => {
                if (data?.success) setCurrentUserRole(data.currentUserRole);
            })
            .catch(() => { });
    }, [projectId]);

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
                <NavLink
                    to={`/project/${projectId}/settings/task-types`}
                    className={({ isActive }) =>
                        isActive ? styles.activeLink : styles.link
                    }
                >
                    Task Types
                </NavLink>
            </aside>

            <main className={styles.content}>
                <Routes>
                    <Route path="/" element={<Navigate to="general" replace />} />
                    <Route path="general" element={<GeneralSettings projectId={projectId} currentUserRole={currentUserRole} />} />
                    <Route path="task-types" element={<TaskTypesSettings projectId={projectId} currentUserRole={currentUserRole} />} />
                </Routes>
            </main>
        </div>
    );
}

export default ProjectSettings;

