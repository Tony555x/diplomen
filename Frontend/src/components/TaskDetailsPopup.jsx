import React, { useState, useRef, useEffect } from "react";
import styles from "./TaskDetailsPopup.module.css";
import CustomField from "./CustomField";
import { fetchWithAuth } from "../auth";
import { useParams } from "react-router-dom";
import AssigneeAvatar from "./AssigneeAvatar"

function TaskDetailsPopup({ task, taskTypes = [], onClose, onUpdate, onDelete }) {
    const { projectId } = useParams();

    const [title, setTitle] = useState(task.title);
    const [status, setStatus] = useState(task.status);
    const [completed, setCompleted] = useState(task.completed);
    const [fieldValues, setFieldValues] = useState(task.fieldValues);
    const [assignees, setAssignees] = useState([]);
    const [members, setMembers] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [dueDate, setDueDate] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    const titleInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const currentTaskType = taskTypes.find(tt => tt.id === task.taskTypeId);

    useEffect(() => {
        loadAssignees();
        loadMembers();
        loadDueDate();
        loadMessages();
    }, []);

    useEffect(() => {
        if (isEditingTitle) {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }
    }, [isEditingTitle]);

    const loadDueDate = async () => {
        const result = await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/due-date`
        );
        setDueDate(result?.dueDate ?? null);
    };
    const handleDueDateChange = async value => {
        setDueDate(value);

        await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/due-date`,
            {
                method: "PUT",
                body: JSON.stringify({ dueDate: value })
            }
        );
    };

    const loadAssignees = async () => {
        const result = await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/assignees`
        );
        setAssignees(result || []);
    };

    const loadMembers = async () => {
        const result = await fetchWithAuth(`/api/projects/${projectId}/members`);
        if (result?.success) {
            setMembers(result.members);
        }
    };

    const handleAssign = async userId => {
        await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/assignees`,
            {
                method: "POST",
                body: JSON.stringify({ userId })
            }
        );
        loadAssignees();
    };

    const handleRemove = async userId => {
        console.log("t");
        await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/assignees/${userId}`,
            { method: "DELETE" }
        );
        loadAssignees();
    };

    const loadMessages = async () => {
        const result = await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/messages`
        );
        setMessages(result || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/messages`,
            {
                method: "POST",
                body: JSON.stringify({ content: newMessage })
            }
        );
        setNewMessage("");
        loadMessages();
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins}m ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

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
        console.log(value);
        setFieldValues(prev => {
            let next = [...prev];
            const index = next.findIndex(fv => fv.taskFieldId === fieldId);
            if (index !== -1) next[index] = { ...next[index], value };
            else next.push({ taskFieldId: fieldId, value });
            console.log(next);
            return next;
        });
    };

    const handleBackdropClick = e => {
        if (e.target === e.currentTarget) onClose();
    };

    const assignedIds = assignees.map(a => a.userId);

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
                    <div className={styles.leftColumn}>
                        {currentTaskType?.fields?.length > 0 && (
                            <>
                                <h3>{currentTaskType.name} Details</h3>
                                {currentTaskType.fields.map(field => {
                                    const value =
                                        fieldValues.find(fv => fv.taskFieldId === field.id)?.value ??
                                        field.defaultValue ??
                                        "";
                                    return (
                                        <CustomField
                                            key={field.id}
                                            field={field}
                                            value={value}
                                            onChange={handleFieldChange}
                                        />
                                    );
                                })}
                            </>
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

                    <div className={styles.rightColumn}>
                        <div>
                            <h3>Assignees</h3>

                            <div className={styles.assigneesList}>
                                {assignees.map(a => (
                                    <AssigneeAvatar
                                        key={a.userId}
                                        assignee={a}
                                        onRemove={handleRemove}
                                    />
                                ))}

                                <div className={styles.addAssignee}>
                                    <button className={styles.addAssigneeButton}>+</button>
                                    <select
                                        className={styles.addAssigneeSelect}
                                        onChange={e => handleAssign(e.target.value)}
                                        value=""
                                    >
                                        <option value="" disabled />
                                        {members
                                            .filter(m => !assignedIds.includes(m.userId))
                                            .map(m => (
                                                <option key={m.userId} value={m.userId}>
                                                    {m.userName}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            {assignees.length === 0 && (
                                <div className={styles.hint}>No one assigned</div>
                            )}
                        </div>

                        <div>
                            <h3>Due Date</h3>

                            <input
                                type="date"
                                className={styles.dueDateInput}
                                value={dueDate ? dueDate.slice(0, 10) : ""}
                                onChange={e => handleDueDateChange(e.target.value || null)}
                            />
                        </div>
                    </div>

                    <div className={styles.chatColumn}>
                        <h3>Messages</h3>
                        <div className={styles.messagesList}>
                            {messages.map(msg => (
                                <div key={msg.id} className={styles.message}>
                                    <div className={styles.messageHeader}>
                                        <span className={styles.messageAuthor}>{msg.userName}</span>
                                        <span className={styles.messageTime}>{formatTime(msg.createdAt)}</span>
                                    </div>
                                    <div className={styles.messageContent}>{msg.content}</div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className={styles.messageInput}>
                            <textarea
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Type a message..."
                                rows={3}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim()}
                            >
                                Send
                            </button>
                        </div>
                    </div>
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
                        <button className={styles.cancelButton} onClick={onClose}>
                            Cancel
                        </button>
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
