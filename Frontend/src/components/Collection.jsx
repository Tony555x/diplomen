import React, { useState } from "react";
import Task from "./Task";
import styles from "../pages/ProjectTasks.module.css";

function Collection({
    collection,
    tasks,
    collections,
    taskTypes,
    isExpanded,
    isSelected,
    onToggleExpand,
    onSelect,
    onDragStart,
    onTaskClick,
    selectedCollectionId, // Added prop
    onSelectCollection // Added prop
}) {
    const childCollections = collections.filter(c => c.parentCollectionId === collection.id);
    const childTasks = tasks.filter(t => t.collectionId === collection.id);

    return (
        <li className={styles.collection}>
            <div
                className={`${styles.collectionHeader} ${isSelected ? styles.selected : ""}`}
                onClick={onSelect}
            >
                <button
                    className={styles.expandButton}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand();
                    }}
                >
                    {isExpanded ? "▼" : "▶"}
                </button>
                <span className={styles.collectionName}>{collection.name}</span>
            </div>

            {isExpanded && (
                <ul className={styles.collectionContent}>
                    {childCollections.map((childCollection) => (
                        <CollectionWrapper
                            key={`collection-${childCollection.id}`}
                            collection={childCollection}
                            tasks={tasks}
                            collections={collections}
                            taskTypes={taskTypes}
                            selectedCollectionId={selectedCollectionId} // Passed down
                            onSelectCollection={onSelectCollection} // Passed down
                            onDragStart={onDragStart}
                            onTaskClick={onTaskClick}
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

// Wrapper component to manage expand/select state
function CollectionWrapper({
    collection,
    tasks,
    collections,
    taskTypes,
    selectedCollectionId, // Added prop
    onSelectCollection, // Added prop
    onDragStart,
    onTaskClick
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const isSelected = selectedCollectionId === collection.id; // Derived from prop

    const handleSelect = () => {
        if (isSelected) {
            onSelectCollection(null); // Deselect if already selected
        } else {
            onSelectCollection(collection.id);
        }
    };

    return (
        <Collection
            collection={{
                ...collection,
                selectedCollectionId, // Passed to Collection
                onSelectCollection // Passed to Collection
            }}
            tasks={tasks}
            collections={collections}
            taskTypes={taskTypes}
            isExpanded={isExpanded}
            isSelected={isSelected}
            onToggleExpand={() => setIsExpanded(!isExpanded)}
            onSelect={handleSelect} // Updated handler
            onDragStart={onDragStart}
            onTaskClick={onTaskClick}
            selectedCollectionId={selectedCollectionId} // Passed to Collection
            onSelectCollection={onSelectCollection} // Passed to Collection
        />
    );
}

export default CollectionWrapper;
