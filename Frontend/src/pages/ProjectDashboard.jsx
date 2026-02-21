import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import styles from "./ProjectDashboard.module.css";

function ProjectDashboard() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [widgets, setWidgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadWidgets = async () => {
            try {
                const data = await fetchWithAuth(`/api/projects/${projectId}/dashboard/widgets`);
                setWidgets(data);
            } catch (err) {
                console.error("Failed to load widgets", err);
                setError("Failed to load dashboard widgets.");
            } finally {
                setLoading(false);
            }
        };

        loadWidgets();
    }, [projectId]);

    const renderWidgetData = (widget) => {
        if (widget.error) {
            return (
                <div className={styles['widget-error']}>
                    <p><strong>Error executing query:</strong></p>
                    <p>{widget.error}</p>
                </div>
            );
        }

        if (!widget.data || widget.data.length === 0) {
            return <p className={styles['no-data']}>No results found.</p>;
        }

        if (widget.listType === "Task" || widget.listType === "TypedTask") {
            return (
                <ul className={styles['widget-list']}>
                    {widget.data.map(item => (
                        <li key={item.id}>
                            <strong>{item.title}</strong> - Status: {item.status} {item.completed ? "(Completed)" : ""}
                        </li>
                    ))}
                </ul>
            );
        } else if (widget.listType === "Member") {
            return (
                <ul className={styles['widget-list']}>
                    {widget.data.map(item => (
                        <li key={`${item.projectId}-${item.userId}`}>
                            <strong>{item.user?.userName || item.userId}</strong> - Role: {item.projectRole?.name || "Unknown"}
                        </li>
                    ))}
                </ul>
            );
        }

        return <pre>{JSON.stringify(widget.data, null, 2)}</pre>;
    };

    return (
        <div className={styles['project-dashboard']}>
            <div className={styles['dashboard-header']}>
                <h2>Project Dashboard</h2>
                <button
                    className={styles['create-widget-btn']}
                    onClick={() => navigate(`/project/${projectId}/dashboard/create-widget`)}
                >
                    + Create Widget
                </button>
            </div>

            {loading ? (
                <div className="loading">Loading dashboard...</div>
            ) : error ? (
                <div className="error">{error}</div>
            ) : widgets.length === 0 ? (
                <div className={styles['no-widgets']}>
                    <p>You don't have any widgets yet.</p>
                </div>
            ) : (
                <div className={styles['widgets-grid']}>
                    {widgets.map(w => (
                        <div key={w.id} className={styles['widget-card']}>
                            <div className={styles['widget-card-header']}>
                                <h3>Widget #{w.id}</h3>
                                <span className={styles['widget-type-badge']}>
                                    {w.type === 0 ? "List Result" : w.type === 1 ? "Stat Result" : "Counter"}
                                </span>
                            </div>
                            <div className={styles['widget-source']}>
                                <code>{w.source}</code>
                            </div>
                            <div className={styles['widget-results']}>
                                {renderWidgetData(w)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ProjectDashboard;
