import React, { useState } from "react";
import { fetchWithAuth } from "../auth";
import styles from "./AddMemberPopup.module.css";

function AddMemberPopup({ projectId, roles, onClose, onMemberAdded }) {
    const [email, setEmail] = useState("");
    const [selectedRole, setSelectedRole] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Set default role when roles are loaded
    React.useEffect(() => {
        if (roles && roles.length > 0 && !selectedRole) {
            // Default to the first non-owner role
            const nonOwnerRoles = roles.filter(r => !r.isOwner);
            if (nonOwnerRoles.length > 0) {
                setSelectedRole(nonOwnerRoles[0].id.toString());
            }
        }
    }, [roles, selectedRole]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!email.trim()) {
            setError("Please enter an email address.");
            return;
        }

        if (!selectedRole) {
            setError("Please select a role.");
            return;
        }

        setLoading(true);

        try {
            const result = await fetchWithAuth(`/api/projects/${projectId}/members`, {
                method: "POST",
                body: {
                    email: email.trim(),
                    roleId: parseInt(selectedRole)
                }
            });

            if (result.success) {
                onMemberAdded();
            } else {
                setError(result.message || "Failed to add member.");
            }
        } catch (err) {
            console.error("Error adding member:", err);
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

    return (
        <div className={styles.overlay} onClick={handleBackdropClick}>
            <div className={styles.popup}>
                <div className={styles.header}>
                    <h2>Add Member</h2>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.field}>
                        <label htmlFor="member-email">Email Address</label>
                        <input
                            id="member-email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setError("");
                            }}
                            placeholder="Enter member email"
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    <div className={styles.field} style={{ marginTop: "1rem" }}>
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

                    {error && <div className={styles.error} style={{ marginTop: "1rem" }}>{error}</div>}

                    <div className={styles.actions} style={{ marginTop: "1.5rem" }}>
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
                                type="submit"
                                className={styles.createButton}
                                disabled={loading || !email.trim()}
                            >
                                {loading ? "Adding..." : "Add Member"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddMemberPopup;
