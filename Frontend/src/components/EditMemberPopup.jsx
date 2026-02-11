import React, { useState } from "react";
import { fetchWithAuth } from "../auth";
import styles from "./PopupStyles.module.css";

function EditMemberPopup({ projectId, member, roles, currentUserRole, onClose, onMemberUpdated }) {
    const [selectedRole, setSelectedRole] = useState(member.roleId?.toString() || "");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Set default role when roles are loaded
    React.useEffect(() => {
        if (roles && roles.length > 0 && member.roleId) {
            setSelectedRole(member.roleId.toString());
        }
    }, [roles, member.roleId]);

    const handleUpdateRole = async () => {
        if (!selectedRole) {
            setError("Please select a role.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const result = await fetchWithAuth(
                `/api/projects/${projectId}/members/${member.userId}`,
                {
                    method: "PATCH",
                    body: {
                        roleId: parseInt(selectedRole)
                    }
                }
            );

            if (result.success) {
                onMemberUpdated();
                onClose();
            } else {
                setError(result.message || "Failed to update member role.");
            }
        } catch (err) {
            console.error("Error updating member:", err);
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to remove ${member.userName} from this project?`)) {
            return;
        }

        setLoading(true);
        setError("");

        try {
            const result = await fetchWithAuth(
                `/api/projects/${projectId}/members/${member.userId}`,
                { method: "DELETE" }
            );

            if (result.success) {
                onMemberUpdated();
                onClose();
            } else {
                setError(result.message || "Failed to remove member.");
            }
        } catch (err) {
            console.error("Error deleting member:", err);
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const isOwner = member.role?.toLowerCase() === "owner";

    return (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div className={styles.popup}>
                <div className={styles.header}>
                    <h2>Edit Member</h2>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "#2d2d2d", borderRadius: "6px" }}>
                    <div style={{ marginBottom: "0.5rem" }}>
                        <span style={{ color: "rgba(255,255,255,0.6)", marginRight: "0.5rem" }}>Name:</span>
                        <span>{member.userName}</span>
                    </div>
                    <div>
                        <span style={{ color: "rgba(255,255,255,0.6)", marginRight: "0.5rem" }}>Email:</span>
                        <span>{member.email}</span>
                    </div>
                </div>

                {isOwner ? (
                    <div style={{ padding: "0.75rem", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "6px", color: "rgba(147,197,253,0.9)", fontSize: "0.9rem" }}>
                        This is the project owner. The owner's role cannot be changed or removed.
                    </div>
                ) : (
                    <>
                        <div className={styles.field}>
                            <label htmlFor="member-role">Role</label>
                            <select
                                id="member-role"
                                value={selectedRole}
                                onChange={(e) => {
                                    setSelectedRole(e.target.value);
                                    setError("");
                                }}
                                disabled={loading || !roles || roles.length === 0}
                            >
                                {!roles || roles.length === 0 ? (
                                    <option value="">Loading roles...</option>
                                ) : (
                                    roles
                                        .filter(role => !role.isOwner)
                                        .map((role) => (
                                            <option key={role.id} value={role.id}>
                                                {role.roleName}
                                            </option>
                                        ))
                                )}
                            </select>
                        </div>

                        {error && <div className={styles.error}>{error}</div>}

                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={styles.deleteButton}
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                Remove Member
                            </button>
                            <div className={styles.rightActions}>
                                <button
                                    type="button"
                                    className={styles.cancelButton}
                                    onClick={onClose}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={styles.createButton}
                                    onClick={handleUpdateRole}
                                    disabled={loading || !selectedRole}
                                >
                                    {loading ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default EditMemberPopup;
