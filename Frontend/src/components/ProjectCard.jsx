import React from "react";
import { useNavigate } from "react-router-dom";
import "./ProjectCard.css";

function ProjectCard({ project }) {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate(`/dashboard/${project.id}`);
    };

    return (
        <div className="project-card" onClick={handleClick}>
            <h3>{project.name}</h3>
            <p>Project #{project.id}</p>
        </div>
    );
}

export default ProjectCard;
