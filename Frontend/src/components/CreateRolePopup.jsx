import React, { useState } from "react";
import { fetchWithAuth } from "../auth";
import styles from "./PopupStyles.module.css";

function CreateRolePopup({ projectId, role = null, onClose, onRoleSaved }) {
    const [name, setName] = useState(role?.roleName ?? "");
    const [canMembers, setCanMembers] = useState(role?.canAddEditMembers ?? false);
    const [canSettings, setCanSettings] = useState(role?.canEditProjectSettings ?? false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleSave = async () => {
        if (!name.trim()) {
            setError("Role name is required.");
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const result = await fetchWithAuth(
                `/api/projects/${projectId}/roles`,
                {
                    method: "POST",
                    body: {
                        roleId: role?.id ?? null,
                        roleName: name,
                        canAddEditMembers: canMembers,
                        canEditProjectSettings: canSettings
                    }
                }
            );


            if (result.success) {
                onRoleSaved();
                onClose();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };
    const handleDelete = async () => {
        if (!role) return;

        if (!window.confirm("Are you sure you want to delete this role?")) {
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const result = await fetchWithAuth(
                `/api/projects/${projectId}/roles/${role.id}`,
                { method: "DELETE" }
            );

            if (result.success) {
                onRoleSaved();
                onClose();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };


    return (
        <div className={styles.backdrop}>
            <div className={styles.popup}>
                <h2>{role ? "Edit role" : "Create role"}</h2>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.field}>
                    <label>Role name</label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>

                <div className={styles.checkbox}>
                    <label>
                        <input
                            type="checkbox"
                            checked={canMembers}
                            onChange={e => setCanMembers(e.target.checked)}
                        />
                        Can add / edit members
                    </label>
                </div>

                <div className={styles.checkbox}>
                    <label>
                        <input
                            type="checkbox"
                            checked={canSettings}
                            onChange={e => setCanSettings(e.target.checked)}
                        />
                        Can edit project settings
                    </label>
                </div>

                <div className={styles.actions}>
                    {role && !role.isOwner && (
                        <button
                            className={styles.deleteButton}
                            onClick={handleDelete}
                            disabled={saving}
                        >
                            Delete
                        </button>
                    )}

                    <div className={styles.rightActions}>
                        <button
                            className={styles.cancelButton}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            className={styles.createButton}
                            onClick={handleSave}
                            disabled={saving}
                        >
                            Save
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default CreateRolePopup;
