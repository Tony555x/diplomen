import React, { useState } from "react";
import styles from "../pages/ProjectTasks.module.css";

const MAX_AVATARS = 3;

function Task({ task, taskTypes = [], columnKey, onDragStart, onClick, allTasks = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const subtasks = allTasks.filter(t => t.parentTaskId === task.id);
  const hasSubtasks = subtasks.length > 0;
  const completedSubtasks = subtasks.filter(t => t.completed).length;
  const isSubtask = !!task.parentTaskId;

  const taskType = taskTypes.find(tt => tt.id === task.taskTypeId);
  const iconFile = taskType?.icon;
  const handleDragStart = (e) => {
    if (isSubtask) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    onDragStart(task);
  };

  const handleClick = (e) => {
    if (e.defaultPrevented) return;
    onClick(task);
  };

  const assignees = task.assignees || [];
  const visibleAssignees = assignees.slice(0, MAX_AVATARS);
  const overflow = assignees.length - MAX_AVATARS;

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && !task.completed && dueDate < new Date();

  const formatDate = (d) => {
    const now = new Date();
    const isThisYear = d.getFullYear() === now.getFullYear();
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(isThisYear ? {} : { year: "numeric" })
    });
  };

  const hasFooter = assignees.length > 0 || dueDate || hasSubtasks;

  return (
    <>
      <li
        draggable={!isSubtask}
        onDragStart={handleDragStart}
        onClick={handleClick}
        className={`${styles["task-item"]} ${task.completed ? styles.completed : ""} ${!task.completed && task.isBlocked ? styles.blocked : ""}`}
        style={isSubtask ? { cursor: "pointer" } : undefined}
      >
        <span className={styles["task-title"]} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {hasSubtasks && (
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', outline: 'none', padding: '0 4px', fontSize: '10px' }}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(prev => !prev);
              }}
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          )}
          {iconFile && (
            <img
              src={`/cardicons/${iconFile}`}
              alt=""
              className={styles["task-type-icon"]}
            />
          )}
          {task.title}
        </span>

        {hasFooter && (
          <div className={styles["task-footer"]}>
            <div className={styles["task-avatars"]}>
              {visibleAssignees.map(a => (
                <span
                  key={a.userId}
                  className={styles["task-avatar"]}
                  style={{ backgroundColor: a.avatarColor || "#3b82f6" }}
                  title={a.userName}
                >
                  {a.userName?.charAt(0).toUpperCase()}
                </span>
              ))}
              {overflow > 0 && (
                <span className={styles["task-avatar-overflow"]}>+{overflow}</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {hasSubtasks && (
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                  </svg>
                  {completedSubtasks}/{subtasks.length}
                </span>
              )}

              {dueDate && (
                <span className={`${styles["task-due"]} ${isOverdue ? styles["task-due-overdue"] : ""}`}>
                  {formatDate(dueDate)}
                </span>
              )}
            </div>
          </div>
        )}
      </li>

      {hasSubtasks && isExpanded && (
        <ul style={{ listStyleType: 'none', paddingLeft: '20px', margin: '4px 0 0 0' }}>
          {subtasks.map(st => (
            <Task
              key={st.id}
              task={st}
              taskTypes={taskTypes}
              columnKey={columnKey}
              onDragStart={onDragStart}
              onClick={onClick}
              allTasks={allTasks}
            />
          ))}
        </ul>
      )}
    </>
  );
}

export default Task;

