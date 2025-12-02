import React, { useState } from "react";
import "./TaskDetailsPopup.css";

function TaskDetailsPopup({ task, onClose, onUpdate }) {
    const [title, setTitle] = useState(task.title);
    const [status, setStatus] = useState(task.status);
    const [completed, setCompleted] = useState(task.completed);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdate({
                ...task,
                title,
                status,
                completed
            });
            onClose();
        } catch (err) {
            console.error("Failed to update task", err);
            // Keep popup open on error so user can retry
        } finally {
            setIsSaving(false);
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
