import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./TaskDetailsRight.module.css";
import columnStyles from "../Column.module.css";
import UserAvatar from "../UserAvatar";
import { fetchWithAuth } from "../../auth";

const ExpandableSection = ({ title, count, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={styles.expandableSection}>
            <div
                className={styles.expandableHeader}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className={styles.headerContent}>
                    <h3>{title}</h3>
                    {count !== undefined && count > 0 && (
                        <span className={styles.countBadge}>{count}</span>
                    )}
                </div>
                <svg
                    className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ""
                        }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </div>
            {isOpen && (
                <div className={styles.expandableContent}>{children}</div>
            )}
        </div>
    );
};

function TaskDetailsRight({
    projectId,
    task,
    taskTypes = [],
    assignees,
    members,
    loadAssignees,
    dueDate,
    onDueDateChange,
    onRefresh,
    canCreateTasks,
    onViewActivity,
    onSubtaskCreated
}) {
    const [blockers, setBlockers] = useState([]);
    const [blockedTasks, setBlockedTasks] = useState([]);
    const [allProjectTasks, setAllProjectTasks] = useState([]);

    const [assigneeSearch, setAssigneeSearch] = useState("");
    const [blockerSearch, setBlockerSearch] = useState("");
    const [blockedSearch, setBlockedSearch] = useState("");

    const [showAssigneeResults, setShowAssigneeResults] = useState(false);
    const [showBlockerResults, setShowBlockerResults] = useState(false);
    const [showBlockedResults, setShowBlockedResults] = useState(false);

    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
    const [newSubtaskType, setNewSubtaskType] = useState("");
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const typeDropdownRef = useRef(null);

    const navigate = useNavigate();

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
        if (taskTypes.length > 0 && !newSubtaskType) {
            setNewSubtaskType(taskTypes[0].id);
        }
    }, [taskTypes, newSubtaskType]);

    useEffect(() => {
        loadBlockers();
        loadBlockedTasks();
        loadAllProjectTasks();
    }, []);

    const loadBlockers = async () => {
        const result = await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/blockers`
        );
        setBlockers(result || []);
    };

    const loadBlockedTasks = async () => {
        const result = await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/blocking`
        );
        setBlockedTasks(result || []);
    };

    const loadAllProjectTasks = async () => {
        const result = await fetchWithAuth(
            `/api/projects/${projectId}/tasks`
        );
        setAllProjectTasks(result || []);
    };

    const handleAssign = async userId => {
        await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/assignees`,
            { method: "POST", body: JSON.stringify({ userId }) }
        );
        await loadAssignees();
        onRefresh?.();
    };

    const handleRemove = async userId => {
        await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/assignees/${userId}`,
            { method: "DELETE" }
        );
        await loadAssignees();
        onRefresh?.();
    };

    const handleAddBlocker = async blockerTaskId => {
        await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/blockers`,
            {
                method: "POST",
                body: JSON.stringify({ blockerTaskId })
            }
        );
        loadBlockers();
        onRefresh?.();
    };

    const handleRemoveBlocker = async blockerTaskId => {
        await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/blockers/${blockerTaskId}`,
            { method: "DELETE" }
        );
        loadBlockers();
        onRefresh?.();
    };

    const handleAddBlocked = async blockedTaskId => {
        await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${blockedTaskId}/blockers`,
            {
                method: "POST",
                body: JSON.stringify({ blockerTaskId: task.id })
            }
        );
        loadBlockedTasks();
        onRefresh?.();
    };

    const handleRemoveBlocked = async blockedTaskId => {
        await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${blockedTaskId}/blockers/${task.id}`,
            { method: "DELETE" }
        );
        loadBlockedTasks();
        onRefresh?.();
    };

    const handleCreateSubtask = async () => {
        if (!newSubtaskTitle.trim()) return;

        const result = await fetchWithAuth(
            `/api/projects/${projectId}/tasks`,
            {
                method: "POST",
                body: JSON.stringify({
                    title: newSubtaskTitle,
                    taskTypeId: newSubtaskType || (taskTypes.length > 0 ? taskTypes[0].id : null),
                    parentTaskId: task.id,
                    status: "To Do"
                })
            }
        );

        if (result && result.success) {
            setNewSubtaskTitle("");
            if (onSubtaskCreated) {
                onSubtaskCreated(result.task);
            } else {
                navigate(`/project/${projectId}/tasks/${result.task.id}`);
                onRefresh?.();
            }
        }
    };

    const assignedIds = assignees.map(a => a.userId);
    const subtasks = allProjectTasks.filter(t => t.parentTaskId === task.id);

    return (
        <div className={styles.rightColumn}>
            <ExpandableSection title="Assignees" count={assignees.length}>
                <div className={styles.assigneesList}>
                    {assignees.map(a => (
                        <UserAvatar
                            key={a.userId}
                            user={a}
                            onRemove={canCreateTasks ? handleRemove : null}
                            onViewActivity={onViewActivity}
                        />
                    ))}

                    {canCreateTasks && (
                        <div className={styles.searchContainer}>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="+ Add assignee..."
                                value={assigneeSearch}
                                onChange={e => {
                                    setAssigneeSearch(e.target.value);
                                    setShowAssigneeResults(true);
                                }}
                                onFocus={() => setShowAssigneeResults(true)}
                                onBlur={() =>
                                    setTimeout(() => {
                                        setShowAssigneeResults(false);
                                        setAssigneeSearch("");
                                    }, 200)
                                }
                            />
                            {showAssigneeResults && (
                                <div className={styles.searchResults}>
                                    {members
                                        .filter(
                                            m =>
                                                !assignedIds.includes(m.userId) &&
                                                m.status === "Active" &&
                                                m.userName
                                                    .toLowerCase()
                                                    .includes(
                                                        assigneeSearch.toLowerCase()
                                                    )
                                        )
                                        .map(m => (
                                            <div
                                                key={m.userId}
                                                className={styles.searchResultItem}
                                                onClick={() => {
                                                    handleAssign(m.userId);
                                                    setAssigneeSearch("");
                                                    setShowAssigneeResults(false);
                                                }}
                                            >
                                                <span
                                                    className={styles.memberAvatarMini}
                                                    style={{ background: m.avatarColor || "#3b82f6" }}
                                                >
                                                    {m.userName?.charAt(0).toUpperCase()}
                                                </span>
                                                {m.userName}
                                            </div>
                                        ))}
                                    {members.filter(
                                        m =>
                                            !assignedIds.includes(m.userId) &&
                                            m.status === "Active" &&
                                            m.userName
                                                .toLowerCase()
                                                .includes(
                                                    assigneeSearch.toLowerCase()
                                                )
                                    ).length === 0 && (
                                            <div
                                                className={styles.searchResultItem}
                                                style={{
                                                    fontStyle: "italic",
                                                    opacity: 0.6
                                                }}
                                            >
                                                No members found
                                            </div>
                                        )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {assignees.length === 0 && (
                    <div className={styles.hint}>No one assigned</div>
                )}
            </ExpandableSection>

            {!task.parentTaskId && (
                <ExpandableSection title="Subtasks" count={subtasks.length}>
                    <div className={styles.assigneesList}>
                        {subtasks.map(st => {
                            const stType = taskTypes.find(tt => tt.id === st.taskTypeId);
                            return (
                            <div
                                key={st.id}
                                className={styles.assigneeRow}
                                style={{ width: "100%", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                                onClick={() => navigate(`/project/${projectId}/tasks/${st.id}`)}
                            >
                                {stType?.icon && (
                                    <img src={`/cardicons/${stType.icon}`} alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                                )}
                                <span
                                    style={{
                                        textDecoration: st.completed
                                            ? "line-through"
                                            : "none",
                                        opacity: st.completed ? 0.7 : 1,
                                        flex: 1,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap"
                                    }}
                                >
                                    {st.title}
                                </span>
                            </div>
                        )})}

                        {canCreateTasks && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Subtask title..."
                                    value={newSubtaskTitle}
                                    onChange={e => setNewSubtaskTitle(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter") handleCreateSubtask();
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                    <div className={columnStyles.customSelect} ref={typeDropdownRef} style={{ flex: 1 }}>
                                        <div
                                            className={columnStyles.addSelect}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.4rem 0.5rem', height: '100%', boxSizing: 'border-box' }}
                                            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                                        >
                                            {newSubtaskType ? (
                                                <>
                                                    {taskTypes.find(tt => tt.id == newSubtaskType)?.icon && (
                                                        <img
                                                            src={`/cardicons/${taskTypes.find(tt => tt.id == newSubtaskType).icon}`}
                                                            alt=""
                                                            style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                                                        />
                                                    )}
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {taskTypes.find(tt => tt.id == newSubtaskType)?.name}
                                                    </span>
                                                </>
                                            ) : (
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>No type</span>
                                            )}
                                            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.5, flexShrink: 0 }}>▼</span>
                                        </div>

                                        {isTypeDropdownOpen && (
                                            <div className={columnStyles.dropdownMenu}>
                                                {taskTypes.map(tt => (
                                                    <div
                                                        key={tt.id}
                                                        className={columnStyles.dropdownOption}
                                                        onClick={() => {
                                                            setNewSubtaskType(tt.id);
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
                                                {taskTypes.length === 0 && <div className={columnStyles.dropdownOption}>No type</div>}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        style={{ whiteSpace: 'nowrap', padding: '0 8px', borderRadius: '4px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer' }}
                                        onClick={handleCreateSubtask}
                                        disabled={!newSubtaskTitle.trim()}
                                    >
                                        Create
                                    </button>
                                </div>
                            </div>
                        )}
                        {subtasks.length === 0 && !canCreateTasks && (
                            <div className={styles.hint}>No subtasks</div>
                        )}
                    </div>
                </ExpandableSection>
            )}

            <ExpandableSection title="Blocked By" count={blockers.length}>
                <div className={styles.assigneesList}>
                    {blockers.map(b => (
                        <div
                            key={b.id}
                            className={styles.assigneeRow}
                            style={{ width: "100%" }}
                        >
                            <span
                                style={{
                                    textDecoration: b.completed
                                        ? "line-through"
                                        : "none",
                                    opacity: b.completed ? 0.7 : 1,
                                    flex: 1,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                {b.title}
                            </span>
                            {canCreateTasks && (
                                <button
                                    className={styles.removeBtn}
                                    onClick={() => handleRemoveBlocker(b.id)}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}

                    {canCreateTasks && (
                        <div className={styles.searchContainer}>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="+ Add blocker..."
                                value={blockerSearch}
                                onChange={e => {
                                    setBlockerSearch(e.target.value);
                                    setShowBlockerResults(true);
                                }}
                                onFocus={() => setShowBlockerResults(true)}
                                onBlur={() =>
                                    setTimeout(() => {
                                        setShowBlockerResults(false);
                                        setBlockerSearch("");
                                    }, 200)
                                }
                            />
                            {showBlockerResults && (
                                <div className={styles.searchResults}>
                                    {allProjectTasks
                                        .filter(
                                            t =>
                                                t.id !== task.id &&
                                                !blockers.some(
                                                    b => b.id === t.id
                                                ) &&
                                                t.title
                                                    .toLowerCase()
                                                    .includes(
                                                        blockerSearch.toLowerCase()
                                                    )
                                        )
                                        .map(t => (
                                            <div
                                                key={t.id}
                                                className={styles.searchResultItem}
                                                onClick={() => {
                                                    handleAddBlocker(t.id);
                                                    setBlockerSearch("");
                                                    setShowBlockerResults(false);
                                                }}
                                            >
                                                {t.title}
                                            </div>
                                        ))}
                                    {allProjectTasks.filter(
                                        t =>
                                            t.id !== task.id &&
                                            !blockers.some(b => b.id === t.id) &&
                                            t.title
                                                .toLowerCase()
                                                .includes(
                                                    blockerSearch.toLowerCase()
                                                )
                                    ).length === 0 && (
                                            <div
                                                className={styles.searchResultItem}
                                                style={{
                                                    fontStyle: "italic",
                                                    opacity: 0.6
                                                }}
                                            >
                                                No tasks found
                                            </div>
                                        )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ExpandableSection>

            <ExpandableSection title="Blocks" count={blockedTasks.length}>
                <div className={styles.assigneesList}>
                    {blockedTasks.map(b => (
                        <div
                            key={b.id}
                            className={styles.assigneeRow}
                            style={{ width: "100%" }}
                        >
                            <span
                                style={{
                                    textDecoration: b.completed
                                        ? "line-through"
                                        : "none",
                                    opacity: b.completed ? 0.7 : 1,
                                    flex: 1,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                {b.title}
                            </span>
                            {canCreateTasks && (
                                <button
                                    className={styles.removeBtn}
                                    onClick={() => handleRemoveBlocked(b.id)}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}

                    {canCreateTasks && (
                        <div className={styles.searchContainer}>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="+ Add blocked task..."
                                value={blockedSearch}
                                onChange={e => {
                                    setBlockedSearch(e.target.value);
                                    setShowBlockedResults(true);
                                }}
                                onFocus={() => setShowBlockedResults(true)}
                                onBlur={() =>
                                    setTimeout(() => {
                                        setShowBlockedResults(false);
                                        setBlockedSearch("");
                                    }, 200)
                                }
                            />
                            {showBlockedResults && (
                                <div className={styles.searchResults}>
                                    {allProjectTasks
                                        .filter(
                                            t =>
                                                t.id !== task.id &&
                                                !blockedTasks.some(
                                                    b => b.id === t.id
                                                ) &&
                                                t.title
                                                    .toLowerCase()
                                                    .includes(
                                                        blockedSearch.toLowerCase()
                                                    )
                                        )
                                        .map(t => (
                                            <div
                                                key={t.id}
                                                className={styles.searchResultItem}
                                                onClick={() => {
                                                    handleAddBlocked(t.id);
                                                    setBlockedSearch("");
                                                    setShowBlockedResults(false);
                                                }}
                                            >
                                                {t.title}
                                            </div>
                                        ))}
                                    {allProjectTasks.filter(
                                        t =>
                                            t.id !== task.id &&
                                            !blockedTasks.some(b => b.id === t.id) &&
                                            t.title
                                                .toLowerCase()
                                                .includes(
                                                    blockedSearch.toLowerCase()
                                                )
                                    ).length === 0 && (
                                            <div
                                                className={styles.searchResultItem}
                                                style={{
                                                    fontStyle: "italic",
                                                    opacity: 0.6
                                                }}
                                            >
                                                No tasks found
                                            </div>
                                        )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ExpandableSection>

            <ExpandableSection title="Due Date">
                <input
                    type="date"
                    className={styles.dueDateInput}
                    value={dueDate ? dueDate.slice(0, 10) : ""}
                    onChange={e => onDueDateChange(e.target.value || null)}
                    readOnly={!canCreateTasks}
                    style={!canCreateTasks ? { pointerEvents: "none" } : {}}
                />
            </ExpandableSection>
        </div>
    );
}

export default TaskDetailsRight;
