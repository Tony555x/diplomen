import React from "react";

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
      className="task-item"
    >
      <span>{task.title}</span>
    </li>
  );
}

export default Task;
