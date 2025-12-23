import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import Navbar from "../components/Navbar";
import ProjectCard from "../components/ProjectCard";
import styles from "./HomePage.module.css";

function HomePage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

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
                    {data?.workspaces?.length > 0 ? (
                        <div className={styles.cardGrid}>
                            {data.workspaces.map((ws) => (
                                <div
                                    key={ws.id}
                                    className={styles.card}
                                    onClick={() => navigate(`/workspace/${ws.id}/projects`)}
                                >
                                    <h3>{ws.name}</h3>
                                    <p>Workspace #{ws.id}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>
                            No recent workspaces found.{" "}
                            <Link to="/create-workspace" className={styles.link}>
                                Create a workspace
                            </Link>
                        </p>
                    )}
                </section>

                {/* Recent Projects */}
                <section className={styles.homeSection}>
                    <h2>Recent Projects</h2>
                    {data?.projects?.length > 0 ? (
                        <div className={styles.cardGrid}>
                            {data.projects.map((proj) => (
                                <ProjectCard key={proj.id} project={proj} />
                            ))}
                        </div>
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
                                <div key={task.id} className={styles.taskItem}>
                                    <div className={styles.taskInfo}>
                                        <h3>{task.title}</h3>
                                        <p>{task.projectName}</p>
                                    </div>
                                    <span className={styles.taskStatus}>
                                        {task.isCompleted ? "Completed" : "In Progress"}
                                    </span>
                                </div>
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
