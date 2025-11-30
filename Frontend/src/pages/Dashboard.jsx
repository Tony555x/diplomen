import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import Column from "../components/Column";
import Navbar from "../components/Navbar";
import "./Dashboard.css";

function Dashboard() {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState({ "To Do": [], "In Progress": [], "Done": [] });
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const columns = ["To Do", "In Progress", "Done"];

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Fetch project info
        const projectData = await fetchWithAuth(`/api/projects/${projectId}/tasks/project-info`);
        setProject(projectData);

        // Fetch tasks
        const tasksData = await fetchWithAuth(`/api/projects/${projectId}/tasks`);

        // Organize tasks by status
        // We initialize with empty arrays for our known columns
        const organizedTasks = { "To Do": [], "In Progress": [], "Done": [] };

        tasksData.forEach(t => {
          // Map old "todo" etc to new keys if necessary, or use status directly
          let status = t.status;
          if (status === "todo") status = "To Do";
          if (status === "inProgress") status = "In Progress";
          if (status === "done") status = "Done";

          if (!organizedTasks[status]) {
            organizedTasks[status] = [];
          }
          organizedTasks[status].push(t.title);
        });

        setTasks(organizedTasks);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
        setError("Failed to load project data.");
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const addTask = async (column, taskText) => {
    if (!taskText.trim()) return;

    try {
      // Create task in backend
      const result = await fetchWithAuth(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        body: {
          title: taskText,
          status: column
        }
      });

      if (result.success) {
        // Update local state
        setTasks({
          ...tasks,
          [column]: [...(tasks[column] || []), taskText]
        });
      }
    } catch (err) {
      console.error("Failed to create task", err);
      // Optionally show error to user
    }
  };

  const moveTask = (fromColumn, index, toColumn) => {
    // Local update only for now, as requested
    const task = tasks[fromColumn][index];
    const updatedFrom = tasks[fromColumn].filter((_, i) => i !== index);
    const updatedTo = [...(tasks[toColumn] || []), task];
    setTasks({
      ...tasks,
      [fromColumn]: updatedFrom,
      [toColumn]: updatedTo
    });
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <Navbar />
      <div className="dashboard">
        <header>
          <h1>{project?.name || "Project Dashboard"}</h1>
        </header>
        <div className="board">
          {columns.map((columnName) => (
            <Column
              key={columnName}
              columnKey={columnName}
              label={columnName}
              tasks={tasks[columnName] || []}
              addTask={addTask}
              moveTask={moveTask} />
          ))}
        </div>
      </div>
    </>
  );
}

export default Dashboard;
