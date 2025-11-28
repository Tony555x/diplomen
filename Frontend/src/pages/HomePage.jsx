import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import Navbar from "../components/Navbar";
import "./HomePage.css";

function HomePage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const result = await fetchWithAuth("/api/home/data");
                if (result && (result.workspaces || result.projects || result.tasks)) {
                    setData(result);
                } else {
                    // Handle case where API might return error structure or empty
                    // Assuming fetchWithAuth returns parsed JSON
                    setData(result);
                }
            } catch (err) {
                console.error("Failed to load home data", err);
                setError("Failed to load data.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <>
            <Navbar />
            <div className="home-page">
                <header className="home-header">
                    <h1>Welcome Back!</h1>
                    <p>Here's what's happening in your workspaces.</p>
                </header>

                {/* Recent Workspaces */}
                <section className="home-section">
                    <h2>Recent Workspaces</h2>
                    {data?.workspaces?.length > 0 ? (
                        <div className="card-grid">
                            {data.workspaces.map((ws) => (
                                <div key={ws.id} className="card">
                                    <h3>{ws.name}</h3>
                                    <p>Workspace #{ws.id}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>
                            No recent workspaces found.{" "}
                            <Link to="/create-workspace" style={{ color: '#6b9eff', textDecoration: 'underline' }}>
                                Create a workspace
                            </Link>
                        </p>
                    )}
                </section>

                {/* Recent Projects */}
                <section className="home-section">
                    <h2>Recent Projects</h2>
                    {data?.projects?.length > 0 ? (
                        <div className="card-grid">
                            {data.projects.map((proj) => (
                                <div key={proj.id} className="card">
                                    <h3>{proj.name}</h3>
                                    <p>Project #{proj.id}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No recent projects found.</p>
                    )}
                </section>

                {/* Assigned Tasks */}
                <section className="home-section">
                    <h2>Assigned Tasks</h2>
                    {data?.tasks?.length > 0 ? (
                        <div className="task-list">
                            {data.tasks.map((task) => (
                                <div key={task.id} className="task-item">
                                    <div className="task-info">
                                        <h3>{task.title}</h3>
                                        <p>{task.projectName}</p>
                                    </div>
                                    <span className="task-status">
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
