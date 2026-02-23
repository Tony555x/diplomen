import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import styles from "./ProjectDashboard.module.css";
import CreateWidgetPopup from "../components/CreateWidgetPopup/CreateWidgetPopup";

function ProjectDashboard() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [widgets, setWidgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Popup State
    const [showWidgetPopup, setShowWidgetPopup] = useState(false);
    const [editingWidgetId, setEditingWidgetId] = useState(null);

    const loadWidgets = async () => {
        setLoading(true);
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

    useEffect(() => {
        loadWidgets();
    }, [projectId]);

    const handleDeleteWidget = async (widgetId) => {
        if (!window.confirm("Are you sure you want to delete this widget?")) return;

        try {
            await fetchWithAuth(`/api/projects/${projectId}/dashboard/widgets/${widgetId}`, {
                method: "DELETE"
            });
            setWidgets(widgets.filter(w => w.id !== widgetId));
        } catch (err) {
            console.error("Failed to delete widget", err);
            alert("Failed to delete widget: " + err.message);
        }
    };

    const handleCreateWidgetClick = () => {
        setEditingWidgetId(null);
        setShowWidgetPopup(true);
    };

    const handleEditWidgetClick = (widgetId) => {
        setEditingWidgetId(widgetId);
        setShowWidgetPopup(true);
    };

    const handleWidgetSaved = () => {
        loadWidgets();
    };

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

        if (widget.listType === "Tasks" || widget.listType === "TypedTasks") {
            return (
                <ul className={styles['widget-list']}>
                    {widget.data.map(item => (
                        <li key={item.id} className={`${styles['widget-task-item']} ${item.completed ? styles['completed-task'] : ''}`}>
                            <div className={styles['task-item-header']}>
                                {item.taskType?.icon && (
                                    <img
                                        src={`/cardicons/${item.taskType.icon}`}
                                        alt={item.taskType.name}
                                        className={styles['task-type-icon']}
                                    />
                                )}
                                <span className={styles['task-title']}>{item.title}</span>
                            </div>
                            <div className={styles['task-item-details']}>
                                <span className={styles['task-status']}>{item.status}</span>
                                {item.assignees && item.assignees.length > 0 && (
                                    <span className={styles['task-assignees']} title={item.assignees.join(', ')}>
                                        👤 {item.assignees.length}
                                    </span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            );
        } else if (widget.listType === "Members") {
            return (
                <ul className={styles['widget-list']}>
                    {widget.data.map(item => (
                        <li key={`${item.projectId}-${item.userId}`} className={styles['widget-member-item']}>
                            <div className={styles['member-item-header']}>
                                <span className={styles['member-name']}>{item.user?.userName || item.userId}</span>
                            </div>
                            <div className={styles['member-item-details']}>
                                <span className={styles['member-role']}>{item.projectRole?.roleName || "Unknown"}</span>
                            </div>
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
                    onClick={handleCreateWidgetClick}
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
                                <h3>{w.name || `Widget #${w.id}`}</h3>
                                <div className={styles['widget-actions']}>
                                    <button
                                        className={styles['edit-widget']}
                                        onClick={() => handleEditWidgetClick(w.id)}
                                        title="Edit Widget"
                                    >
                                        <img src="/buttonicons/write.png" alt="Edit" width="20" height="20" />
                                    </button>
                                    <button
                                        className={styles['delete-widget']}
                                        onClick={() => handleDeleteWidget(w.id)}
                                        title="Delete Widget"
                                    >
                                        <img src="/buttonicons/delete.png" alt="Delete" width="20" height="20" />
                                    </button>
                                </div>
                            </div>
                            <div className={styles['widget-results']}>
                                {renderWidgetData(w)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showWidgetPopup && (
                <CreateWidgetPopup
                    projectId={projectId}
                    widgetId={editingWidgetId}
                    onClose={() => setShowWidgetPopup(false)}
                    onWidgetSaved={handleWidgetSaved}
                />
            )}
        </div>
    );
}

export default ProjectDashboard;
