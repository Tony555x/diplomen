import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth, getCurrentUser } from "../auth";
import Column from "../components/Column";
import TaskDetailsPopup from "../components/TaskDetailsPopup/TaskDetailsPopup";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./ProjectTasks.module.css";

function ProjectTasks() {
    const { projectId, taskId: taskIdParam } = useParams();
    const navigate = useNavigate();
    usePageTitle("Tasks");


    const [members, setMembers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState(null);

    const [tasks, setTasks] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [collections, setCollections] = useState([]);
    const [taskTypes, setTaskTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [draggedTaskId, setDraggedTaskId] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [selectedCollectionKey, setSelectedCollectionKey] = useState(null); // Format: "collectionId-columnKey"

    // Filter State
    const [filterState, setFilterState] = useState({
        assignedToMe: false,
        assignedToUserId: null,
        assignedToUserName: null,
        completed: false,
        uncompleted: false,
        noDate: false,
        overdue: false,
        typeIds: []
    });

    // const columns = ["To Do", "In Progress", "Done"]; // Now dynamic from 'statuses' state

    const refreshTasks = async () => {
        try {
            //setLoading(true); // Don't show full loading state for refresh
            const [tasksData, taskTypesData, collectionsData, membersData, statusesData] =
                await Promise.all([
                    fetchWithAuth(`/api/projects/${projectId}/tasks`),
                    fetchWithAuth(`/api/projects/${projectId}/task-types`),
                    fetchWithAuth(`/api/projects/${projectId}/collections`),
                    fetchWithAuth(`/api/projects/${projectId}/members`),
                    fetchWithAuth(`/api/projects/${projectId}/statuses`)
                ]);
            const loadedTasks = tasksData || [];
            setTasks(loadedTasks);
            setTaskTypes(taskTypesData.taskTypes || []);
            setCollections(collectionsData || []);
            setMembers(membersData.success ? membersData.members : []);
            setCurrentUserRole(membersData.success ? membersData.currentUserRole : null);
            setStatuses(statusesData || []);

            // Get current user from token
            const user = getCurrentUser();
            setCurrentUser(user);

            // Auto-open task from URL param once tasks are loaded
            const paramId = taskIdParamRef.current;
            if (paramId) {
                const id = parseInt(paramId, 10);
                const match = loadedTasks.find(t => t.id === id);
                if (match) setSelectedTask(match);
            }

        } catch (err) {
            console.error(err);
            setError("Failed to load tasks.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshTasks();
        // Fire-and-forget: update last visited timestamp
        fetchWithAuth(`/api/projects/${projectId}/visit`, { method: "POST" }).catch(() => { });
    }, [projectId]);

    // Keep a ref to taskIdParam so refreshTasks can read the latest value
    const taskIdParamRef = React.useRef(taskIdParam);
    useEffect(() => { taskIdParamRef.current = taskIdParam; }, [taskIdParam]);

    // When the URL param changes without a full remount (user navigates directly to a task URL)
    // just open/close the correct task from the already-loaded list.
    useEffect(() => {
        if (!taskIdParam) {
            setSelectedTask(null);
            return;
        }
    }, [taskIdParam]);

    const openTask = (task) => {
        setSelectedTask(task);
        navigate(`/project/${projectId}/tasks/${task.id}`, { replace: true });
    };

    const closeTask = () => {
        setSelectedTask(null);
        navigate(`/project/${projectId}/tasks`, { replace: true });
    };

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
            throw (err);
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
            throw (err);
        }
    };

    const addStatus = async () => {
        const name = window.prompt("Enter status name:");
        if (!name || !name.trim()) return;

        try {
            const result = await fetchWithAuth(
                `/api/projects/${projectId}/statuses`,
                {
                    method: "POST",
                    body: { name: name.trim() }
                }
            );

            if (result.success) {
                setStatuses(prev => [...prev, result.status]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const deleteStatus = async (statusId) => {
        if (!window.confirm("Delete this status? This will only work if no tasks are currently in this status.")) return;

        try {
            const result = await fetchWithAuth(
                `/api/projects/${projectId}/statuses/${statusId}`,
                { method: "DELETE" }
            );

            if (result.success) {
                setStatuses(prev => prev.filter(s => s.id !== statusId));
            } else {
                alert(result.message || "Failed to delete status.");
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting status.");
        }
    };

    const updateStatus = async (statusId, newName, newColor, newAutoComplete) => {
        if (!newName || !newName.trim()) return;

        try {
            const result = await fetchWithAuth(
                `/api/projects/${projectId}/statuses/${statusId}`,
                {
                    method: "PATCH",
                    body: {
                        name: newName.trim(),
                        color: newColor,
                        autoComplete: newAutoComplete
                    }
                }
            );

            if (result.success) {
                const oldName = statuses.find(s => s.id === statusId)?.name;
                setStatuses(prev => prev.map(s => s.id === statusId ? result.status : s));

                // Update local tasks to use the new status name if it changed
                if (oldName && oldName !== newName.trim()) {
                    setTasks(prev => prev.map(t => t.status === oldName ? { ...t, status: result.status.name } : t));
                }
            } else {
                alert(result.message || "Failed to update status.");
            }
        } catch (err) {
            console.error(err);
            alert("Error updating status.");
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

        let updatedTask = { ...task };

        if (typeof target === "string") {
            // Dropped on a column
            if (task.status === target && !task.collectionId) {
                setDraggedTaskId(null);
                return;
            }
            updatedTask.status = target;
            updatedTask.collectionId = null;
        } else if (typeof target === "object") {
            // Dropped on a collection
            const { collectionId, columnKey } = target;

            if (task.collectionId === collectionId && task.status === columnKey) {
                setDraggedTaskId(null);
                return;
            }

            updatedTask.collectionId = collectionId;
            updatedTask.status = columnKey; // ensure status matches the column where it was dropped
        }

        // Check if the target column has autocomplete enabled
        const targetStatus = statuses.find(s => s.name === updatedTask.status);
        if (targetStatus && targetStatus.autoComplete && !updatedTask.completed) {
            updatedTask.completed = true;
        }

        setTasks(prev => prev.map(t => (t.id === task.id ? updatedTask : t)));
        setDraggedTaskId(null);

        try {
            //does not wait for backend to update
            //if backed does in fact crash, the project will explode(task marked as completed when it really isnt)
            await fetchWithAuth(`/api/projects/${projectId}/tasks/${task.id}`, {
                method: "PATCH",
                body: {
                    status: updatedTask.status,
                    collectionId: updatedTask.collectionId
                }
            });
        } catch (err) {
            console.error(err);
            setTasks(prev => prev.map(t => (t.id === task.id ? task : t)));
        }
    };
    const handleTaskUpdate = async (updatedTask) => {
        try {
            const result = await fetchWithAuth(
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
            if (result && result.success && result.task) {
                const oldTask = tasks.find(t => t.id === updatedTask.id);
                const fullTask = {
                    ...updatedTask,
                    ...result.task,
                    // PATCH response doesn't return assignees/dueDate — preserve from existing state
                    assignees: oldTask?.assignees ?? updatedTask.assignees,
                    dueDate: oldTask?.dueDate ?? updatedTask.dueDate,
                    blockers: oldTask?.blockers ?? updatedTask.blockers,
                    isBlocked: oldTask?.isBlocked ?? updatedTask.isBlocked,
                };

                const completionChanged = oldTask && oldTask.completed !== fullTask.completed;

                setTasks(prev =>
                    prev.map(t => (t.id === updatedTask.id ? fullTask : t))
                );

                if (completionChanged) {
                    await refreshTasks();
                }
            }

        } catch (err) {
            throw (err);
        }
    };

    const handleTaskDelete = async (task) => {
        if (!window.confirm("Archive this task? You can restore it from the Archived Tasks page.")) return;

        try {
            await fetchWithAuth(
                `/api/projects/${projectId}/tasks/${task.id}`,
                { method: "DELETE" }
            );

            setTasks(prev => prev.filter(t => t.id !== task.id));
            setSelectedTask(null);
        } catch (err) {
            throw err;
        }
    };

    const handleSubtaskDelete = async (task) => {
        if (!window.confirm("Permanently delete this subtask? This cannot be undone.")) return;

        try {
            await fetchWithAuth(
                `/api/projects/${projectId}/tasks/${task.id}/permanent`,
                { method: "DELETE" }
            );

            setTasks(prev => prev.filter(t => t.id !== task.id));
            setSelectedTask(null);
        } catch (err) {
            throw err;
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

    const canCreateTasks = currentUserRole?.canCreateEditDeleteTasks === true;
    const canManageStatuses = currentUserRole?.canCreateDeleteTaskStatuses === true;

    return (
        <>
            <div className={styles.projectTasks}>
                <div className={styles.board}>
                    {statuses.map(status => (
                        <Column
                            key={status.id}
                            columnKey={status.name}
                            label={status.name}
                            tasks={tasks}
                            collections={collections}
                            taskTypes={taskTypes}
                            addTask={addTask}
                            addCollection={addCollection}
                            selectedCollectionKey={selectedCollectionKey}
                            onSelectCollection={setSelectedCollectionKey}
                            onDragStart={handleDragStart}
                            onDrop={handleDrop}
                            onTaskClick={openTask}
                            onRenameCollection={renameCollection}
                            onDeleteCollection={deleteCollection}
                            filterState={filterState}
                            setFilterState={setFilterState}
                            members={members}
                            currentUser={currentUser}
                            status={status}
                            onDeleteStatus={() => deleteStatus(status.id)}
                            onUpdateStatus={(newName, newColor, newAutoComplete) => updateStatus(status.id, newName, newColor, newAutoComplete)}
                            canCreateTasks={canCreateTasks}
                            canManageStatuses={canManageStatuses}
                        />

                    ))}
                    <div className={styles.addStatusArea}>
                        {canManageStatuses && (
                            <button className={styles.addStatusButton} onClick={addStatus}>
                                + Add Status
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {selectedTask && (
                <TaskDetailsPopup
                    task={selectedTask}
                    statuses={statuses}
                    taskTypes={taskTypes}
                    onClose={closeTask}
                    onUpdate={handleTaskUpdate}
                    onDelete={canCreateTasks ? (selectedTask.parentTaskId ? handleSubtaskDelete : handleTaskDelete) : null}
                    onDrop={handleDrop}
                    onRefresh={refreshTasks}
                    canCreateTasks={canCreateTasks}
                    onSubtaskCreated={(newTask) => {
                        setTasks(prev => [...prev, newTask]);
                        openTask(newTask);
                    }}
                    onSubtaskClick={(subtask) => {
                        const match = tasks.find(t => t.id === subtask.id) || subtask;
                        openTask(match);
                    }}
                    isMember={currentUserRole?.isMember === true}
                />
            )}
        </>
    );
}

export default ProjectTasks;
