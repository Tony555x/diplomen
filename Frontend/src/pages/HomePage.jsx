import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import Navbar from "../components/Navbar";
import ProjectCard from "../components/ProjectCard";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./HomePage.module.css";

const RECENT_LIMIT = 4;

function HomePage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAllWorkspaces, setShowAllWorkspaces] = useState(false);
    const [showAllProjects, setShowAllProjects] = useState(false);
    const navigate = useNavigate();
    usePageTitle("Home");

    useEffect(() => {
        const loadData = async () => {
            try {
                const result = await fetchWithAuth("/api/home/data");
                setData(result);
            } catch (err) {
                console.error("Failed to load home data", err);
                setError("Failed to load data.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading) return <div className={styles.loading}>Loading...</div>;
    if (error) return <div className={styles.error}>{error}</div>;

    const allWorkspaces = data?.workspaces ?? [];
    const allProjects = data?.projects ?? [];

    const visibleWorkspaces = showAllWorkspaces ? allWorkspaces : allWorkspaces.slice(0, RECENT_LIMIT);
    const visibleProjects = showAllProjects ? allProjects : allProjects.slice(0, RECENT_LIMIT);

    return (
        <>
            <Navbar />
            <div className={styles.homePage}>
                <header className={styles.homeHeader}>
                    <h1>Welcome Back!</h1>
                    <p>Here's what's happening in your workspaces.</p>
                </header>

                {/* Recent Workspaces */}
                <section className={styles.homeSection}>
                    <h2>Recent Workspaces</h2>
                    <div className={styles.cardGrid}>
                        {visibleWorkspaces.map((ws) => (
                            <div
                                key={ws.id}
                                className={styles.card}
                                onClick={() => navigate(`/workspace/${ws.id}/projects`)}
                            >
                                <h3>{ws.name}</h3>
                                <p className={styles.cardLink}>View projects →</p>
                            </div>
                        ))}
                        <div
                            className={`${styles.card} ${styles.createCard}`}
                            onClick={() => navigate("/create-workspace")}
                        >
                            <h3>+ Create Workspace</h3>
                        </div>
                    </div>
                    {allWorkspaces.length > RECENT_LIMIT && (
                        <button
                            className={styles.showAllBtn}
                            onClick={() => setShowAllWorkspaces(prev => !prev)}
                        >
                            {showAllWorkspaces
                                ? "Show less"
                                : `Show all workspaces (${allWorkspaces.length})`}
                        </button>
                    )}
                </section>

                {/* Recent Projects */}
                <section className={styles.homeSection}>
                    <h2>Recent Projects</h2>
                    {allProjects.length > 0 ? (
                        <>
                            <div className={styles.cardGrid}>
                                {visibleProjects.map((proj) => (
                                    <ProjectCard key={proj.id} project={proj} />
                                ))}
                            </div>
                            {allProjects.length > RECENT_LIMIT && (
                                <button
                                    className={styles.showAllBtn}
                                    onClick={() => setShowAllProjects(prev => !prev)}
                                >
                                    {showAllProjects
                                        ? "Show less"
                                        : `Show all projects (${allProjects.length})`}
                                </button>
                            )}
                        </>
                    ) : (
                        <p>No recent projects found.</p>
                    )}
                </section>

                {/* Assigned Tasks */}
                <section className={styles.homeSection}>
                    <h2>Assigned Tasks</h2>
                    {data?.tasks?.length > 0 ? (
                        <div className={styles.taskList}>
                            {data.tasks.map((task) => (
                                <Link
                                    key={task.id}
                                    to={`/project/${task.projectId}/tasks/${task.id}`}
                                    className={styles.taskItem}
                                >
                                    <div className={styles.taskInfo}>
                                        <h3>{task.title}</h3>
                                        <p>{task.projectName}</p>
                                    </div>
                                    <span className={styles.taskStatus}>
                                        {task.isCompleted ? "Completed" : "In Progress"}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p>No assigned tasks.</p>
                    )}
                </section>
            </div>
        </>
    );
}

export default HomePage;
