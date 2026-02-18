import React, { useState, useRef, useEffect } from "react";
import styles from "./TaskDetailsPopup.module.css";
import sharedStyles from "../PopupStyles.module.css";
import { fetchWithAuth } from "../../auth";
import { useParams } from "react-router-dom";

import TaskDetailsLeft from "./TaskDetailsLeft";
import TaskDetailsRight from "./TaskDetailsRight";
import TaskDetailsChat from "./TaskDetailsChat";

function TaskDetailsPopup({ task, statuses = [], taskTypes = [], onClose, onUpdate, onDelete, onRefresh, canCreateTasks = false }) {
    const { projectId } = useParams();

    const [title, setTitle] = useState(task.title);
    const [status, setStatus] = useState(task.status);
    const [completed, setCompleted] = useState(task.completed);
    const [fieldValues, setFieldValues] = useState(task.fieldValues);

    const [assignees, setAssignees] = useState([]);
    const [members, setMembers] = useState([]);

    const [dueDate, setDueDate] = useState(task.dueDate || null);

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    const [isSaving, setIsSaving] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    const titleInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    const currentTaskType = taskTypes.find(tt => tt.id === task.taskTypeId);

    useEffect(() => {
        loadAssignees();
        loadMembers();
        loadMessages();
    }, []);

    useEffect(() => {
        if (isEditingTitle) {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }
    }, [isEditingTitle]);

    const loadAssignees = async () => {
        const result = await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/assignees`
        );
        setAssignees(result || []);
    };

    const loadMembers = async () => {
        const result = await fetchWithAuth(`/api/projects/${projectId}/members`);
        if (result?.success) setMembers(result.members);
    };

    // loadDueDate removed as it is now passed in task prop

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

    const loadMessages = async () => {
        const result = await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/messages`
        );
        setMessages(result || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedTask = canCreateTasks
                ? { ...task, title, status, completed, fieldValues }
                : { ...task, status, completed };
            await onUpdate(updatedTask);
            onClose();
        } finally {
            setIsSaving(false);
        }
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
                            {isEditingTitle && canCreateTasks ? (
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
                                    onClick={() => canCreateTasks && setIsEditingTitle(true)}
                                    style={canCreateTasks ? {} : { cursor: "default" }}
                                >
                                    {title || "Untitled task"}
                                </h2>
                            )}

                            <select
                                className={styles.statusSelect}
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                            >
                                {statuses.map(s => (
                                    <option key={s.id} value={s.name}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {currentTaskType && (
                            <span className={styles.taskType}>{currentTaskType.name}</span>
                        )}
                    </div>

                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div className={styles.body}>
                    <TaskDetailsLeft
                        taskType={currentTaskType}
                        completed={completed}
                        setCompleted={setCompleted}
                        fieldValues={fieldValues}
                        setFieldValues={setFieldValues}
                        canCreateTasks={canCreateTasks}
                    />

                    <TaskDetailsRight
                        projectId={projectId}
                        task={task}
                        assignees={assignees}
                        members={members}
                        loadAssignees={loadAssignees}
                        dueDate={dueDate}
                        onDueDateChange={handleDueDateChange}
                        onRefresh={onRefresh}
                        canCreateTasks={canCreateTasks}
                    />

                    <TaskDetailsChat
                        projectId={projectId}
                        taskId={task.id}
                        messages={messages}
                        newMessage={newMessage}
                        setNewMessage={setNewMessage}
                        reloadMessages={loadMessages}
                        messagesEndRef={messagesEndRef}
                    />
                </div>

                <div className={styles.footer}>
                    {onDelete && (
                        <button
                            className={sharedStyles.deleteButton}
                            onClick={() => onDelete(task)}
                        >
                            Delete
                        </button>
                    )}
                    {!onDelete && <div />}

                    <div className={sharedStyles.rightActions}>
                        <button className={sharedStyles.cancelButton} onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className={sharedStyles.createButton}
                            onClick={handleSave}
                            disabled={isSaving || (canCreateTasks && !title.trim())}
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
