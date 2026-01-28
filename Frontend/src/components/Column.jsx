import React, { useState, useEffect } from "react";
import Task from "./Task";
import Collection from "./Collection";
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

  const rootCollections = collections.filter(
    c => c.status === columnKey && !c.parentCollectionId
  );

  const rootTasks = tasks.filter(
    t => t.status === columnKey && !t.collectionId
  );

  const handleAddTask = () => {
    addTask(columnKey, newTask, selectedType, selectedCollectionId);
    setNewTask("");
    setIsAddingTask(false);
  };

  const handleAddCollection = () => {
    addCollection(columnKey, newCollectionName, selectedCollectionId);
    setNewCollectionName("");
    setIsAddingCollection(false);
  };

  return (
    <div
      className={`${styles.column} ${isDragOver ? styles.dragOver : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        onDrop(columnKey);
      }}
    >
      <h2>{label}</h2>

      <ul>
        {rootCollections.map(collection => (
          <Collection
            key={collection.id}
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

        {rootTasks.map(task => (
          <Task
            key={task.id}
            task={task}
            onDragStart={() => onDragStart(task.id)}
            onClick={() => onTaskClick(task)}
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
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            placeholder="Add new task..."
            autoFocus
          />

          <select
            className={styles["add-task-type"]}
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
          >
            <option value="">No type</option>
            {taskTypes.map(tt => (
              <option key={tt.id} value={tt.id}>
                {tt.name}
              </option>
            ))}
          </select>

          <button
            className={styles["add-task-button"]}
            onClick={handleAddTask}
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
            value={newCollectionName}
            onChange={e => setNewCollectionName(e.target.value)}
            placeholder="Collection name..."
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
