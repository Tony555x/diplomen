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
                    let status = t.status;

                    if (!organizedTasks[status]) {
                        organizedTasks[status] = [];
                    }
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

        if (projectId) {
            loadData();
        }
    }, [projectId]);

    const addTask = async (column, taskText, taskTypeId) => {
        if (!taskText.trim()) return;

        try {
            const result = await fetchWithAuth(
                `/api/projects/${projectId}/tasks`,
                {
                    method: "POST",
                    body: {
                        title: taskText,
                        status: column,
                        taskTypeId: taskTypeId || null
                    }
                }
            );

            if (result.success) {
                setTasks({
                    ...tasks,
                    [column]: [...(tasks[column] || []), result.task]
                });
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

        if (fromColumn === toColumn) {
            setDraggedTask(null);
            return;
        }

        const task = tasks[fromColumn][index];
        const updatedFrom = tasks[fromColumn].filter((_, i) => i !== index);
        const updatedTo = [...(tasks[toColumn] || []), task];

        setTasks({
            ...tasks,
            [fromColumn]: updatedFrom,
            [toColumn]: updatedTo
        });

        setDraggedTask(null);

        try {
            const res = await fetchWithAuth(`/api/projects/${projectId}/tasks/${task.id}`, {
                method: "PATCH",
                body: {
                    status: toColumn
                }
            });
        } catch (err) {
            console.error("Failed to update task status", err);
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
            console.log(updatedTask);
            await fetchWithAuth(`/api/projects/${projectId}/tasks/${updatedTask.id}`, {
                method: "PATCH",
                body: {
                    status: updatedTask.status,
                    title: updatedTask.title,
                    completed: updatedTask.completed,
                    fieldValues: updatedTask.fieldValues
                }
            });

            const newTasks = { "To Do": [], "In Progress": [], "Done": [] };

            Object.keys(tasks).forEach(column => {
                tasks[column].forEach(task => {
                    if (task.id === updatedTask.id) {
                        newTasks[updatedTask.status].push(updatedTask);
                    } else {
                        newTasks[column].push(task);
                    }
                });
            });

            setTasks(newTasks);
        } catch (err) {
            console.error("Failed to update task", err);
        }
    };
    const handleTaskDelete = async (task) => {
        try {
            if (!window.confirm("Delete this task? This cannot be undone.")) return;

            await fetchWithAuth(
                `/api/projects/${projectId}/tasks/${task.id}`,
                { method: "DELETE" }
            );

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
                    {columns.map((columnName) => (
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
