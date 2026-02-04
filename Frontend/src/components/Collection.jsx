import React, { useState, useRef, useEffect } from "react";
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
    onDrop,
    onRenameCollection,
    onDeleteCollection
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState(null);

    const [isRenaming, setIsRenaming] = useState(false);
    const [nameValue, setNameValue] = useState(collection.name);

    const inputRef = useRef(null);

    const isSelected = selectedCollectionId === collection.id;

    const childCollections = collections.filter(
        c => c.parentCollectionId === collection.id
    );
    const childTasks = tasks.filter(t => t.collectionId === collection.id);

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
                    onDrop(collection.id);
                }}
            >
                <div
                    className={`${styles.collectionHeader} ${isSelected ? styles.selected : ""}`}
                    onClick={() => onSelectCollection(collection.id)}
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
                                tasks={tasks}
                                collections={collections}
                                taskTypes={taskTypes}
                                selectedCollectionId={selectedCollectionId}
                                onSelectCollection={onSelectCollection}
                                onDragStart={onDragStart}
                                onTaskClick={onTaskClick}
                                onDrop={onDrop}
                                onRenameCollection={onRenameCollection}
                                onDeleteCollection={onDeleteCollection}
                            />
                        ))}

                        {childTasks.map(task => (
                            <Task
                                key={task.id}
                                task={task}
                                onDragStart={onDragStart}
                                onClick={onTaskClick}
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
