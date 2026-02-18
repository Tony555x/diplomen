import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../../auth";
import styles from "./GeneralSettings.module.css";

function GeneralSettings({ projectId, currentUserRole }) {
    const [name, setName] = useState("");
    const [accessLevel, setAccessLevel] = useState("Workspace");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const canEdit = currentUserRole?.canEditProjectSettings === true;
    const isOwner = currentUserRole?.isOwner === true;
    console.log(isOwner);

    useEffect(() => {
        const load = async () => {
            try {
                const project = await fetchWithAuth(
                    `/api/projects/${projectId}/tasks/project-info`
                );
                setName(project.name);
                setAccessLevel(project.accessLevel);
            } catch {
                setError("Failed to load project settings.");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [projectId]);

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(false);

            await fetchWithAuth(`/api/projects/${projectId}`, {
                method: "PATCH",
                body: { name, accessLevel }
            });

            setSuccess(true);
        } catch {
            setError("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    const handleLeave = async () => {
        if (!window.confirm("Are you sure you want to leave this project?")) return;
        try {
            await fetchWithAuth(`/api/projects/${projectId}/leave`, { method: "POST" });
            navigate("/");
        } catch {
            setError("Failed to leave the project.");
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to permanently delete this project? This cannot be undone.")) return;
        try {
            await fetchWithAuth(`/api/projects/${projectId}`, { method: "DELETE" });
            navigate("/");
        } catch {
            setError("Failed to delete the project.");
        }
    };

    if (loading) {
        return <div className={styles.state}>Loading…</div>;
    }

    return (
        <div className={styles.wrapper}>
            <h2 className={styles.title}>General</h2>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>Changes saved</div>}

            <div className={styles.field}>
                <label>Project name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    readOnly={!canEdit}
                    style={!canEdit ? { pointerEvents: "none" } : {}}
                />
            </div>

            <div className={styles.field}>
                <label>Access level</label>
                <select
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(e.target.value)}
                    disabled={!canEdit}
                >
                    <option value="Public">Public</option>
                    <option value="Workspace">Workspace</option>
                    <option value="Private">Private</option>
                </select>
            </div>

            {canEdit && (
                <button
                    className={styles.saveButton}
                    onClick={handleSave}
                    disabled={saving}
                >
                    Save changes
                </button>
            )}

            <div className={styles.dangerZone}>
                {!isOwner && (
                    <button className={styles.leaveButton} onClick={handleLeave}>
                        Leave Project
                    </button>
                )}
                {isOwner && (
                    <button className={styles.deleteButton} onClick={handleDelete}>
                        Delete Project
                    </button>
                )}
            </div>
        </div>
    );
}

export default GeneralSettings;

