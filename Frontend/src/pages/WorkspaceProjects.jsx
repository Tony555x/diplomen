import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import CreateProjectPopup from "../components/CreateProjectPopup";
import ProjectCard from "../components/ProjectCard";
import styles from "./WorkspaceProjects.module.css";

function WorkspaceProjects() {
    const { workspaceId } = useParams();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreatePopup, setShowCreatePopup] = useState(false);

    const loadProjects = async () => {
        try {
            const result = await fetchWithAuth(`/api/workspaces/${workspaceId}/projects`);
            if (Array.isArray(result)) {
                setProjects(result);
            } else {
                setProjects([]);
            }
        } catch (err) {
            console.error("Failed to load projects", err);
            setError("Failed to load projects.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
        fetchWithAuth(`/api/workspaces/${workspaceId}/visit`, { method: "POST" }).catch(() => { });
    }, [workspaceId]);

    const handleProjectCreated = () => {
        setLoading(true);
        loadProjects();
    };

    if (loading) return <div className={styles.loading}>Loading projects...</div>;
    if (error) return <div className={styles.error}>{error}</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Projects</h2>
                <button className={styles.newBtn} onClick={() => setShowCreatePopup(true)}>
                    + New Project
                </button>
            </div>

            {projects.length > 0 ? (
                <div className={styles.grid}>
                    {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            ) : (
                <div className={styles.empty}>
                    <p>No projects in this workspace yet.</p>
                    <p>Click "New Project" to create one.</p>
                </div>
            )}

            {showCreatePopup && (
                <CreateProjectPopup
                    workspaceId={parseInt(workspaceId)}
                    onClose={() => setShowCreatePopup(false)}
                    onProjectCreated={handleProjectCreated}
                />
            )}
        </div>
    );
}

export default WorkspaceProjects;
