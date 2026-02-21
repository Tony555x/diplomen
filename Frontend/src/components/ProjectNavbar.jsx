import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ProjectNavbar.css";

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
        <div className="project-navbar">
            <h2>{projectName}</h2>
            <div className="project-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.name}
                        className={`project-tab ${isActive(tab.path) ? "active" : ""}`}
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
