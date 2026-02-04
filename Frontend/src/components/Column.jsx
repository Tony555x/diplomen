import React, { useState, useEffect } from "react";
import Task from "./Task";
import Collection from "./Collection";
import styles from "./Column.module.css";

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
  onTaskClick,
  onRenameCollection,
  onDeleteCollection
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

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    onDrop(columnKey);
  };

  return (
    <div
      className={`${styles.column} ${isDragOver ? styles.dragOver : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h2>{label}</h2>

      <ul className={styles.items}>

        {rootCollections.map(c => (
          <Collection
            key={c.id}
            collection={c}
            tasks={tasks}
            collections={collections}
            taskTypes={taskTypes}
            selectedCollectionId={selectedCollectionId}
            onSelectCollection={onSelectCollection}
            onDragStart={onDragStart}
            onDrop={onDrop}
            onTaskClick={onTaskClick}
            onRenameCollection={onRenameCollection}
            onDeleteCollection={onDeleteCollection}
          />


        ))}

        {rootTasks.map(t => (
          <Task
            key={t.id}
            task={t}
            columnKey={columnKey}
            onDragStart={onDragStart}
            onClick={onTaskClick}
          />
        ))}
      </ul>

      {!isAddingTask && !isAddingCollection ? (
        <div className={styles.addRow}>
          <button
            className={styles.addButton}
            onClick={() => setIsAddingTask(true)}
          >
            Add Task
          </button>
          <button
            className={styles.addButton}
            onClick={() => setIsAddingCollection(true)}
          >
            Add Collection
          </button>
        </div>
      ) : isAddingTask ? (
        <div className={styles.addForm}>
          <div className={styles.inputRow}>
            <input
              className={styles.addInput}
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              placeholder="Add new task..."
              autoFocus
            />
          </div>
          <div className={styles.buttonRow}>
            <select
              className={styles.addSelect}
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
            <button className={styles.addButton} onClick={handleAddTask}>
              Add
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => setIsAddingTask(false)}
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.addForm}>
          <div className={styles.inputRow}>
            <input
              className={styles.addInput}
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
              placeholder="Collection name..."
              autoFocus
            />
          </div>
          <div className={styles.buttonRow}>
            <button className={styles.addButton} onClick={handleAddCollection}>
              Add
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => setIsAddingCollection(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Column;
