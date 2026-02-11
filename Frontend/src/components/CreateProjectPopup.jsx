import React, { useState } from "react";
import { fetchWithAuth } from "../auth";
import styles from "./PopupStyles.module.css";

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
        if (e.target.classList.contains(styles.backdrop)) {
            onClose();
        }
    };

    return (
        <div className={styles.backdrop} onClick={handleOverlayClick}>
            <div className={styles.popup}>
                <div className={styles.header}>
                    <h2>Create New Project</h2>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.field}>
                        <label>Project Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter project name"
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.field}>
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

                    <div className={styles.field}>
                        <label>Add Members</label>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
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
                                style={{ padding: "0.75rem 1rem", background: "#10b981", border: "none", borderRadius: "6px", color: "white", fontWeight: "500", cursor: "pointer" }}
                                onClick={handleAddMember}
                                disabled={loading}
                            >
                                Add
                            </button>
                        </div>
                        {emailError && <div className={styles.error} style={{ marginTop: "0.5rem" }}>{emailError}</div>}
                    </div>

                    {members.length > 0 && (
                        <div style={{ marginTop: "1rem" }}>
                            <label>Members ({members.length})</label>
                            <div style={{ maxHeight: "150px", overflowY: "auto", marginTop: "0.5rem" }}>
                                {members.map((email) => (
                                    <div key={email} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", background: "#2d2d2d", borderRadius: "4px", marginBottom: "0.5rem" }}>
                                        <span>{email}</span>
                                        <button
                                            type="button"
                                            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "1.2rem", padding: "0 4px" }}
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

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.actions}>
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
                                disabled={loading}
                            >
                                {loading ? "Creating..." : "Create Project"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateProjectPopup;
