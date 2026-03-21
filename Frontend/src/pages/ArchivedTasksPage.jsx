import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./ArchivedTasksPage.module.css";

function ArchivedTasksPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    usePageTitle("Archived Tasks");

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [canManage, setCanManage] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [archivedData, membersData] = await Promise.all([
                    fetchWithAuth(`/api/projects/${projectId}/tasks/archived`),
                    fetchWithAuth(`/api/projects/${projectId}/members`)
                ]);
                setTasks(archivedData || []);
                setCanManage(membersData?.currentUserRole?.canCreateEditDeleteTasks === true);
            } catch {
                setError("Failed to load archived tasks.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [projectId]);

    const formatDate = (iso) => {
        if (!iso) return "—";
        const d = new Date(iso);
        return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    };

    const handleRestore = async (taskId) => {
        try {
            await fetchWithAuth(`/api/projects/${projectId}/tasks/${taskId}/restore`, { method: "POST" });
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } catch {
            alert("Failed to restore task.");
        }
    };

    const handlePermanentDelete = async (taskId, title) => {
        if (!window.confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
        try {
            await fetchWithAuth(`/api/projects/${projectId}/tasks/${taskId}/permanent`, { method: "DELETE" });
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } catch {
            alert("Failed to permanently delete task.");
        }
    };

    if (loading) return <div className={styles.loading}>Loading archived tasks...</div>;
    if (error) return <div className={styles.error}>{error}</div>;

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerText}>
                    <h1 className={styles.title}>Archived Tasks</h1>
                    <span className={styles.subtitle}>{tasks.length} task{tasks.length !== 1 ? "s" : ""} archived</span>
                </div>
            </div>

            {tasks.length === 0 ? (
                <div className={styles.empty}>
                    <p>No archived tasks found.</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {tasks.map(task => (
                        <div key={task.id} className={styles.item}>
                            <div className={styles.itemMain}>
                                <div className={styles.itemTitle}>{task.title}</div>
                                <div className={styles.itemMeta}>
                                    <span className={styles.itemStatus}>{task.status}</span>
                                    {task.completed && <span className={styles.completedBadge}>Completed</span>}
                                    <span className={styles.itemDate}>Archived {formatDate(task.archivedAt)}</span>
                                    {task.assignees?.length > 0 && (
                                        <span className={styles.assignees}>
                                            {task.assignees.map(a => (
                                                <span
                                                    key={a.userId}
                                                    className={styles.avatar}
                                                    style={{ backgroundColor: a.avatarColor || "#6366f1" }}
                                                    title={a.userName}
                                                >
                                                    {a.userName?.charAt(0).toUpperCase()}
                                                </span>
                                            ))}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {canManage && (
                                <div className={styles.actions}>
                                    <button
                                        className={styles.restoreBtn}
                                        onClick={() => handleRestore(task.id)}
                                    >
                                        Restore
                                    </button>
                                    <button
                                        className={styles.deleteBtn}
                                        onClick={() => handlePermanentDelete(task.id, task.title)}
                                    >
                                        Delete Permanently
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ArchivedTasksPage;
