import React, { useState } from "react";
import Task from "./Task";

function Column({ columnKey, label, tasks, addTask, onDragStart, onDrop }) {
  const [newTask, setNewTask] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const handleAdd = () => {
    addTask(columnKey, newTask);
    setNewTask("");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(columnKey);
  };

  return (
    <div
      className={`column column-${columnKey.replace(/\s+/g, '')} ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h2>{label}</h2>
      <ul>
        {tasks.map((task, index) => (
          <Task
            key={index}
            task={task}
            index={index}
            columnKey={columnKey}
            onDragStart={onDragStart}
          />
        ))}
      </ul>
      <div className="add-task">
        <input
          type="text"
          placeholder="Add new task..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
        />
        <button onClick={handleAdd}>Add</button>
      </div>
    </div>
  );
}

export default Column;
