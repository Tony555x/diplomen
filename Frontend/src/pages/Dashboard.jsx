import React, { useState } from "react";
import "./Dashboard.css";

const initialTasks = {
  todo: ["Design homepage", "Set up backend"],
  inProgress: ["Implement login"],
  done: ["Project setup"]
};

function Dashboard() {
  const [tasks, setTasks] = useState(initialTasks);
  const [newTask, setNewTask] = useState("");

  const addTask = (column) => {
    if (!newTask.trim()) return;
    setTasks({
      ...tasks,
      [column]: [...tasks[column], newTask]
    });
    setNewTask("");
  };

  const moveTask = (fromColumn, index, toColumn) => {
    const task = tasks[fromColumn][index];
    const updatedFrom = tasks[fromColumn].filter((_, i) => i !== index);
    const updatedTo = [...tasks[toColumn], task];
    setTasks({
      ...tasks,
      [fromColumn]: updatedFrom,
      [toColumn]: updatedTo
    });
  };

  const columns = [
    { key: "todo", label: "To Do" },
    { key: "inProgress", label: "In Progress" },
    { key: "done", label: "Done" }
  ];

  return (
    <div className="dashboard">
      <header>
        <h1>Task Board</h1>
      </header>
      <div className="board">
        {columns.map(({ key, label }) => (
          <div key={key} className={`column column-${key}`}>
            <h2>{label}</h2>
            <ul>
              {tasks[key].map((task, index) => (
                <li key={index}>
                  <span>{task}</span>
                  <div className="buttons">
                    {key !== "todo" && (
                      <button onClick={() => moveTask(key, index, "todo")}>← To Do</button>
                    )}
                    {key !== "inProgress" && (
                      <button onClick={() => moveTask(key, index, "inProgress")}>→ In Progress</button>
                    )}
                    {key !== "done" && (
                      <button onClick={() => moveTask(key, index, "done")}>→ Done</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="add-task">
              <input
                type="text"
                placeholder="Add new task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
              />
              <button onClick={() => addTask(key)}>Add</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
