import React from "react";

function Task({ task, index, columnKey, moveTask }) {
  return (
    <li>
      <span>{task}</span>
      <div className="buttons">
        {columnKey !== "todo" && (
          <button onClick={() => moveTask(columnKey, index, "todo")}>← To Do</button>
        )}
        {columnKey !== "inProgress" && (
          <button onClick={() => moveTask(columnKey, index, "inProgress")}>→ In Progress</button>
        )}
        {columnKey !== "done" && (
          <button onClick={() => moveTask(columnKey, index, "done")}>→ Done</button>
        )}
      </div>
    </li>
  );
}

export default Task;
