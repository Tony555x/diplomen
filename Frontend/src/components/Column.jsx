import React, { useState, useEffect, useRef } from "react";
import Task from "./Task";
import Collection from "./Collection";
import FilterPopup from "./FilterPopup";
import ColumnSettingsPopup from "./ColumnSettingsPopup/ColumnSettingsPopup";
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
  onDeleteCollection,
  filterState,
  setFilterState,
  members,
  currentUser,
  status,
  onDeleteStatus,
  onUpdateStatus,
  onShiftStatus,
  isFirstColumn,
  isLastColumn,
  canCreateTasks,
  canManageStatuses
}) {

  const [newTask, setNewTask] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editLabelValue, setEditLabelValue] = useState(label);

  const [columnError, setColumnError] = useState("");

  const scrollContainerRef = useRef(null);
  const scrollIntervalRef = useRef(null);
  const filterBtnRef = useRef(null);
  const typeDropdownRef = useRef(null);

  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target)) {
        setIsTypeDropdownOpen(false);
      }
    };
    if (isTypeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTypeDropdownOpen]);

  useEffect(() => {
    if (taskTypes.length > 0 && !selectedType) {
      setSelectedType(taskTypes[0].id);
    }
  }, [taskTypes, selectedType]);

  const handleLabelClick = () => {
    if (canManageStatuses) {
      setIsEditingLabel(true);
      setEditLabelValue(label);
    }
  };

  const handleLabelBlurOrEnter = () => {
    setIsEditingLabel(false);
    if (editLabelValue.trim() && editLabelValue.trim() !== label) {
      if (onUpdateStatus) {
        onUpdateStatus(editLabelValue.trim(), status?.color, status?.autoComplete);
      }
    } else {
      setEditLabelValue(label);
    }
  };

  // Filtering Helper
  const hasFilters = filterState && (
    filterState.assignedToMe ||
    filterState.assignedToUserId ||
    filterState.completed ||
    filterState.uncompleted ||
    filterState.noDate ||
    filterState.overdue ||
    filterState.blocked ||
    filterState.unblocked ||
    (filterState.typeIds && filterState.typeIds.length > 0)
  );

  const checkSingleTaskVisibility = (task) => {
    // Assignment Filters
    if (filterState.assignedToMe) {
      if (!currentUser) return false;
      const isAssigned = task.assignees && task.assignees.some(a => a.userId === currentUser.nameid);
      if (!isAssigned) return false;
    }

    if (filterState.assignedToUserId) {
      const isAssigned = task.assignees && task.assignees.some(a => a.userId === filterState.assignedToUserId);
      if (!isAssigned) return false;
    }

    // Status Filters
    // If BOTH completed and uncompleted are checked or NEITHER, ignore (logic usually implies "show this type")
    // If only one is checked, filter by it.
    if (filterState.completed && !filterState.uncompleted) {
      if (!task.completed) return false;
    }
    if (filterState.uncompleted && !filterState.completed) {
      if (task.completed) return false;
    }

    // Blocker Filters
    if (filterState.blocked && !filterState.unblocked) {
      // Must be uncompleted and blocked to be considered currently "blocked"
      if (task.completed || !task.isBlocked) return false;
    }
    if (filterState.unblocked && !filterState.blocked) {
      // Show if it's NOT blocked (or if it's completed, it's effectively unblocked)
      if (!task.completed && task.isBlocked) return false;
    }

    // Date Filters
    if (filterState.noDate) {
      if (task.dueDate) return false;
    }

    if (filterState.overdue) {
      if (!task.dueDate) return false; // cannot be overdue if no date
      const isOverdue = new Date(task.dueDate) < new Date() && !task.completed;
      if (!isOverdue) return false;
    }

    // Task Type Filters
    if (filterState.typeIds && filterState.typeIds.length > 0) {
      if (!filterState.typeIds.includes(task.taskTypeId)) return false;
    }

    return true;
  };

  const isTaskVisible = (task) => {
    // If no filters are active, show everything
    if (!hasFilters) return true;

    // If the task itself matches, show it
    if (checkSingleTaskVisibility(task)) return true;

    // Otherwise, show it if any of its subtasks match
    const subtasks = tasks.filter(t => t.parentTaskId === task.id);
    return subtasks.some(st => checkSingleTaskVisibility(st));
  };

  // Show all root collections in every column (collections are now column-agnostic)
  const rootCollections = collections.filter(
    c => !c.parentCollectionId
  );

  const rootTasks = tasks.filter(
    t => t.status === columnKey && !t.collectionId && !t.parentTaskId && isTaskVisible(t)
  );

  const handleAddTask = async () => {
    setColumnError("");
    try {
      await addTask(columnKey, newTask, selectedType, selectedCollectionKey);
      setNewTask("");
      setIsAddingTask(false);
    } catch (err) {
      setColumnError(err.message || "Failed to create task");
    }
  };

  const handleAddCollection = async () => {
    setColumnError("");
    try {
      await addCollection(newCollectionName, selectedCollectionKey);
      setNewCollectionName("");
      setIsAddingCollection(false);
    } catch (err) {
      setColumnError(err.message || "Failed to create collection");
    }
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

  const isFilterActive = filterState && (
    filterState.assignedToMe ||
    filterState.assignedToUserId ||
    filterState.completed ||
    filterState.uncompleted ||
    filterState.noDate ||
    filterState.overdue ||
    filterState.blocked ||
    filterState.unblocked ||
    (filterState.typeIds && filterState.typeIds.length > 0)
  );

  const columnColor = status?.color || "#3B82F6";

  return (
    <div
      className={`${styles.column} ${isDragOver ? styles.dragOver : ""}`}
      style={{ borderTop: `5px solid ${columnColor}` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.headerRow}>
        {isEditingLabel ? (
          <input
            autoFocus
            className={styles.headerTitleInput}
            value={editLabelValue}
            onChange={(e) => setEditLabelValue(e.target.value)}
            onBlur={handleLabelBlurOrEnter}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLabelBlurOrEnter();
              if (e.key === "Escape") {
                setIsEditingLabel(false);
                setEditLabelValue(label);
              }
            }}
          />
        ) : (
          <h2
            onClick={handleLabelClick}
            style={{ cursor: canManageStatuses ? 'pointer' : 'default' }}
            title={canManageStatuses ? "Click to rename" : ""}
          >
            {label}
          </h2>
        )}
        <button
          ref={filterBtnRef}
          className={`${styles.filterBtn} ${isFilterActive ? styles.active : ""}`}
          onClick={() => setShowFilter(!showFilter)}
        >
          <img src="/filter.png" alt="Filter" />
        </button>

        {canManageStatuses && (
          <button
            className={styles.settingsBtn}
            onClick={() => setShowSettings(true)}
            title="Column Settings"
          >
            ...
            {/*<img src="/buttonicons/settings.png" alt="Settings" width="20" height="20" />*/}
          </button>
        )}

        {showFilter && (
          <FilterPopup
            filterState={filterState}
            onChange={setFilterState}
            members={members}
            taskTypes={taskTypes}
            onClose={() => setShowFilter(false)}
            ignoreRef={filterBtnRef}
          />
        )}

        {showSettings && status && (
          <ColumnSettingsPopup
            status={status}
            onClose={() => setShowSettings(false)}
            onUpdate={onUpdateStatus}
            onDelete={onDeleteStatus}
            onShift={onShiftStatus}
            isFirstColumn={isFirstColumn}
            isLastColumn={isLastColumn}
            canManageStatuses={canManageStatuses}
            hasTasks={tasks.some(t => t.status === columnKey)}
          />
        )}
      </div>

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
            filterState={filterState}
            currentUser={currentUser}
            isTaskVisible={isTaskVisible}
          />


        ))}

        {rootTasks.map(t => (
          <Task
            key={t.id}
            task={t}
            taskTypes={taskTypes}
            columnKey={columnKey}
            onDragStart={onDragStart}
            onClick={onTaskClick}
            allTasks={tasks}
          />
        ))}
      </ul>

      {columnError && (
        <div className={styles.errorBox}>
          <span className={styles.errorText}>{columnError}</span>
        </div>
      )}

      {!isAddingTask && !isAddingCollection ? (
        <div className={styles.addRow}>
          {canCreateTasks && (
            <button
              className={styles.addButton}
              onClick={() => {
                setColumnError("");
                setIsAddingTask(true);
              }}
            >
              Add Card
            </button>
          )}
          {canCreateTasks && (
            <button
              className={styles.addButton}
              onClick={() => {
                setColumnError("");
                setIsAddingCollection(true);
              }}
            >
              Add Collection
            </button>
          )}
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
            <div className={styles.customSelect} ref={typeDropdownRef}>
              <div
                className={styles.addSelect}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.4rem 0.5rem', height: '100%', boxSizing: 'border-box' }}
                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              >
                {selectedType ? (
                  <>
                    {taskTypes.find(tt => tt.id == selectedType)?.icon && (
                      <img
                        src={`/cardicons/${taskTypes.find(tt => tt.id == selectedType).icon}`}
                        alt=""
                        style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                      />
                    )}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {taskTypes.find(tt => tt.id == selectedType)?.name}
                    </span>
                  </>
                ) : (
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>No type</span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.5, flexShrink: 0 }}>▼</span>
              </div>

              {isTypeDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  {taskTypes.map(tt => (
                    <div
                      key={tt.id}
                      className={styles.dropdownOption}
                      onClick={() => {
                        setSelectedType(tt.id);
                        setIsTypeDropdownOpen(false);
                      }}
                    >
                      {tt.icon ? (
                        <img src={`/cardicons/${tt.icon}`} alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ width: '14px' }}></div>
                      )}
                      {tt.name}
                    </div>
                  ))}
                  {taskTypes.length === 0 && <div className={styles.dropdownOption}>No type</div>}
                </div>
              )}
            </div>

            <button className={styles.addButton} onClick={handleAddTask}>
              Add
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => { setIsAddingTask(false); setColumnError(""); }}
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
              onClick={() => { setIsAddingCollection(false); setColumnError(""); }}
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
