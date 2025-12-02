import React from "react";

function Task({ task, index, columnKey, onDragStart }) {
  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = "move";
    onDragStart(columnKey, index);
  };

  return (
    <li
      draggable
      onDragStart={handleDragStart}
      className="task-item"
    >
      <span>{task}</span>
    </li>
  );
}

export default Task;
