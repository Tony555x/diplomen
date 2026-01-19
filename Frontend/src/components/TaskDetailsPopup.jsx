import React, { useState, useRef, useEffect } from "react";
import styles from "./TaskDetailsPopup.module.css";
import CustomField from "./CustomField";

function TaskDetailsPopup({ task, taskTypes = [], onClose, onUpdate, onDelete }) {
    const [title, setTitle] = useState(task.title);
    const [status, setStatus] = useState(task.status);
    const [completed, setCompleted] = useState(task.completed);
    const [fieldValues, setFieldValues] = useState(task.fieldValues);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const titleInputRef = useRef(null);

    const currentTaskType = taskTypes.find(tt => tt.id === task.taskTypeId);

    useEffect(() => {
        if (isEditingTitle) {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }
    }, [isEditingTitle]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdate({ ...task, title, status, completed, fieldValues });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const handleFieldChange = (fieldId, value) => {
        setFieldValues(prev => {
            const index = prev.findIndex(fv => fv.taskFieldId === fieldId);
            if (index !== -1) prev[index] = { ...prev[index], value };
            else prev.push({ taskFieldId: fieldId, value });
            return [...prev];
        });
    };

    const handleBackdropClick = e => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div className={styles.popup}>
                <div className={styles.header}>
                    <div className={styles.headerMain}>
                        <div className={styles.titleRow}>
                            {isEditingTitle ? (
                                <input
                                    ref={titleInputRef}
                                    className={styles.titleInput}
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    onBlur={() => setIsEditingTitle(false)}
                                    onKeyDown={e => e.key === "Enter" && setIsEditingTitle(false)}
                                />
                            ) : (
                                <h2
                                    className={styles.title}
                                    onClick={() => setIsEditingTitle(true)}
                                >
                                    {title || "Untitled task"}
                                </h2>
                            )}

                            <select
                                className={styles.statusSelect}
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                            >
                                <option value="To Do">To Do</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Done">Done</option>
                            </select>
                        </div>

                        {currentTaskType && (
                            <span className={styles.taskType}>{currentTaskType.name}</span>
                        )}
                    </div>

                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div className={styles.body}>
                    {currentTaskType?.fields?.length > 0 && (
                        <div className={styles.customFields}>
                            <h3>{currentTaskType.name} Details</h3>
                            {currentTaskType.fields.map(field => {
                                const value =
                                    fieldValues.find(fv => fv.taskFieldId === field.id)?.value ??
                                    field.defaultValue ?? "";
                                return (
                                    <CustomField
                                        key={field.id}
                                        field={field}
                                        value={value}
                                        onChange={handleFieldChange}
                                    />
                                );
                            })}
                        </div>
                    )}

                    <label className={styles.checkbox}>
                        <input
                            type="checkbox"
                            checked={completed}
                            onChange={e => setCompleted(e.target.checked)}
                        />
                        <span>Mark as completed</span>
                    </label>
                </div>

                <div className={styles.footer}>
                    {onDelete && (
                        <button
                            className={styles.deleteButton}
                            onClick={() => onDelete(task)}
                        >
                            Delete
                        </button>
                    )}

                    <div className={styles.rightActions}>
                        <button className={styles.cancelButton} onClick={onClose}>Cancel</button>
                        <button
                            className={styles.createButton}
                            onClick={handleSave}
                            disabled={isSaving || !title.trim()}
                        >
                            {isSaving ? "Saving…" : "Save"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TaskDetailsPopup;
