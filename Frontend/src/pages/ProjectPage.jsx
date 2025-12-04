import React, { useEffect, useState } from "react";
import { useParams, Routes, Route, Navigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import Navbar from "../components/Navbar";
import ProjectNavbar from "../components/ProjectNavbar";
import ProjectTasks from "./ProjectTasks";
import ProjectMembers from "./ProjectMembers";
import "./ProjectPage.css";

function ProjectPage() {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadProject = async () => {
            try {
                const result = await fetchWithAuth(`/api/projects/${projectId}/tasks/project-info`);
                setProject(result);
            } catch (err) {
                console.error("Failed to load project", err);
                setError("Failed to load project.");
            } finally {
                setLoading(false);
            }
        };

        loadProject();
    }, [projectId]);

    if (loading) return <div className="loading">Loading project...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="project-page">
            <Navbar />
            <ProjectNavbar projectId={projectId} projectName={project?.name} />
            <div className="project-content">
                <Routes>
                    <Route path="/" element={<Navigate to={`/project/${projectId}/tasks`} replace />} />
                    <Route path="/tasks" element={<ProjectTasks />} />
                    <Route path="/members" element={<ProjectMembers />} />
                    <Route path="/settings" element={<div style={{ padding: '2rem', color: 'rgba(255,255,255,0.6)' }}>Settings page - Coming soon</div>} />
                </Routes>
            </div>
        </div>
    );
}

export default ProjectPage;
