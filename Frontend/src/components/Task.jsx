import React from "react";
import styles from "../pages/ProjectTasks.module.css";

const MAX_AVATARS = 3;

function Task({ task, taskTypes = [], columnKey, onDragStart, onClick }) {
  const taskType = taskTypes.find(tt => tt.id === task.taskTypeId);
  const iconFile = taskType?.icon;
  const handleDragStart = (e) => {
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

  const hasFooter = assignees.length > 0 || dueDate;

  return (
    <li
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={`${styles["task-item"]} ${task.completed ? styles.completed : ""} ${!task.completed && task.isBlocked ? styles.blocked : ""}`}
    >
      <span className={styles["task-title"]}>
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

          {dueDate && (
            <span className={`${styles["task-due"]} ${isOverdue ? styles["task-due-overdue"] : ""}`}>
              {formatDate(dueDate)}
            </span>
          )}
        </div>
      )}
    </li>
  );
}

export default Task;

