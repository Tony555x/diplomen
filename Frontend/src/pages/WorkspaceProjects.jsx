import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import CreateProjectPopup from "../components/CreateProjectPopup";
import "./WorkspaceProjects.css";

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
    }, [workspaceId]);

    const handleProjectCreated = () => {
        setLoading(true);
        loadProjects();
    };

    if (loading) return <div className="loading">Loading projects...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="workspace-projects">
            <div className="projects-header">
                <h2>Projects</h2>
                <button
                    className="new-project-btn"
                    onClick={() => setShowCreatePopup(true)}
                >
                    + New Project
                </button>
            </div>

            {projects.length > 0 ? (
                <div className="projects-grid">
                    {projects.map((project) => (
                        <div key={project.id} className="project-card">
                            <h3>{project.name}</h3>
                            <p>Project #{project.id}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="no-projects">
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
