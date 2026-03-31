import React, { useEffect, useState } from "react";
import { useParams, Routes, Route, Navigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import Navbar from "../components/Navbar";
import ProjectNavbar from "../components/ProjectNavbar";
import ProjectDashboard from "./ProjectDashboard";
import ProjectTasks from "./ProjectTasks";
import ProjectMembers from "./ProjectMembers";
import { usePageTitle } from "../hooks/usePageTitle";
import "./ProjectPage.css";
import ProjectSettings from "./ProjectSettings";
import PageBackground from "../components/PageBackground";
import ArchivedTasksPage from "./ArchivedTasksPage";

function ProjectPage() {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    usePageTitle(project?.name ? project.name : "Project");
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
            <PageBackground />
            <Navbar />
            <ProjectNavbar projectId={projectId} projectName={project?.name} />
            <div className="project-content">
                <Routes>
                    <Route path="/" element={<Navigate to={`/project/${projectId}/tasks`} replace />} />
                    <Route path="/dashboard" element={<ProjectDashboard />} />
                    <Route path="/tasks" element={<ProjectTasks />} />
                    <Route path="/tasks/:taskId" element={<ProjectTasks />} />
                    <Route path="/members" element={<ProjectMembers />} />
                    <Route path="/settings/*" element={<ProjectSettings />} />
                    <Route path="/archived" element={<ArchivedTasksPage />} />
                </Routes>
            </div>
        </div>
    );
}

export default ProjectPage;
