import React from "react";
import { useNavigate } from "react-router-dom";
import "./ProjectCard.css";

function ProjectCard({ project }) {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate(`/project/${project.id}/tasks`);
    };

    return (
        <div className="project-card" onClick={handleClick}>
            <h3>{project.name}</h3>
            <p className="project-card-link">View tasks →</p>
        </div>
    );
}

export default ProjectCard;
