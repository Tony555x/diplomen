import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import Column from "../components/Column";
import Navbar from "../components/Navbar";
import TaskDetailsPopup from "../components/TaskDetailsPopup";
import "./Dashboard.css";

function Dashboard() {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState({ "To Do": [], "In Progress": [], "Done": [] });
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

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
          // Store the full task object instead of just the title
          organizedTasks[status].push(t);
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
        // Update local state with the full task object
        setTasks({
          ...tasks,
          [column]: [...(tasks[column] || []), result.task]
        });
      }
    } catch (err) {
      console.error("Failed to create task", err);
      // Optionally show error to user
    }
  };

  const handleDragStart = (fromColumn, index) => {
    setDraggedTask({ fromColumn, index });
  };

  const handleDrop = async (toColumn) => {
    if (!draggedTask) return;

    const { fromColumn, index } = draggedTask;

    // Don't do anything if dropped in the same column
    if (fromColumn === toColumn) {
      setDraggedTask(null);
      return;
    }

    // Move the task
    const task = tasks[fromColumn][index];
    const updatedFrom = tasks[fromColumn].filter((_, i) => i !== index);
    const updatedTo = [...(tasks[toColumn] || []), task];

    // Optimistically update UI
    setTasks({
      ...tasks,
      [fromColumn]: updatedFrom,
      [toColumn]: updatedTo
    });

    setDraggedTask(null);

    // Persist to database
    try {
      await fetchWithAuth(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: "PATCH",
        body: {
          status: toColumn
        }
      });
    } catch (err) {
      console.error("Failed to update task status", err);
      // Revert the change on error
      setTasks({
        ...tasks,
        [fromColumn]: [...updatedFrom, task],
        [toColumn]: updatedTo.filter(t => t.id !== task.id)
      });
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  const handleTaskUpdate = async (updatedTask) => {
    try {
      // Update in backend
      await fetchWithAuth(`/api/projects/${projectId}/tasks/${updatedTask.id}`, {
        method: "PATCH",
        body: {
          status: updatedTask.status,
          title: updatedTask.title,
          completed: updatedTask.completed
        }
      });

      // Update local state
      const newTasks = { "To Do": [], "In Progress": [], "Done": [] };

      // Rebuild tasks with the updated task
      Object.keys(tasks).forEach(column => {
        tasks[column].forEach(task => {
          if (task.id === updatedTask.id) {
            // Place updated task in its new status column
            newTasks[updatedTask.status].push(updatedTask);
          } else {
            // Keep other tasks in their current column
            newTasks[column].push(task);
          }
        });
      });

      setTasks(newTasks);
    } catch (err) {
      console.error("Failed to update task", err);
      throw err; // Re-throw so popup can handle it
    }
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
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>
      </div>
      {selectedTask && (
        <TaskDetailsPopup
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </>
  );
}

export default Dashboard;
