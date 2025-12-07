import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import AddMemberPopup from "../components/AddMemberPopup";
import "./ProjectMembers.css";

function ProjectMembers() {
    const { projectId } = useParams();
    const [members, setMembers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddMemberPopup, setShowAddMemberPopup] = useState(false);

    useEffect(() => {
        loadMembers();
    }, [projectId]);

    const loadMembers = async () => {
        try {
            setLoading(true);
            const result = await fetchWithAuth(`/api/projects/${projectId}/members`);
            if (result.success) {
                setMembers(result.members);
                setRoles(result.roles || []);
                setCurrentUserRole(result.currentUserRole);
            } else {
                setError("Failed to load members.");
            }
        } catch (err) {
            console.error("Failed to load members", err);
            setError("Failed to load members.");
        } finally {
            setLoading(false);
        }
    };

    const handleMemberAdded = () => {
        loadMembers();
        setShowAddMemberPopup(false);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) return <div className="loading">Loading members...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <>
            <div className="project-members">
                <div className="members-section">
                    <div className="section-header">
                        <h2>Members</h2>
                        {currentUserRole?.canAddEditMembers && (
                            <button
                                className="btn-add-member"
                                onClick={() => setShowAddMemberPopup(true)}
                            >
                                + Add Member
                            </button>
                        )}
                    </div>
                    <div className="members-list">
                        {members.length === 0 ? (
                            <div className="empty-state">No members found</div>
                        ) : (
                            members.map((member) => (
                                <div key={member.userId} className="member-card">
                                    <div className="member-info">
                                        <div className="member-name">{member.userName}</div>
                                        <div className="member-email">{member.email}</div>
                                    </div>
                                    <div className="member-meta">
                                        <span className={`role-badge role-${member.role.toLowerCase()}`}>
                                            {member.role}
                                        </span>
                                        <span className="joined-date">
                                            Joined {formatDate(member.joinedAt)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="roles-section">
                    <div className="section-header">
                        <h2>Roles</h2>
                        {currentUserRole?.canAddEditMembers && (
                            <button
                                className="btn-new-role"
                                disabled
                                title="Coming soon"
                            >
                                + New Role
                            </button>
                        )}
                    </div>
                    <div className="roles-list">
                        {roles.length === 0 ? (
                            <div className="empty-state">No roles found</div>
                        ) : (
                            roles.map((role) => (
                                <div key={role.id} className="role-card">
                                    <div className="role-info">
                                        <div className="role-name">{role.roleName}</div>
                                        <div className="role-member-count">
                                            {role.memberCount} {role.memberCount === 1 ? 'member' : 'members'}
                                        </div>
                                    </div>
                                    {role.isOwner && (
                                        <span className="owner-badge">Owner Role</span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {showAddMemberPopup && (
                <AddMemberPopup
                    projectId={projectId}
                    roles={roles}
                    onClose={() => setShowAddMemberPopup(false)}
                    onMemberAdded={handleMemberAdded}
                />
            )}
        </>
    );
}

export default ProjectMembers;
