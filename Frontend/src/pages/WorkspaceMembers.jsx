import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth, getCurrentUser } from "../auth";
import UserAvatar from "../components/UserAvatar";
import { usePageTitle } from "../hooks/usePageTitle";
import "./ProjectMembers.css";
import "./WorkspaceMembers.css";

function WorkspaceMembers({ workspaceName }) {
    const { workspaceId } = useParams();
    const navigate = useNavigate();
    usePageTitle(workspaceName ? `${workspaceName} — Members` : "Workspace Members");

    const [members, setMembers] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Add member form state
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
            if (result.success) {
                setAddEmail("");
                setShowAddForm(false);
                loadMembers();
            } else {
                setAddError(result.message || "Failed to add member.");
            }
        } catch {
            setAddError("An error occurred.");
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

    if (loading) return <div className="loading">Loading members...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="workspace-members">
            {/* Members column */}
            <div className="members-section">
                <div className="section-header">
                    <h2>Members</h2>
                    {isOwner && (
                        <button className="btn-add-member" onClick={() => setShowAddForm(v => !v)}>
                            + Add Member
                        </button>
                    )}
                </div>

                {showAddForm && (
                    <form className="ws-add-form" onSubmit={handleAddMember}>
                        <input
                            type="email"
                            placeholder="Enter email address"
                            value={addEmail}
                            onChange={e => { setAddEmail(e.target.value); setAddError(""); }}
                            disabled={addLoading}
                            autoFocus
                        />
                        {addError && <div className="ws-add-error">{addError}</div>}
                        <div className="ws-add-actions">
                            <button type="button" className="ws-btn-cancel" onClick={() => { setShowAddForm(false); setAddEmail(""); setAddError(""); }}>
                                Cancel
                            </button>
                            <button type="submit" className="ws-btn-submit" disabled={addLoading || !addEmail.trim()}>
                                {addLoading ? "Adding..." : "Add"}
                            </button>
                        </div>
                    </form>
                )}

                <div className="members-list">
                    {members.length === 0 ? (
                        <div className="empty-state">No members found</div>
                    ) : (
                        members.map(member => (
                            <div key={member.userId} className="member-card">
                                <div className="member-main">
                                    <UserAvatar
                                        user={{ userId: member.userId, userName: member.userName, avatarColor: member.avatarColor }}
                                        size="sm"
                                    />
                                    <div className="member-name">{member.userName}</div>
                                    <div className="member-badges">
                                        <span className={`role-badge role-${member.role.toLowerCase()}`}>
                                            {member.role}
                                        </span>
                                    </div>
                                </div>
                                <div className="member-secondary">
                                    <span className="member-email">{member.email}</span>
                                    <span className="joined-date">{formatDate(member.joinedAt)}</span>
                                    {isOwner && member.role !== "Owner" && (
                                        <button
                                            className="ws-btn-remove"
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
            <div className="roles-section">
                <div className="section-header">
                    <h2>Workspace</h2>
                </div>
                <div className="ws-info-panel">
                    <div className="ws-info-name">{workspaceName}</div>
                    <div className="ws-info-count">{members.length} {members.length === 1 ? "member" : "members"}</div>
                </div>
                <div className="ws-actions">
                    {!isOwner && (
                        <button className="ws-btn-leave" onClick={handleLeave}>
                            Leave Workspace
                        </button>
                    )}
                    {isOwner && (
                        <button className="ws-btn-delete" onClick={handleDelete}>
                            Delete Workspace
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default WorkspaceMembers;
