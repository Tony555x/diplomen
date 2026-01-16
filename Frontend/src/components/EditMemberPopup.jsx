import React, { useState } from "react";
import { fetchWithAuth } from "../auth";
import "./EditMemberPopup.css";

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
        <div className="popup-overlay" onClick={handleBackdropClick}>
            <div className="popup-container">
                <div className="popup-header">
                    <h2>Edit Member</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="member-details">
                    <div className="member-detail-row">
                        <span className="detail-label">Name:</span>
                        <span className="detail-value">{member.userName}</span>
                    </div>
                    <div className="member-detail-row">
                        <span className="detail-label">Email:</span>
                        <span className="detail-value">{member.email}</span>
                    </div>
                </div>

                {isOwner ? (
                    <div className="owner-notice">
                        This is the project owner. The owner's role cannot be changed or removed.
                    </div>
                ) : (
                    <>
                        <div className="form-group">
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

                        {error && <div className="error-message">{error}</div>}

                        <div className="button-group">
                            <button
                                type="button"
                                className="btn-danger"
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                Remove Member
                            </button>
                            <div className="right-buttons">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={onClose}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleUpdateRole}
                                    disabled={loading || !selectedRole}
                                >
                                    {loading ? "Saving..." : "Save Changes"}
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
