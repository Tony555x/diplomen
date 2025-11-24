import React, { useState } from "react";
import Task from "./Task";

function Column({ columnKey, label, tasks, addTask, moveTask }) {
  const [newTask, setNewTask] = useState("");

  const handleAdd = () => {
    addTask(columnKey, newTask);
    setNewTask("");
  };

  return (
    <div className={`column column-${columnKey}`}>
      <h2>{label}</h2>
      <ul>
        {tasks.map((task, index) => (
          <Task
            key={index}
            task={task}
            index={index}
            columnKey={columnKey}
            moveTask={moveTask}
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
