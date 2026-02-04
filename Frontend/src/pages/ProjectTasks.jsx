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
    const [selectedCollectionKey, setSelectedCollectionKey] = useState(null); // Format: "collectionId-columnKey"

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

    const addTask = async (status, title, taskTypeId, selectedCollectionKey) => {
        if (!title.trim()) return;

        // Extract collectionId from selectedCollectionKey (format: "collectionId-columnKey")
        let collectionId = null;
        if (selectedCollectionKey) {
            const parts = selectedCollectionKey.split('-');
            collectionId = parseInt(parts[0]);
        }

        try {
            const result = await fetchWithAuth(
                `/api/projects/${projectId}/tasks`,
                {
                    method: "POST",
                    body: {
                        title,
                        status,
                        taskTypeId: taskTypeId || null,
                        collectionId: collectionId
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

    const addCollection = async (name, selectedCollectionKey) => {
        if (!name.trim()) return;

        // Extract parentCollectionId from selectedCollectionKey
        let parentCollectionId = null;
        if (selectedCollectionKey) {
            const parts = selectedCollectionKey.split('-');
            parentCollectionId = parseInt(parts[0]);
        }

        try {
            const result = await fetchWithAuth(
                `/api/projects/${projectId}/collections`,
                {
                    method: "POST",
                    body: {
                        name,
                        parentCollectionId: parentCollectionId
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

    const handleDrop = async (target) => {
        if (!draggedTaskId) return;

        const task = tasks.find(t => t.id === draggedTaskId);
        if (!task) {
            setDraggedTaskId(null);
            return;
        }

        // Determine new status and collectionId
        let updatedTask = { ...task };
        if (typeof target === "string") {
            // Dropped on a column (not in a collection)
            if (task.status === target && !task.collectionId) {
                // Already in this column and not in a collection
                setDraggedTaskId(null);
                return;
            }
            updatedTask.status = target;
            updatedTask.collectionId = null; // Remove from collection when dropped on column
        } else {
            // Dropped on a collection
            if (task.collectionId === target && task.status === updatedTask.status) {
                // Already in this collection in this column
                setDraggedTaskId(null);
                return;
            }
            // When dropping into a collection, keep the task's current status
            // (the collection instance in each column shows tasks with that column's status)
            updatedTask.collectionId = target;
        }

        // Optimistically update UI
        setTasks(prev => prev.map(t => (t.id === task.id ? updatedTask : t)));
        setDraggedTaskId(null);

        try {
            await fetchWithAuth(`/api/projects/${projectId}/tasks/${task.id}`, {
                method: "PATCH",
                body: {
                    status: updatedTask.status,
                    collectionId: updatedTask.collectionId
                }
            });
        } catch (err) {
            console.error(err);
            // Revert if request fails
            setTasks(prev => prev.map(t => (t.id === task.id ? task : t)));
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
    const renameCollection = async (collectionId, name) => {
        try {
            const result = await fetchWithAuth(
                `/api/projects/${projectId}/collections/${collectionId}`,
                {
                    method: "PATCH",
                    body: { name }
                }
            );

            if (result.success) {
                setCollections(prev =>
                    prev.map(c =>
                        c.id === collectionId ? { ...c, name } : c
                    )
                );
            }
        } catch (err) {
            console.error(err);
        }
    };

    const deleteCollection = async (collection) => {
        if (!window.confirm("Delete this folder? Tasks inside will be moved to the column.")) {
            return;
        }

        try {
            const result = await fetchWithAuth(
                `/api/projects/${projectId}/collections/${collection.id}`,
                { method: "DELETE" }
            );

            if (result.success) {
                setCollections(prev => prev.filter(c => c.id !== collection.id));
                setTasks(prev =>
                    prev.map(t =>
                        t.collectionId === collection.id
                            ? { ...t, collectionId: null }
                            : t
                    )
                );
            }
        } catch (err) {
            console.error(err);
            alert("Unable to delete collection.");
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
                            selectedCollectionKey={selectedCollectionKey}
                            onSelectCollection={setSelectedCollectionKey}
                            onDragStart={handleDragStart}
                            onDrop={handleDrop}
                            onTaskClick={setSelectedTask}
                            onRenameCollection={renameCollection}
                            onDeleteCollection={deleteCollection}
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
                    onDrop={handleDrop}
                />
            )}
        </>
    );
}

export default ProjectTasks;
