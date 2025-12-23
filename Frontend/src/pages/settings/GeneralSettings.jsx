import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../../auth";
import styles from "./GeneralSettings.module.css";

function GeneralSettings({ projectId }) {
    const [name, setName] = useState("");
    const [accessLevel, setAccessLevel] = useState("Workspace");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

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
                body: {
                    name,
                    accessLevel
                }
            });

            setSuccess(true);
        } catch {
            setError("Failed to save changes.");
        } finally {
            setSaving(false);
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
                />
            </div>

            <div className={styles.field}>
                <label>Access level</label>
                <select
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(e.target.value)}
                >
                    <option value="Public">Public</option>
                    <option value="Workspace">Workspace</option>
                    <option value="Private">Private</option>
                </select>
            </div>

            <button
                className={styles.saveButton}
                onClick={handleSave}
                disabled={saving}
            >
                Save changes
            </button>
        </div>
    );
}

export default GeneralSettings;
