import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import AddMemberPopup from "../components/AddMemberPopup";
import CreateRolePopup from "../components/CreateRolePopup";
import EditMemberPopup from "../components/EditMemberPopup";
import UserAvatar from "../components/UserAvatar";
import "./ProjectMembers.css";

function ProjectMembers() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddMemberPopup, setShowAddMemberPopup] = useState(false);
    const [showCreateRole, setShowCreateRole] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [showEditMember, setShowEditMember] = useState(false);
    const [editingMember, setEditingMember] = useState(null);


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

    const handleMemberClick = (member) => {
        if (!currentUserRole?.canAddEditMembers) return;
        if (member.role?.toLowerCase() === "owner") {
            // Allow opening popup for owner to show it's not editable
        }

        // Find the role ID for this member
        const memberRole = roles.find(r => r.roleName === member.role);
        setEditingMember({
            ...member,
            roleId: memberRole?.id
        });
        setShowEditMember(true);
    };

    const handleMemberUpdated = () => {
        loadMembers();
        setShowEditMember(false);
        setEditingMember(null);
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
                                <div
                                    key={member.userId}
                                    className={`member-card ${currentUserRole?.canAddEditMembers ? 'clickable' : ''}`}
                                    onClick={() => handleMemberClick(member)}
                                >
                                    <div className="member-main">
                                        <div onClick={e => e.stopPropagation()}>
                                            <UserAvatar
                                                user={{ userId: member.userId, userName: member.userName, avatarColor: member.avatarColor }}
                                                size="sm"
                                                onViewActivity={(uid) => navigate(`/project/${projectId}/members/${uid}/activity`)}
                                            />
                                        </div>
                                        <div className="member-name">{member.userName}</div>
                                        <div className="member-badges">
                                            <span className={`role-badge role-${member.role.toLowerCase() === "owner" ? "owner" : "member"}`}>
                                                {member.role}
                                            </span>
                                            {member.status === "Pending" && (
                                                <span className="status-badge status-pending">
                                                    Pending
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="member-secondary">
                                        <span className="member-email">{member.email}</span>
                                        <span className="joined-date">
                                            {formatDate(member.joinedAt)}
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
                                onClick={() => {
                                    setEditingRole(null);
                                    setShowCreateRole(true);
                                }}

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
                                <div
                                    key={role.id}
                                    className="role-card"
                                    onClick={() => {
                                        if (!currentUserRole?.canAddEditMembers || role.isOwner) return;
                                        setEditingRole(role);
                                        setShowCreateRole(true);
                                    }}
                                >
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
            {showCreateRole && (
                <CreateRolePopup
                    projectId={projectId}
                    role={editingRole}
                    onClose={() => {
                        setShowCreateRole(false);
                        setEditingRole(null);
                    }}
                    onRoleSaved={loadMembers}
                />
            )}
            {showEditMember && editingMember && (
                <EditMemberPopup
                    projectId={projectId}
                    member={editingMember}
                    roles={roles}
                    currentUserRole={currentUserRole}
                    onClose={() => {
                        setShowEditMember(false);
                        setEditingMember(null);
                    }}
                    onMemberUpdated={handleMemberUpdated}
                />
            )}


        </>
    );
}

export default ProjectMembers;
