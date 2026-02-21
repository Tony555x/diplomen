import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../../auth";
import styles from "../PopupStyles.module.css";

function CreateWidgetPopup({ projectId, widgetId, onClose, onWidgetSaved }) {
    const isEditing = !!widgetId;

    const [name, setName] = useState("");
    const [type, setType] = useState("ListResult");

    const [source, setSource] = useState("");
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditing);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isEditing) {
            const loadWidget = async () => {
                try {
                    // We don't have a GET single widget endpoint, so we can fetch all and find it
                    const data = await fetchWithAuth(`/api/projects/${projectId}/dashboard/widgets`);
                    const widget = data.find(w => w.id === parseInt(widgetId));
                    if (widget) {
                        setName(widget.name || "");
                        setType(widget.type || "ListResult");
                        setSource(widget.source || "");
                    } else {
                        setError("Widget not found.");
                    }
                } catch (err) {
                    setError("Failed to load widget details.");
                } finally {
                    setInitialLoading(false);
                }
            };
            loadWidget();
        }
    }, [isEditing, projectId, widgetId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const endpoint = isEditing
                ? `/api/projects/${projectId}/dashboard/widgets/${widgetId}`
                : `/api/projects/${projectId}/dashboard/widgets`;

            const method = isEditing ? "PUT" : "POST";

            const result = await fetchWithAuth(endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name, type, source })
            });

            onWidgetSaved(result, isEditing);
            onClose();
        } catch (err) {
            console.error(`Failed to ${isEditing ? 'update' : 'create'} widget`, err);
            setError(`Failed to ${isEditing ? 'update' : 'create'} widget: ` + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) return null;

    return (
        <div className={styles.backdrop}>
            <div className={styles.popup}>
                <div className={styles.header}>
                    <h2>{isEditing ? "Edit Widget" : "Create New Widget"}</h2>
                    <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                </div>
                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className={styles.field}>
                        <label>Widget Name:</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="e.g. My Open Tasks"
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Widget Type:</label>
                        <select value={type} onChange={(e) => setType(e.target.value)}>
                            <option value="ListResult">List Result</option>
                            <option value="StatResult">Stat Result (Not Implemented)</option>
                            <option value="Counter">Counter (Not Implemented)</option>
                        </select>
                    </div>

                    <div className={styles.field}>
                        <label>Widget Query (Source):</label>
                        <textarea
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            placeholder={'Example: SELECT TASK WHERE STATUS "To Do"'}
                            required
                            rows={5}
                        ></textarea>
                    </div>

                    <div className={styles.actions}>
                        <div className={styles.rightActions}>
                            <button type="button" className={styles.cancelButton} onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className={styles.createButton} disabled={loading}>
                                {loading ? "Saving..." : (isEditing ? "Save Changes" : "Create Widget")}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateWidgetPopup;
