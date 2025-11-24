import React, { useState } from "react";
import Column from "../components/Column";
import "./Dashboard.css";
import Navbar from "../components/Navbar";

const initialTasks = {
  todo: ["Design homepage", "Set up backend"],
  inProgress: ["Implement login"],
  done: ["Project setup"]
};

function Dashboard() {
  const [tasks, setTasks] = useState(initialTasks);

  const addTask = (column, taskText) => {
    if (!taskText.trim()) return;
    setTasks({
      ...tasks,
      [column]: [...tasks[column], taskText]
    });
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
    <>
      <Navbar /><div className="dashboard">
      {/*
      <header>
        <h1>Task Board</h1>
      </header>
      */}
      <div className="board">
        {columns.map(({ key, label }) => (
          <Column
            key={key}
            columnKey={key}
            label={label}
            tasks={tasks[key]}
            addTask={addTask}
            moveTask={moveTask} />
        ))}
      </div>
      </div>
    </>
  );
}

export default Dashboard;
