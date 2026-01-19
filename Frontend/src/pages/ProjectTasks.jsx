// ProjectTasks.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import Column from "../components/Column";
import TaskDetailsPopup from "../components/TaskDetailsPopup";
import styles from "./ProjectTasks.module.css";

function ProjectTasks() {
    const { projectId } = useParams();

    const [tasks, setTasks] = useState({ "To Do": [], "In Progress": [], "Done": [] });
    const [taskTypes, setTaskTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [draggedTask, setDraggedTask] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);

    const columns = ["To Do", "In Progress", "Done"];

    // Centralized task reordering
    const reorderTasks = (tasksObj, task, fromColumn, toColumn) => {
        if (fromColumn === toColumn) return tasksObj;

        const updatedFrom = tasksObj[fromColumn].filter(t => t.id !== task.id);
        const updatedTo = [...(tasksObj[toColumn] || []), task];

        return {
            ...tasksObj,
            [fromColumn]: updatedFrom,
            [toColumn]: updatedTo
        };
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);

                const [tasksData, taskTypesData] = await Promise.all([
                    fetchWithAuth(`/api/projects/${projectId}/tasks`),
                    fetchWithAuth(`/api/projects/${projectId}/task-types`)
                ]);

                const organizedTasks = { "To Do": [], "In Progress": [], "Done": [] };
                tasksData.forEach(t => {
                    const status = t.status;
                    if (!organizedTasks[status]) organizedTasks[status] = [];
                    organizedTasks[status].push(t);
                });

                setTasks(organizedTasks);
                setTaskTypes(taskTypesData.taskTypes || []);
            } catch (err) {
                console.error("Failed to load tasks data", err);
                setError("Failed to load tasks.");
            } finally {
                setLoading(false);
            }
        };

        if (projectId) loadData();
    }, [projectId]);

    const addTask = async (column, title, taskTypeId) => {
        if (!title.trim()) return;

        try {
            const result = await fetchWithAuth(`/api/projects/${projectId}/tasks`, {
                method: "POST",
                body: {
                    title,
                    status: column,
                    taskTypeId: taskTypeId || null
                }
            });

            if (result.success) {
                setTasks(prev => ({
                    ...prev,
                    [column]: [...(prev[column] || []), result.task]
                }));
            }
        } catch (err) {
            console.error("Failed to create task", err);
        }
    };

    const handleDragStart = (fromColumn, index) => {
        setDraggedTask({ fromColumn, index });
    };

    const handleDrop = async (toColumn) => {
        if (!draggedTask) return;

        const { fromColumn, index } = draggedTask;
        const task = tasks[fromColumn][index];

        const updatedTasks = reorderTasks(tasks, task, fromColumn, toColumn);
        setTasks(updatedTasks);
        setDraggedTask(null);

        try {
            await fetchWithAuth(`/api/projects/${projectId}/tasks/${task.id}`, {
                method: "PATCH",
                body: { status: toColumn }
            });
        } catch (err) {
            console.error("Failed to update task status", err);
            setTasks(reorderTasks(updatedTasks, task, toColumn, fromColumn)); // revert
        }
    };

    const handleTaskClick = (task) => {
        setSelectedTask(task);
    };

    const handleTaskUpdate = async (updatedTask) => {
        try {
            await fetchWithAuth(`/api/projects/${projectId}/tasks/${updatedTask.id}`, {
                method: "PATCH",
                body: {
                    title: updatedTask.title,
                    status: updatedTask.status,
                    completed: updatedTask.completed,
                    fieldValues: updatedTask.fieldValues
                }
            });

            // Reorder if status changed
            setTasks(prev => {
                let fromColumn = null;
                Object.keys(prev).forEach(col => {
                    if (prev[col].some(t => t.id === updatedTask.id)) fromColumn = col;
                });

                return reorderTasks(prev, updatedTask, fromColumn, updatedTask.status);
            });
        } catch (err) {
            console.error("Failed to update task", err);
            throw err; // propagate to popup
        }
    };

    const handleTaskDelete = async (task) => {
        try {
            if (!window.confirm("Delete this task? This cannot be undone.")) return;

            await fetchWithAuth(`/api/projects/${projectId}/tasks/${task.id}`, { method: "DELETE" });

            setTasks(prev => {
                const next = { "To Do": [], "In Progress": [], "Done": [] };
                Object.keys(prev).forEach(column => {
                    next[column] = prev[column].filter(t => t.id !== task.id);
                });
                return next;
            });

            setSelectedTask(null);
        } catch (err) {
            console.error("Failed to delete task", err);
        }
    };

    if (loading) return <div className="loading">Loading tasks...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <>
            <div className={styles.projectTasks}>
                <div className={styles.board}>
                    {columns.map(columnName => (
                        <Column
                            key={columnName}
                            columnKey={columnName}
                            label={columnName}
                            tasks={tasks[columnName] || []}
                            taskTypes={taskTypes}
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
                    taskTypes={taskTypes}
                    onClose={() => setSelectedTask(null)}
                    onUpdate={handleTaskUpdate}
                    onDelete={handleTaskDelete}
                />
            )}
        </>
    );
}

export default ProjectTasks;
