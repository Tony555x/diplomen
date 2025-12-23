import React, { useState } from "react";
import Task from "./Task";
import styles from "../pages/ProjectTasks.module.css";

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
      className={`${styles.column} ${styles[`column-${columnKey.replace(/\s+/g, '')}`]} ${isDragOver ? styles.dragOver : ''}`}
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
      <div className={styles["add-task-row"]}>
        <input
          className={styles["add-task-input"]}
          type="text"
          placeholder="Add new task..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
        />
        <select
          className={styles["add-task-type"]}
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
        <button className={styles["add-task-btn"]} onClick={handleAdd}>
          Add
        </button>
      </div>
    </div>
  );
}

export default Column;
