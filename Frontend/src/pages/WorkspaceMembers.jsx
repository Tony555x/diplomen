import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth, getCurrentUser } from "../auth";
import UserAvatar from "../components/UserAvatar";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./WorkspaceMembers.module.css";

function WorkspaceMembers({ workspaceName }) {
    const { workspaceId } = useParams();
    const navigate = useNavigate();
    usePageTitle(workspaceName ? `${workspaceName} — Members` : "Workspace Members");

    const [members, setMembers] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showAddForm, setShowAddForm] = useState(false);
    const [addEmail, setAddEmail] = useState("");
    const [addError, setAddError] = useState("");
    const [addLoading, setAddLoading] = useState(false);

    useEffect(() => {
        loadMembers();
        setCurrentUser(getCurrentUser());
    }, [workspaceId]);

    const loadMembers = async () => {
        try {
            setLoading(true);
            const result = await fetchWithAuth(`/api/workspaces/${workspaceId}/members`);
            if (result.success) {
                setMembers(result.members);
                setCurrentUserRole(result.currentUserRole);
            } else {
                setError("Failed to load members.");
            }
        } catch {
            setError("Failed to load members.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        setAddError("");
        if (!addEmail.trim()) { setAddError("Please enter an email."); return; }
        setAddLoading(true);
        try {
            const result = await fetchWithAuth(`/api/workspaces/${workspaceId}/members`, {
                method: "POST",
                body: { email: addEmail.trim() }
            });
            setAddEmail("");
            setShowAddForm(false);
            loadMembers();
        } catch (e) {
            setAddError(e.message || "Failed to add member.");
        } finally {
            setAddLoading(false);
        }
    };

    const handleRemoveMember = async (member) => {
        if (!window.confirm(`Remove ${member.userName} from the workspace?`)) return;
        try {
            await fetchWithAuth(`/api/workspaces/${workspaceId}/members/${member.userId}`, { method: "DELETE" });
            loadMembers();
        } catch {
            alert("Failed to remove member.");
        }
    };

    const handleLeave = async () => {
        if (!window.confirm("Are you sure you want to leave this workspace?")) return;
        try {
            const result = await fetchWithAuth(`/api/workspaces/${workspaceId}/leave`, { method: "POST" });
            if (result.success) { navigate("/home"); }
            else { alert(result.message || "Failed to leave workspace."); }
        } catch {
            alert("Failed to leave workspace.");
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Delete this workspace permanently? This cannot be undone.")) return;
        try {
            const result = await fetchWithAuth(`/api/workspaces/${workspaceId}`, { method: "DELETE" });
            if (result.success) { navigate("/home"); }
            else { alert(result.message || "Failed to delete workspace."); }
        } catch {
            alert("Failed to delete workspace.");
        }
    };

    const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

    const isOwner = currentUserRole === "Owner";

    if (loading) return <div className={styles.loading}>Loading members...</div>;
    if (error) return <div className={styles.error}>{error}</div>;

    return (
        <div className={styles.container}>
            {/* Members column */}
            <div className={styles.panel}>
                <div className={styles.sectionHeader}>
                    <h2>Members</h2>
                    {isOwner && (
                        <button className={styles.btnAddMember} onClick={() => setShowAddForm(v => !v)}>
                            + Add Member
                        </button>
                    )}
                </div>

                {showAddForm && (
                    <form className={styles.addForm} onSubmit={handleAddMember}>
                        <input
                            type="email"
                            placeholder="Enter email address"
                            value={addEmail}
                            onChange={e => { setAddEmail(e.target.value); setAddError(""); }}
                            disabled={addLoading}
                            autoFocus
                        />
                        {addError && <div className={styles.addError}>{addError}</div>}
                        <div className={styles.addActions}>
                            <button type="button" className={styles.btnCancel}
                                onClick={() => { setShowAddForm(false); setAddEmail(""); setAddError(""); }}>
                                Cancel
                            </button>
                            <button type="submit" className={styles.btnSubmit}
                                disabled={addLoading || !addEmail.trim()}>
                                {addLoading ? "Adding..." : "Add"}
                            </button>
                        </div>
                    </form>
                )}

                <div className={styles.membersList}>
                    {members.length === 0 ? (
                        <div className={styles.emptyState}>No members found</div>
                    ) : (
                        members.map(member => (
                            <div key={member.userId} className={styles.memberCard}>
                                <div className={styles.memberMain}>
                                    <UserAvatar
                                        user={{ userId: member.userId, userName: member.userName, avatarColor: member.avatarColor }}
                                        size="sm"
                                    />
                                    <div className={styles.memberName}>{member.userName}</div>
                                    <div className={styles.memberBadges}>
                                        <span className={`${styles.roleBadge} ${member.role === "Owner" ? styles.roleOwner : styles.roleMember}`}>
                                            {member.role}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.memberSecondary}>
                                    <span className={styles.memberEmail}>{member.email}</span>
                                    <span className={styles.joinedDate}>{formatDate(member.joinedAt)}</span>
                                    {isOwner && member.role !== "Owner" && (
                                        <button
                                            className={styles.btnRemove}
                                            onClick={() => handleRemoveMember(member)}
                                            title="Remove member"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Settings panel */}
            <div className={styles.panel}>
                <div className={styles.sectionHeader}>
                    <h2>Workspace</h2>
                </div>
                <div className={styles.infoPanel}>
                    <div className={styles.infoName}>{workspaceName}</div>
                    <div className={styles.infoCount}>{members.length} {members.length === 1 ? "member" : "members"}</div>
                </div>
                <div className={styles.actions}>
                    {!isOwner && (
                        <button className={styles.btnLeave} onClick={handleLeave}>
                            Leave Workspace
                        </button>
                    )}
                    {isOwner && (
                        <button className={styles.btnDelete} onClick={handleDelete}>
                            Delete Workspace
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default WorkspaceMembers;
