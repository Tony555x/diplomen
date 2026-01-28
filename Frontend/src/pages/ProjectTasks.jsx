import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import Column from "../components/Column";
import TaskDetailsPopup from "../components/TaskDetailsPopup";
import styles from "./ProjectTasks.module.css";

function ProjectTasks() {
    const { projectId } = useParams();

    const [tasks, setTasks] = useState([]);
    const [collections, setCollections] = useState([]);
    const [taskTypes, setTaskTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [draggedTaskId, setDraggedTaskId] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [selectedCollectionId, setSelectedCollectionId] = useState(null);

    const columns = ["To Do", "In Progress", "Done"];

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);

                const [tasksData, taskTypesData, collectionsData] =
                    await Promise.all([
                        fetchWithAuth(`/api/projects/${projectId}/tasks`),
                        fetchWithAuth(`/api/projects/${projectId}/task-types`),
                        fetchWithAuth(`/api/projects/${projectId}/collections`)
                    ]);

                setTasks(tasksData || []);
                setTaskTypes(taskTypesData.taskTypes || []);
                setCollections(collectionsData || []);
            } catch (err) {
                console.error(err);
                setError("Failed to load tasks.");
            } finally {
                setLoading(false);
            }
        };

        if (projectId) loadData();
    }, [projectId]);

    const addTask = async (status, title, taskTypeId, collectionId) => {
        if (!title.trim()) return;

        try {
            const result = await fetchWithAuth(
                `/api/projects/${projectId}/tasks`,
                {
                    method: "POST",
                    body: {
                        title,
                        status,
                        taskTypeId: taskTypeId || null,
                        collectionId: collectionId || null
                    }
                }
            );

            if (result.success) {
                setTasks(prev => [...prev, result.task]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const addCollection = async (status, name, parentCollectionId) => {
        if (!name.trim()) return;

        try {
            const result = await fetchWithAuth(
                `/api/projects/${projectId}/collections`,
                {
                    method: "POST",
                    body: {
                        name,
                        status,
                        parentCollectionId: parentCollectionId || null
                    }
                }
            );

            if (result.success) {
                setCollections(prev => [...prev, result.collection]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDragStart = (task) => {
        setDraggedTaskId(task.id);
    };

    const handleDrop = async (status) => {
        if (!draggedTaskId) return;

        const task = tasks.find(t => t.id === draggedTaskId);
        if (!task || task.status === status) {
            setDraggedTaskId(null);
            return;
        }

        const updatedTask = { ...task, status };

        setTasks(prev =>
            prev.map(t => (t.id === task.id ? updatedTask : t))
        );

        setDraggedTaskId(null);

        try {
            await fetchWithAuth(
                `/api/projects/${projectId}/tasks/${task.id}`,
                {
                    method: "PATCH",
                    body: { status }
                }
            );
        } catch (err) {
            console.error(err);
            setTasks(prev =>
                prev.map(t => (t.id === task.id ? task : t))
            );
        }
    };

    const handleTaskUpdate = async (updatedTask) => {
        try {
            await fetchWithAuth(
                `/api/projects/${projectId}/tasks/${updatedTask.id}`,
                {
                    method: "PATCH",
                    body: {
                        status: updatedTask.status,
                        title: updatedTask.title,
                        completed: updatedTask.completed,
                        fieldValues: updatedTask.fieldValues
                    }
                }
            );

            setTasks(prev =>
                prev.map(t => (t.id === updatedTask.id ? updatedTask : t))
            );
        } catch (err) {
            console.error(err);
        }
    };

    const handleTaskDelete = async (task) => {
        if (!window.confirm("Delete this task? This cannot be undone.")) return;

        try {
            await fetchWithAuth(
                `/api/projects/${projectId}/tasks/${task.id}`,
                { method: "DELETE" }
            );

            setTasks(prev => prev.filter(t => t.id !== task.id));
            setSelectedTask(null);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="loading">Loading tasks...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <>
            <div className={styles.projectTasks}>
                <div className={styles.board}>
                    {columns.map(column => (
                        <Column
                            key={column}
                            columnKey={column}
                            label={column}
                            tasks={tasks}
                            collections={collections}
                            taskTypes={taskTypes}
                            addTask={addTask}
                            addCollection={addCollection}
                            selectedCollectionId={selectedCollectionId}
                            onSelectCollection={setSelectedCollectionId}
                            onDragStart={handleDragStart}
                            onDrop={handleDrop}
                            onTaskClick={setSelectedTask}
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
