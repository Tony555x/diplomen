import React, { useState, useRef, useEffect } from "react";
import Task from "./Task";
import styles from "./Collection.module.css";

function Collection({
    collection,
    columnKey,
    tasks,
    collections,
    taskTypes,
    selectedCollectionKey,
    onSelectCollection,
    onDragStart,
    onTaskClick,
    onDrop,
    onRenameCollection,
    onDeleteCollection,
    filterState,
    currentUser,
    isTaskVisible
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState(null);

    const [isRenaming, setIsRenaming] = useState(false);
    const [nameValue, setNameValue] = useState(collection.name);

    const inputRef = useRef(null);

    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    useEffect(() => {
        const closeMenu = () => setMenuOpen(false);
        window.addEventListener("mousedown", closeMenu);
        window.addEventListener("scroll", closeMenu, true);
        return () => {
            window.removeEventListener("mousedown", closeMenu);
            window.removeEventListener("scroll", closeMenu, true);
        };
    }, []);

    const commitRename = () => {
        const trimmed = nameValue.trim();
        setIsRenaming(false);

        if (trimmed && trimmed !== collection.name) {
            onRenameCollection(collection.id, trimmed);
        } else {
            setNameValue(collection.name);
        }
    };

    // Check if THIS specific instance (collection + column) is selected
    const collectionKey = `${collection.id}-${columnKey}`;
    const isSelected = selectedCollectionKey === collectionKey;

    const childCollections = collections.filter(
        c => c.parentCollectionId === collection.id
    );
    // Only show tasks that match this column's status
    const childTasks = tasks.filter(t => t.collectionId === collection.id && t.status === columnKey && !t.parentTaskId && isTaskVisible(t));

    // Determine if this collection has any visible content (recursive check)
    // We need to pass down the visibility check to children
    const hasVisibleContent = () => {
        // If there are visible tasks, show it
        if (childTasks.length > 0) return true;

        // If there are child collections, we need to check if ANY of them have visible content
        // We can't easily run the full recursive check here without expensive logic or lifting state up.
        // However, since we are rendering them, we can optimistically assume that if filters are off, show everything.
        // If filters are on, we should only show if we have tasks.

        // BETTER APPROACH:
        // We can't know if a child collection is empty until we check ITS children.
        // This suggests we might need a helper function or memoized value passed down?
        // OR, we just check if childTasks > 0. If 0, check if childCollections > 0. 
        // But childCollections might be empty due to filters!

        // For now, let's implement a simple recursion here
        const hasVisibleChildCollection = childCollections.some(child => {
            const grandkids = tasks.filter(t => t.collectionId === child.id && t.status === columnKey && isTaskVisible(t));
            if (grandkids.length > 0) return true;

            // Deep recursion is hard in a flat component structure without a tree helper.
            // But simplified: A collection is visible if it has tasks OR has a visible child collection.
            // Let's rely on the fact that if a user opens a collection, they want to see it? 
            // user request: "collections which contain no visible tasks should be hidden"

            // Let's implement a recursive check function using the passed props.
            return checkCollectionVisibility(child, collections, tasks, columnKey, isTaskVisible);
        });

        return hasVisibleChildCollection;
    };

    // Recursive helper defined outside or memoized
    const checkCollectionVisibility = (col, allCols, allTasks, colKey, visibilityFn) => {
        const directTasks = allTasks.filter(t => t.collectionId === col.id && t.status === colKey && !t.parentTaskId && visibilityFn(t));
        if (directTasks.length > 0) return true;

        const children = allCols.filter(c => c.parentCollectionId === col.id);
        return children.some(child => checkCollectionVisibility(child, allCols, allTasks, colKey, visibilityFn));
    };

    const isFilterActive = filterState && (
        filterState.assignedToMe ||
        filterState.assignedToUserId ||
        filterState.completed ||
        filterState.uncompleted ||
        filterState.noDate ||
        filterState.overdue ||
        (filterState.typeIds && filterState.typeIds.length > 0)
    );

    // If filters are active, and this collection has no visible content, hide it.
    if (isFilterActive && childTasks.length === 0 && !checkCollectionVisibility(collection, collections, tasks, columnKey, isTaskVisible)) {
        return null;
    }

    return (
        <>
            <li
                className={`${styles.collection} ${isDragOver ? styles.dragOver : ""}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(false);
                    onDrop({ collectionId: collection.id, columnKey });
                }}
            >
                <div
                    className={`${styles.collectionHeader} ${isSelected ? styles.selected : ""}`}
                    onClick={() => onSelectCollection(isSelected ? null : collectionKey)}
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

                    {isRenaming ? (
                        <input
                            ref={inputRef}
                            className={styles.renameInput}
                            value={nameValue}
                            onChange={e => setNameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={e => {
                                if (e.key === "Enter") commitRename();
                                if (e.key === "Escape") {
                                    setIsRenaming(false);
                                    setNameValue(collection.name);
                                }
                            }}
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <span className={styles.collectionName}>{collection.name}</span>
                    )}

                    <button
                        className={styles.menuButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPos({
                                x: rect.right + 6,
                                y: rect.top + rect.height / 2
                            });
                            setMenuOpen(true);
                        }}
                    >
                        …
                    </button>
                </div>

                {isExpanded && (
                    <ul className={styles.collectionContent}>
                        {childCollections.map(child => (
                            <Collection
                                key={child.id}
                                collection={child}
                                columnKey={columnKey}
                                tasks={tasks}
                                collections={collections}
                                taskTypes={taskTypes}
                                selectedCollectionKey={selectedCollectionKey}
                                onSelectCollection={onSelectCollection}
                                onDragStart={onDragStart}
                                onTaskClick={onTaskClick}
                                onDrop={onDrop}
                                onRenameCollection={onRenameCollection}
                                onDeleteCollection={onDeleteCollection}
                                filterState={filterState}
                                currentUser={currentUser}
                                isTaskVisible={isTaskVisible}
                            />
                        ))}

                        {childTasks.map(task => (
                            <Task
                                key={task.id}
                                task={task}
                                taskTypes={taskTypes}
                                onDragStart={onDragStart}
                                onClick={onTaskClick}
                                allTasks={tasks}
                            />
                        ))}
                    </ul>
                )}
            </li>

            {menuOpen && menuPos && (
                <div
                    className={styles.menu}
                    style={{
                        position: "fixed",
                        left: `${menuPos.x}px`,
                        top: `${menuPos.y}px`,
                        transform: "translateY(-50%)",
                        zIndex: 10000
                    }}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            setMenuOpen(false);
                            setIsRenaming(true);
                        }}
                    >
                        Rename
                    </button>
                    <button
                        className={styles.danger}
                        onClick={() => {
                            setMenuOpen(false);
                            onDeleteCollection(collection);
                        }}
                    >
                        Delete
                    </button>
                </div>
            )}
        </>
    );
}

export default Collection;
