import React, { useState } from "react";
import "./TaskDetailsPopup.css";

function TaskDetailsPopup({ task, taskTypes = [], onClose, onUpdate }) {
    const [title, setTitle] = useState(task.title);
    const [status, setStatus] = useState(task.status);
    const [completed, setCompleted] = useState(task.completed);
    // Task type is now read-only from the task prop
    const taskTypeId = task.taskTypeId;

    const [fieldValues, setFieldValues] = useState(task.fieldValues);
    const [isSaving, setIsSaving] = useState(false);

    // Get current task type object to access its fields
    const currentTaskType = taskTypes.find(tt => tt.id === taskTypeId);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdate({
                ...task,
                title,
                status,
                completed,
                fieldValues
            });
            onClose();
        } catch (err) {
            console.error("Failed to update task", err);
            // Keep popup open on error so user can retry
        } finally {
            setIsSaving(false);
        }
    };

    const handleFieldChange = (fieldId, value) => {
        setFieldValues(prev => {
            const next = [...prev];
            const index = next.findIndex(fv => fv.taskFieldId === fieldId);
            if (index !== -1) {
                next[index].value = value;
            }
            return next;
        });
    };

    const renderField = (field) => {
        const value = fieldValues.find(fv => fv.taskFieldId === field.id)?.value || field.defaultValue || "";

        switch (field.type) {
            case "Boolean":
                return (
                    <div className="form-group checkbox-group" key={field.id}>
                        <label>
                            <input
                                type="checkbox"
                                checked={value === "true"}
                                onChange={(e) => handleFieldChange(field.id, e.target.checked ? "true" : "false")}
                            />
                            <span>{field.name}</span>
                        </label>
                        {field.description && <small className="field-hint">{field.description}</small>}
                    </div>
                );
            case "Select":
            case "MultiSelect": // Treating MultiSelect as Select for simplicity for now
                let options = [];
                try {
                    options = field.options ? JSON.parse(field.options) : [];
                } catch (e) {
                    console.error("Failed to parse options for field", field.name);
                }
                return (
                    <div className="form-group" key={field.id}>
                        <label>{field.name}</label>
                        <select
                            value={value}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        >
                            <option value="">Select...</option>
                            {options.map((opt, idx) => (
                                <option key={idx} value={opt}>{opt}</option>
                            ))}
                        </select>
                        {field.description && <small className="field-hint">{field.description}</small>}
                    </div>
                );
            case "Date":
                return (
                    <div className="form-group" key={field.id}>
                        <label>{field.name}</label>
                        <input
                            type="date"
                            value={value}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        />
                        {field.description && <small className="field-hint">{field.description}</small>}
                    </div>
                );
            case "Number":
                return (
                    <div className="form-group" key={field.id}>
                        <label>{field.name}</label>
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            placeholder={field.name}
                        />
                        {field.description && <small className="field-hint">{field.description}</small>}
                    </div>
                );
            default: // Text
                return (
                    <div className="form-group" key={field.id}>
                        <label>{field.name}</label>
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            placeholder={field.name}
                        />
                        {field.description && <small className="field-hint">{field.description}</small>}
                    </div>
                );
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="task-popup-backdrop" onClick={handleBackdropClick}>
            <div className="task-popup">
                <div className="task-popup-header">
                    <h2>Task Details</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="task-popup-body">
                    <div className="form-group">
                        <label htmlFor="task-title">Title</label>
                        <input
                            id="task-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Task title"
                        />
                    </div>

                    <div className="form-group">
                        <label>Task Type</label>
                        <div className="readonly-field">
                            {currentTaskType ? currentTaskType.name : "No Type"}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="task-status">Status</label>
                        <select
                            id="task-status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                        </select>
                    </div>

                    {/* Render Custom Fields */}
                    {currentTaskType && currentTaskType.fields && currentTaskType.fields.length > 0 && (
                        <div className="custom-fields-section">
                            <h3>{currentTaskType.name} Details</h3>
                            {currentTaskType.fields.map(renderField)}
                        </div>
                    )}

                    <div className="form-group checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={completed}
                                onChange={(e) => setCompleted(e.target.checked)}
                            />
                            <span>Mark as completed</span>
                        </label>
                    </div>
                </div>

                <div className="task-popup-footer">
                    <button className="btn-cancel" onClick={onClose}>Cancel</button>
                    <button
                        className="btn-save"
                        onClick={handleSave}
                        disabled={isSaving || !title.trim()}
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TaskDetailsPopup;
