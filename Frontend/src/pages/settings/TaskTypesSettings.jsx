import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../../auth";
import TaskTypePopup from "./TaskTypePopup";
import styles from "./TaskTypesSettings.module.css";

function TaskTypesSettings({ projectId, currentUserRole }) {
    const [taskTypes, setTaskTypes] = useState([]);
    const [selectedType, setSelectedType] = useState(null);
    const [loading, setLoading] = useState(true);

    const canEdit = currentUserRole?.canEditProjectSettings === true;

    const load = async () => {
        const res = await fetchWithAuth(`/api/projects/${projectId}/task-types`);
        setTaskTypes(res.taskTypes || []);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, [projectId]);

    if (loading) {
        return <div className={styles.state}>Loading…</div>;
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <h2>Task Types</h2>
                {canEdit && (
                    <button onClick={() => setSelectedType({})}>
                        New task type
                    </button>
                )}
            </div>

            <div className={styles.list}>
                {taskTypes.map(tt => (
                    <div
                        key={tt.id}
                        className={styles.item}
                        onClick={canEdit ? () => setSelectedType(tt) : undefined}
                        style={!canEdit ? { pointerEvents: "none" } : {}}
                    >
                        <strong>{tt.name}</strong>
                        <span>{tt.fields.length} fields</span>
                    </div>
                ))}
            </div>

            {selectedType && (
                <TaskTypePopup
                    projectId={projectId}
                    taskType={selectedType}
                    onClose={() => setSelectedType(null)}
                    onSaved={load}
                />
            )}
        </div>
    );
}

export default TaskTypesSettings;

