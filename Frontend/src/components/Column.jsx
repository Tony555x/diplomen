import React, { useState, useEffect, useRef } from "react";
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
  selectedCollectionKey,
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

  const scrollContainerRef = useRef(null);
  const scrollIntervalRef = useRef(null);

  useEffect(() => {
    if (taskTypes.length > 0 && !selectedType) {
      setSelectedType(taskTypes[0].id);
    }
  }, [taskTypes, selectedType]);

  // Show all root collections in every column (collections are now column-agnostic)
  const rootCollections = collections.filter(
    c => !c.parentCollectionId
  );

  const rootTasks = tasks.filter(
    t => t.status === columnKey && !t.collectionId
  );

  const handleAddTask = () => {
    addTask(columnKey, newTask, selectedType, selectedCollectionKey);
    setNewTask("");
    setIsAddingTask(false);
  };

  const handleAddCollection = () => {
    addCollection(newCollectionName, selectedCollectionKey);
    setNewCollectionName("");
    setIsAddingCollection(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);

    // Auto-scroll logic
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const rect = container.getBoundingClientRect();
      const mouseY = e.clientY;
      const scrollZone = 50; // pixels from top/bottom to trigger scroll
      const scrollSpeed = 5; // pixels per frame

      // Clear any existing scroll interval
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }

      // Check if mouse is in top scroll zone
      if (mouseY < rect.top + scrollZone && container.scrollTop > 0) {
        const scroll = () => {
          if (container.scrollTop > 0) {
            container.scrollTop -= scrollSpeed;
            scrollIntervalRef.current = requestAnimationFrame(scroll);
          }
        };
        scrollIntervalRef.current = requestAnimationFrame(scroll);
      }
      // Check if mouse is in bottom scroll zone
      else if (mouseY > rect.bottom - scrollZone &&
        container.scrollTop < container.scrollHeight - container.clientHeight) {
        const scroll = () => {
          if (container.scrollTop < container.scrollHeight - container.clientHeight) {
            container.scrollTop += scrollSpeed;
            scrollIntervalRef.current = requestAnimationFrame(scroll);
          }
        };
        scrollIntervalRef.current = requestAnimationFrame(scroll);
      }
    }
  };

  const handleDragLeave = (e) => {
    // Only set isDragOver to false if we're actually leaving the column
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragOver(false);
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Clear scroll interval
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    onDrop(columnKey);
  };

  // Cleanup scroll interval on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`${styles.column} ${isDragOver ? styles.dragOver : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h2>{label}</h2>

      <ul className={styles.items} ref={scrollContainerRef}>

        {rootCollections.map(c => (
          <Collection
            key={c.id}
            collection={c}
            columnKey={columnKey}
            tasks={tasks}
            collections={collections}
            taskTypes={taskTypes}
            selectedCollectionKey={selectedCollectionKey}
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
