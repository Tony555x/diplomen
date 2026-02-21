import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../../auth";
import styles from "./CreateWidget.module.css";

function CreateWidget() {
    const { projectId } = useParams();
    const navigate = useNavigate();

    const [type, setType] = useState(0); // 0 = ListResult, 1 = StatResult, 2 = Counter
    const [source, setSource] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await fetchWithAuth(`/api/projects/${projectId}/dashboard/widgets`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ type: parseInt(type, 10), source })
            });

            navigate(`/project/${projectId}/dashboard`);
        } catch (err) {
            console.error("Failed to create widget", err);
            setError("Failed to create widget: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles['create-widget-page']}>
            <h2>Create New Widget</h2>
            {error && <div className="error">{error}</div>}

            <form onSubmit={handleSubmit} className={styles['create-widget-form']}>
                <div className={styles['form-group']}>
                    <label>Widget Type:</label>
                    <select value={type} onChange={(e) => setType(e.target.value)}>
                        <option value="0">List Result</option>
                        <option value="1">Stat Result</option>
                        <option value="2">Counter</option>
                    </select>
                </div>

                <div className={styles['form-group']}>
                    <label>Widget Query (Source):</label>
                    <textarea
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        placeholder={'Example: SELECT TASK WHERE STATUS "To Do"'}
                        required
                        rows={5}
                    ></textarea>
                </div>

                <div className={styles['form-actions']}>
                    <button type="submit" disabled={loading}>
                        {loading ? "Creating..." : "Create Widget"}
                    </button>
                    <button type="button" onClick={() => navigate(`/project/${projectId}/dashboard`)}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CreateWidget;
