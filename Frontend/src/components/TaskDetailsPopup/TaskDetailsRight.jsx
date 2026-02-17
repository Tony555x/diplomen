import { useEffect, useState } from "react";
import styles from "./TaskDetailsRight.module.css";
import AssigneeAvatar from "../AssigneeAvatar";
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
    assignees,
    members,
    loadAssignees,
    dueDate,
    onDueDateChange,
    onRefresh
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
        loadAssignees();
    };

    const handleRemove = async userId => {
        await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${task.id}/assignees/${userId}`,
            { method: "DELETE" }
        );
        loadAssignees();
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

    const assignedIds = assignees.map(a => a.userId);

    return (
        <div className={styles.rightColumn}>
            <ExpandableSection title="Assignees" count={assignees.length}>
                <div className={styles.assigneesList}>
                    {assignees.map(a => (
                        <AssigneeAvatar
                            key={a.userId}
                            assignee={a}
                            onRemove={handleRemove}
                        />
                    ))}

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
                </div>

                {assignees.length === 0 && (
                    <div className={styles.hint}>No one assigned</div>
                )}
            </ExpandableSection>

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
                            <button
                                className={styles.removeBtn}
                                onClick={() => handleRemoveBlocker(b.id)}
                            >
                                ×
                            </button>
                        </div>
                    ))}

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
                            <button
                                className={styles.removeBtn}
                                onClick={() => handleRemoveBlocked(b.id)}
                            >
                                ×
                            </button>
                        </div>
                    ))}

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
                </div>
            </ExpandableSection>

            <ExpandableSection title="Due Date">
                <input
                    type="date"
                    className={styles.dueDateInput}
                    value={dueDate ? dueDate.slice(0, 10) : ""}
                    onChange={e => onDueDateChange(e.target.value || null)}
                />
            </ExpandableSection>
        </div>
    );
}

export default TaskDetailsRight;
