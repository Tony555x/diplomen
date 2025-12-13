import React, { useState } from "react";
import Task from "./Task";

function Column({ columnKey, label, tasks, taskTypes, addTask, onDragStart, onDrop, onTaskClick }) {
  const [newTask, setNewTask] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const handleAdd = () => {
    addTask(columnKey, newTask, selectedType || null);
    setNewTask("");
    setSelectedType("");
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
            onClick={onTaskClick}
          />
        ))}
      </ul>
      <div className="add-task add-task-row">
        <input
          className="add-task-input"
          type="text"
          placeholder="Add new task..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
        />

        <select
          className="add-task-type"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="">No type</option>
          {taskTypes.map(tt => (
            <option key={tt.id} value={tt.id}>
              {tt.name}
            </option>
          ))}
        </select>

        <button className="add-task-btn" onClick={handleAdd}>
          Add
        </button>
      </div>
    </div>
  );
}

export default Column;
