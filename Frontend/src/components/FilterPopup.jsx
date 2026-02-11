import React, { useState, useEffect, useRef } from "react";
import styles from "./FilterPopup.module.css";
import StyledCheckbox from "./StyledCheckbox";

const FilterPopup = ({
    filterState,
    onChange,
    members,
    taskTypes,
    onClose,
    ignoreRef
}) => {
    const [userSearch, setUserSearch] = useState("");
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const wrapperRef = useRef(null);

    // Handle clicking outside to close
    useEffect(() => {
        function handleClickOutside(event) {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target) &&
                (!ignoreRef || !ignoreRef.current || !ignoreRef.current.contains(event.target))
            ) {
                onClose();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose, ignoreRef]);

    const handleCheckboxChange = (field) => {
        onChange({
            ...filterState,
            [field]: !filterState[field]
        });
    };

    const handleTypeToggle = (typeId) => {
        const currentTypes = filterState.typeIds || [];
        const newTypes = currentTypes.includes(typeId)
            ? currentTypes.filter(id => id !== typeId)
            : [...currentTypes, typeId];

        onChange({
            ...filterState,
            typeIds: newTypes
        });
    };

    const handleUserSelect = (userId, userName) => {
        onChange({
            ...filterState,
            assignedToUserId: userId,
            assignedToUserName: userName, // store name for display
            assignedToMe: false // uncheck "Assigned to Me" if picking specific user
        });
        setUserSearch("");
        setShowUserDropdown(false);
    };

    const handleClearUser = () => {
        onChange({
            ...filterState,
            assignedToUserId: null,
            assignedToUserName: null
        });
    };

    const handleAssignedToMeChange = () => {
        const newValue = !filterState.assignedToMe;
        onChange({
            ...filterState,
            assignedToMe: newValue,
            assignedToUserId: newValue ? null : filterState.assignedToUserId, // Clear specific user if "Me" is checked
            assignedToUserName: newValue ? null : filterState.assignedToUserName
        });
    };

    const clearAll = () => {
        onChange({
            assignedToMe: false,
            assignedToUserId: null,
            assignedToUserName: null,
            completed: false,
            uncompleted: false,
            noDate: false,
            overdue: false,
            typeIds: []
        });
    };

    const filteredMembers = members.filter(m =>
        m.userName.toLowerCase().includes(userSearch.toLowerCase())
    );

    return (
        <div className={styles.popupContainer} ref={wrapperRef}>
            <div className={styles.popupHeader}>
                <h3>Filters</h3>
                <button className={styles.clearButton} onClick={clearAll}>
                    Clear all
                </button>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>Assignments</div>
                <StyledCheckbox
                    checked={!!filterState.assignedToMe}
                    onChange={handleAssignedToMeChange}
                    disabled={!!filterState.assignedToUserId}
                    label="Tasks assigned to me"
                />

                <div className={styles.userSearchContainer}>
                    {!filterState.assignedToUserId ? (
                        <>
                            <input
                                type="text"
                                className={styles.userInput}
                                placeholder="Tasks assigned to..."
                                value={userSearch}
                                onChange={(e) => {
                                    setUserSearch(e.target.value);
                                    setShowUserDropdown(true);
                                }}
                                onFocus={() => setShowUserDropdown(true)}
                            />
                            {showUserDropdown && (
                                <div className={styles.userDropdown}>
                                    {filteredMembers.map(m => (
                                        <div
                                            key={m.userId}
                                            className={styles.userOption}
                                            onClick={() => handleUserSelect(m.userId, m.userName)}
                                        >
                                            {m.userName}
                                        </div>
                                    ))}
                                    {filteredMembers.length === 0 && (
                                        <div className={styles.userOption} style={{ opacity: 0.6 }}>
                                            No members found
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={styles.selectedUser}>
                            <span>Assigned to: <strong>{filterState.assignedToUserName}</strong></span>
                            <button className={styles.removeUserBtn} onClick={handleClearUser}>×</button>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>Status</div>
                <StyledCheckbox
                    checked={!!filterState.completed}
                    onChange={() => handleCheckboxChange("completed")}
                    label="Completed tasks"
                />
                <StyledCheckbox
                    checked={!!filterState.uncompleted}
                    onChange={() => handleCheckboxChange("uncompleted")}
                    label="Uncompleted tasks"
                />
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>Date</div>
                <StyledCheckbox
                    checked={!!filterState.noDate}
                    onChange={() => handleCheckboxChange("noDate")}
                    label="With no date"
                />
                <StyledCheckbox
                    checked={!!filterState.overdue}
                    onChange={() => handleCheckboxChange("overdue")}
                    label="Overdue"
                />
            </div>

            {taskTypes.length > 0 && (
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>Task Types</div>
                    {taskTypes.map(type => (
                        <StyledCheckbox
                            key={type.id}
                            checked={(filterState.typeIds || []).includes(type.id)}
                            onChange={() => handleTypeToggle(type.id)}
                            label={type.name}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default FilterPopup;
