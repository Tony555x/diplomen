import React, { useState } from "react";
import Task from "./Task";
import styles from "./Collection.module.css";

function Collection({
    collection,
    tasks,
    collections,
    taskTypes,
    selectedCollectionId,
    onSelectCollection,
    onDragStart,
    onTaskClick,
    onDrop // add this prop
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const isSelected = selectedCollectionId === collection.id;

    const childCollections = collections.filter(
        c => c.parentCollectionId === collection.id
    );
    const childTasks = tasks.filter(t => t.collectionId === collection.id);

    const handleSelect = () => {
        if (!isSelected && !isExpanded) {
            onSelectCollection(collection.id);
            setIsExpanded(true);
            return;
        }
        if (!isSelected && isExpanded) {
            onSelectCollection(collection.id);
            return;
        }
        if (isSelected && isExpanded) {
            onSelectCollection(null);
            setIsExpanded(false);
            return;
        }
        if (isSelected && !isExpanded) {
            setIsExpanded(true);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = () => setIsDragOver(false);

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        onDrop(collection.id);
    };

    return (
        <li
            className={`${styles.collection} ${isDragOver ? styles.dragOver : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div
                className={`${styles.collectionHeader} ${isSelected ? styles.selected : ""}`}
                onClick={handleSelect}
            >
                <button
                    className={styles.expandButton}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(prev => !prev);
                    }}
                >
                    {isExpanded ? "▼" : "▶"}
                </button>
                <span className={styles.collectionName}>{collection.name}</span>
            </div>

            {isExpanded && (
                <ul className={styles.collectionContent}>
                    {childCollections.map(child => (
                        <Collection
                            key={`collection-${child.id}`}
                            collection={child}
                            tasks={tasks}
                            collections={collections}
                            taskTypes={taskTypes}
                            selectedCollectionId={selectedCollectionId}
                            onSelectCollection={onSelectCollection}
                            onDragStart={onDragStart}
                            onTaskClick={onTaskClick}
                            onDrop={onDrop} // pass it down
                        />
                    ))}

                    {childTasks.map((task, index) => (
                        <Task
                            key={`task-${task.id}`}
                            task={task}
                            index={index}
                            columnKey={collection.status}
                            onDragStart={onDragStart}
                            onClick={onTaskClick}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

export default Collection;
