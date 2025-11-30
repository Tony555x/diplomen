import React, { useState } from "react";
import { fetchWithAuth } from "../auth";
import "./CreateProjectPopup.css";

function CreateProjectPopup({ workspaceId, onClose, onProjectCreated }) {
    const [name, setName] = useState("");
    const [accessLevel, setAccessLevel] = useState("Workspace");
    const [memberEmail, setMemberEmail] = useState("");
    const [members, setMembers] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState("");

    const handleAddMember = async () => {
        setEmailError("");

        if (!memberEmail.trim()) {
            setEmailError("Please enter an email address.");
            return;
        }

        // Check if email already in list
        if (members.includes(memberEmail.trim())) {
            setEmailError("This email is already in the list.");
            return;
        }

        // Validate email exists
        try {
            const result = await fetchWithAuth("/api/projects/validate-email", {
                method: "POST",
                body: { email: memberEmail.trim() }
            });

            if (result.success) {
                setMembers([...members, memberEmail.trim()]);
                setMemberEmail("");
            } else {
                setEmailError(result.message || "Email not found.");
            }
        } catch (err) {
            console.error("Error validating email:", err);
            setEmailError("User with this email does not exist.");
        }
    };

    const handleRemoveMember = (email) => {
        setMembers(members.filter(m => m !== email));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!name.trim()) {
            setError("Project name is required.");
            return;
        }

        setLoading(true);

        try {
            const result = await fetchWithAuth("/api/projects", {
                method: "POST",
                body: {
                    name: name.trim(),
                    workspaceId: workspaceId,
                    accessLevel: accessLevel,
                    memberEmails: members
                }
            });

            if (result.success) {
                onProjectCreated();
                onClose();
            } else {
                setError(result.message || "Failed to create project.");
            }
        } catch (err) {
            console.error("Error creating project:", err);
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target.className === "popup-overlay") {
            onClose();
        }
    };

    return (
        <div className="popup-overlay" onClick={handleOverlayClick}>
            <div className="popup-container">
                <div className="popup-header">
                    <h2>Create New Project</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Project Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter project name"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Access Level</label>
                        <select
                            value={accessLevel}
                            onChange={(e) => setAccessLevel(e.target.value)}
                            disabled={loading}
                        >
                            <option value="Public">Public</option>
                            <option value="Workspace">Workspace</option>
                            <option value="Private">Private</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Add Members</label>
                        <div className="member-input-group">
                            <input
                                type="email"
                                value={memberEmail}
                                onChange={(e) => {
                                    setMemberEmail(e.target.value);
                                    setEmailError("");
                                }}
                                placeholder="Enter member email"
                                disabled={loading}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddMember();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="add-btn"
                                onClick={handleAddMember}
                                disabled={loading}
                            >
                                Add
                            </button>
                        </div>
                        {emailError && <div className="email-error">{emailError}</div>}
                    </div>

                    {members.length > 0 && (
                        <div className="members-list">
                            <label>Members ({members.length})</label>
                            <div className="members-container">
                                {members.map((email) => (
                                    <div key={email} className="member-item">
                                        <span>{email}</span>
                                        <button
                                            type="button"
                                            className="remove-btn"
                                            onClick={() => handleRemoveMember(email)}
                                            disabled={loading}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}

                    <div className="button-group">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? "Creating..." : "Create Project"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateProjectPopup;
