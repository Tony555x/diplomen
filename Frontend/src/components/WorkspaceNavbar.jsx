import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./WorkspaceNavbar.css";

function WorkspaceNavbar({ workspaceId, workspaceName }) {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { name: "Projects", path: `/workspace/${workspaceId}/projects` },
        { name: "Members & Settings", path: `/workspace/${workspaceId}/members` }
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className="workspace-navbar">
            <h2>{workspaceName}</h2>
            <div className="workspace-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.name}
                        className={`workspace-tab ${isActive(tab.path) ? "active" : ""}`}
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
