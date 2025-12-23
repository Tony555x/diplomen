import React from "react";
import styles from "../pages/ProjectTasks.module.css";

function Task({ task, index, columnKey, onDragStart, onClick }) {
  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = "move";
    onDragStart(columnKey, index);
  };

  const handleClick = (e) => {
    // Don't trigger click if we're dragging
    if (e.defaultPrevented) return;
    onClick(task);
  };

  return (
    <li
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={`${styles["task-item"]} ${task.completed ? styles.completed : ''}`}
    >
      <span className={styles["task-title"]}>{task.title}</span>
    </li>

  );
}

export default Task;
