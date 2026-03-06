import React, { useEffect, useState } from "react";
import { useParams, Routes, Route, Navigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import Navbar from "../components/Navbar";
import WorkspaceNavbar from "../components/WorkspaceNavbar";
import WorkspaceProjects from "./WorkspaceProjects";
import WorkspaceMembers from "./WorkspaceMembers";
import { usePageTitle } from "../hooks/usePageTitle";
import "./WorkspacePage.css";

function WorkspacePage() {
    const { workspaceId } = useParams();
    const [workspace, setWorkspace] = useState(null);
    usePageTitle(workspace?.name ? workspace.name : "Workspace");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadWorkspace = async () => {
            try {
                const result = await fetchWithAuth(`/api/workspaces/${workspaceId}`);
                setWorkspace(result);
            } catch (err) {
                console.error("Failed to load workspace", err);
                setError("Failed to load workspace.");
            } finally {
                setLoading(false);
            }
        };

        loadWorkspace();
    }, [workspaceId]);

    if (loading) return <div className="loading">Loading workspace...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="workspace-page">
            <Navbar />
            <WorkspaceNavbar workspaceId={workspaceId} workspaceName={workspace?.name} />
            <div className="workspace-content">
                <Routes>
                    <Route path="/" element={<Navigate to={`/workspace/${workspaceId}/projects`} replace />} />
                    <Route path="/projects" element={<WorkspaceProjects />} />
                    <Route path="/members" element={<WorkspaceMembers workspaceName={workspace?.name} />} />
                </Routes>
            </div>
        </div>
    );
}

export default WorkspacePage;
