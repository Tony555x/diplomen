import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import styles from "./UserActivityPage.module.css";

function UserActivityPage() {
    const { projectId, userId } = useParams();
    const navigate = useNavigate();

    const [activity, setActivity] = useState([]);
    const [userName, setUserName] = useState("");
    const [projectName, setProjectName] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchWithAuth(
                    `/api/projects/${projectId}/members/${userId}/activity`
                );
                if (data.success) {
                    setActivity(data.activity);
                    setProjectName(data.projectName || "");
                    if (data.activity.length > 0) {
                        setUserName(data.activity[0].userName || "");
                    }
                } else {
                    setError("Failed to load activity.");
                }
            } catch {
                setError("Failed to load activity.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [projectId, userId]);

    const formatDate = (iso) => {
        const d = new Date(iso);
        return d.toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    const actionIcon = (type) => {
        switch (type?.toLowerCase()) {
            case "moved this card to": return "→";
            case "marked this card as completed": return "✓";
            case "marked this card as uncompleted": return "✓";
            case "assigned": return "👤";
            case "removed": return "✕";
            case "created": return "✦";
            //case "edited": return "✎";
            //case "commented": return "💬";
            default: return "•";
        }
    };

    if (loading) return <div className={styles.loading}>Loading activity...</div>;
    if (error) return <div className={styles.error}>{error}</div>;

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    ← Back
                </button>
                <div className={styles.headerText}>
                    <h1 className={styles.title}>
                        {userName ? `${userName}'s Activity` : "User Activity"}
                    </h1>
                    <span className={styles.subtitle}>{projectName || `Project #${projectId}`}</span>
                </div>
            </div>

            {activity.length === 0 ? (
                <div className={styles.empty}>No activity recorded yet.</div>
            ) : (
                <div className={styles.timeline}>
                    {activity.map((entry) => (
                        <div key={entry.id} className={styles.entry}>
                            <div className={styles.entryIcon}>
                                {actionIcon(entry.actionType)}
                            </div>
                            <div className={styles.entryBody}>
                                <div className={styles.entryMain}>
                                    <span className={styles.actionType}>{entry.actionType}</span>
                                    {entry.details && (
                                        <span className={styles.details}>{entry.details}</span>
                                    )}
                                </div>
                                {entry.taskTitle && (
                                    <div
                                        className={styles.taskLink}
                                        onClick={() =>
                                            navigate(`/project/${projectId}/tasks/${entry.taskId}`)
                                        }
                                    >
                                        {entry.taskTitle}
                                    </div>
                                )}
                                <div className={styles.timestamp}>{formatDate(entry.createdAt)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default UserActivityPage;
