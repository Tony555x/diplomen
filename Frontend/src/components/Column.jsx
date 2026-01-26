import React, { useState, useEffect } from "react";
import Task from "./Task";
import CollectionWrapper from "./Collection";
import styles from "../pages/ProjectTasks.module.css";

function Column({
  columnKey,
  label,
  tasks,
  collections,
  taskTypes,
  addTask,
  addCollection,
  selectedCollectionId,
  onSelectCollection,
  onDragStart,
  onDrop,
  onTaskClick
}) {
  const [newTask, setNewTask] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  useEffect(() => {
    if (taskTypes.length > 0 && !selectedType) {
      setSelectedType(taskTypes[0].id);
    }
  }, [taskTypes, selectedType]);

  const handleAdd = () => {
    if (!newTask.trim()) return;
    addTask(columnKey, newTask, selectedType || null, selectedCollectionId);
    setNewTask("");
    setSelectedType("");
    setIsAddingTask(false);
  };

  const handleAddCollection = () => {
    if (!newCollectionName.trim()) return;
    addCollection(columnKey, newCollectionName, selectedCollectionId);
    setNewCollectionName("");
    setIsAddingCollection(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(columnKey);
  };

  return (
    <div
      className={`${styles.column} ${styles[`column-${columnKey.replace(/\s+/g, "")}`]
        } ${isDragOver ? styles.dragOver : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h2>{label}</h2>

      <ul>
        {/* Render root-level collections for this column */}
        {collections
          .filter(c => c.status === columnKey && !c.parentCollectionId)
          .map((collection) => (
            <CollectionWrapper
              key={`collection-${collection.id}`}
              collection={collection}
              tasks={tasks}
              collections={collections}
              taskTypes={taskTypes}
              selectedCollectionId={selectedCollectionId}
              onSelectCollection={onSelectCollection}
              onDragStart={onDragStart}
              onTaskClick={onTaskClick}
            />
          ))}

        {/* Render root-level tasks for this column */}
        {tasks
          .filter(t => t.status === columnKey && !t.collectionId)
          .map((task, index) => (
            <Task
              key={`task-${task.id}`}
              task={task}
              index={index}
              columnKey={columnKey}
              onDragStart={onDragStart}
              onClick={onTaskClick}
            />
          ))}
      </ul>

      {!isAddingTask && !isAddingCollection ? (
        <div className={styles["add-task-row"]}>
          <button
            className={styles["add-task-button"]}
            onClick={() => setIsAddingTask(true)}
          >
            Add Task
          </button>

          <button
            className={styles["add-folder-button"]}
            onClick={() => setIsAddingCollection(true)}
          >
            Add Collection
          </button>
        </div>
      ) : isAddingTask ? (
        <div className={styles["add-task-row-form"]}>
          <input
            className={styles["add-task-input"]}
            type="text"
            placeholder="Add new task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            autoFocus
          />

          <select
            className={styles["add-task-type"]}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">No type</option>
            {taskTypes.map((tt) => (
              <option key={tt.id} value={tt.id}>
                {tt.name}
              </option>
            ))}
          </select>

          <button
            className={styles["add-task-button"]}
            onClick={handleAdd}
          >
            Add
          </button>

          <button
            className={styles["cancel-task-button"]}
            onClick={() => setIsAddingTask(false)}
          >
            ×
          </button>
        </div>
      ) : (
        <div className={styles["add-task-row-form"]}>
          <input
            className={styles["add-task-input"]}
            type="text"
            placeholder="Collection name..."
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            autoFocus
          />

          <button
            className={styles["add-task-button"]}
            onClick={handleAddCollection}
          >
            Add
          </button>

          <button
            className={styles["cancel-task-button"]}
            onClick={() => setIsAddingCollection(false)}
          >
            ×
          </button>
        </div>
      )}

    </div>
  );
}

export default Column;
