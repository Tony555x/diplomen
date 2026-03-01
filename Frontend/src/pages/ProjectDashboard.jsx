import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import styles from "./ProjectDashboard.module.css";
import AddWidgetPopup from "../components/AddWidgetPopup/AddWidgetPopup";

// ─── SVG Bar Chart ───────────────────────────────────────────────────────────

function BarChart({ data }) {
    if (!data || data.length === 0) return <p className={styles["no-data"]}>No data to chart.</p>;
    const max = Math.max(...data.map(d => d.value), 1);
    const BAR_H = 22;
    const LABEL_W = 120;
    const VALUE_W = 36;
    const GAP = 6;
    const BAR_MAX_W = 220;
    const height = data.length * (BAR_H + GAP);

    return (
        <svg width="100%" viewBox={`0 0 ${LABEL_W + BAR_MAX_W + VALUE_W + 16} ${height}`} className={styles["bar-chart"]}>
            {data.map((d, i) => {
                const y = i * (BAR_H + GAP);
                const barW = (d.value / max) * BAR_MAX_W;
                return (
                    <g key={d.label}>
                        <text x={LABEL_W - 8} y={y + BAR_H * 0.72} textAnchor="end" className={styles["bar-label"]}>
                            {d.label}
                        </text>
                        <rect x={LABEL_W} y={y + 2} width={Math.max(barW, 2)} height={BAR_H - 4} rx="4" className={styles["bar-rect"]} />
                        <text x={LABEL_W + barW + 6} y={y + BAR_H * 0.72} className={styles["bar-value"]}>
                            {d.value}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ─── Widget Data Renderers ───────────────────────────────────────────────────

function renderWidgetData(widget, navigate, projectId) {
    if (widget.error) {
        return (
            <div className={styles["widget-error"]}>
                <p><strong>Error:</strong> {widget.error}</p>
            </div>
        );
    }

    const { resultType, data } = widget;

    if (!data || (Array.isArray(data) && data.length === 0)) {
        return <p className={styles["no-data"]}>No results found.</p>;
    }

    if (resultType === "GroupedResult") {
        return <BarChart data={data} />;
    }

    if (resultType === "TaskList") {
        return (
            <ul className={styles["widget-list"]}>
                {data.map(item => (
                    <li
                        key={item.id}
                        className={`${styles["widget-task-item"]} ${item.completed ? styles["completed-task"] : ""} ${item.isBlocked && !item.completed ? styles["blocked-task"] : ""}`}
                        onClick={() => navigate(`/project/${projectId}/tasks/${item.id}`)}
                    >
                        <div className={styles["task-item-header"]}>
                            {item.taskType?.icon && (
                                <img src={`/cardicons/${item.taskType.icon}`} alt={item.taskType.name} className={styles["task-type-icon"]} />
                            )}
                            <span className={styles["task-title"]}>{item.title}</span>
                        </div>
                        <div className={styles["task-item-details"]}>
                            <span className={styles["task-status"]}>{item.status}</span>
                            {item.dueDate && (
                                <span className={styles["task-date"]}>
                                    📅 {new Date(item.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </span>
                            )}
                            {item.assignees?.length > 0 && (
                                <span className={styles["task-assignees"]} title={item.assignees.join(", ")}>
                                    👤 {item.assignees.length}
                                </span>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        );
    }

    if (resultType === "MemberList") {
        return (
            <ul className={styles["widget-list"]}>
                {data.map(item => (
                    <li key={item.userId} className={styles["widget-member-item"]}>
                        <div
                            className={styles["member-avatar"]}
                            style={{ backgroundColor: item.avatarColor || "#7c6af7" }}
                            title={item.userName}
                        >
                            {item.userName?.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles["member-info"]}>
                            <span className={styles["member-name"]}>{item.userName}</span>
                            <span className={styles["member-role"]}>{item.role}</span>
                        </div>
                        <span className={styles["member-tasks"]}>{item.taskCount} tasks</span>
                    </li>
                ))}
            </ul>
        );
    }

    return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

// ─── Main Component ──────────────────────────────────────────────────────────

function ProjectDashboard() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [widgets, setWidgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    useEffect(() => { loadWidgets(); }, [projectId]);

    const handleDeleteWidget = async (widgetId) => {
        if (!window.confirm("Delete this widget?")) return;
        try {
            await fetchWithAuth(`/api/projects/${projectId}/dashboard/widgets/${widgetId}`, { method: "DELETE" });
            setWidgets(prev => prev.filter(w => w.id !== widgetId));
        } catch (err) {
            alert("Failed to delete widget: " + err.message);
        }
    };

    const handleEditWidgetClick = (widgetId) => {
        setEditingWidgetId(widgetId);
        setShowWidgetPopup(true);
    };

    const handleAddWidget = () => {
        setEditingWidgetId(null);
        setShowWidgetPopup(true);
    };

    const handleWidgetSaved = () => { loadWidgets(); };

    return (
        <div className={styles["project-dashboard"]}>
            <div className={styles["dashboard-header"]}>
                <h2>Project Dashboard</h2>
                <button className={styles["create-widget-btn"]} onClick={handleAddWidget}>
                    + Add Widget
                </button>
            </div>

            {loading ? (
                <div className="loading">Loading dashboard...</div>
            ) : error ? (
                <div className="error">{error}</div>
            ) : widgets.length === 0 ? (
                <div className={styles["no-widgets"]}>
                    <p>No widgets yet. Click <strong>+ Add Widget</strong> to get started.</p>
                </div>
            ) : (
                <div className={styles["widgets-grid"]}>
                    {widgets.map(w => (
                        <div key={w.id} className={`${styles["widget-card"]} ${w.resultType === "GroupedResult" ? styles["chart-card"] : ""}`}>
                            <div className={styles["widget-card-header"]}>
                                <h3>{w.name || `Widget #${w.id}`}</h3>
                                <div className={styles["widget-actions"]}>
                                    <button
                                        className={styles["edit-widget"]}
                                        onClick={() => handleEditWidgetClick(w.id)}
                                        title="Edit Widget"
                                    >
                                        <img src="/buttonicons/write.png" alt="Edit" width="20" height="20" />
                                    </button>
                                    <button
                                        className={styles["delete-widget"]}
                                        onClick={() => handleDeleteWidget(w.id)}
                                        title="Delete Widget"
                                    >
                                        <img src="/buttonicons/delete.png" alt="Delete" width="20" height="20" />
                                    </button>
                                </div>
                            </div>
                            <div className={styles["widget-results"]}>
                                {renderWidgetData(w, navigate, projectId)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showWidgetPopup && (
                <AddWidgetPopup
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
