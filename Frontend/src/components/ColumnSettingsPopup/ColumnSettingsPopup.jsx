import React, { useState } from "react";
import sharedStyles from "../PopupStyles.module.css";
import styles from "./ColumnSettingsPopup.module.css";

function ColumnSettingsPopup({ status, onClose, onUpdate, onDelete, onShift, isFirstColumn, isLastColumn, canManageStatuses, hasTasks }) {
    const [name, setName] = useState(status.name);
    const [color, setColor] = useState(status.color || "#3B82F6");
    const [autoComplete, setAutoComplete] = useState(status.autoComplete || false);

    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

    const PRESET_COLORS = [
        "#3B82F6", // Blue
        "#10B981", // Emerald
        "#F59E0B", // Amber
        "#EF4444", // Red
        "#8B5CF6", // Violet
        "#EC4899", // Pink
        "#14B8A6", // Teal
        "#06B6D4", // Cyan
        "#FFFFFF", // White
        "#6B7280"  // Gray
    ];

    const handleSave = async () => {
        if (!name.trim()) {
            setSaveError("Name cannot be empty");
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        try {
            await onUpdate(name.trim(), color, autoComplete);
            onClose();
        } catch (err) {
            setSaveError(err.message || "Failed to update column settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBackdropClick = e => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className={sharedStyles.backdrop} onClick={handleBackdropClick}>
            <div className={sharedStyles.popup} style={{ maxWidth: '400px' }}>
                <div className={sharedStyles.header}>
                    <h2>Column Settings</h2>
                    <button className={sharedStyles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div className={sharedStyles.body} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className={sharedStyles.field}>
                        <label>Column Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={!canManageStatuses}
                        />
                    </div>

                    <div className={sharedStyles.field}>
                        <label>Top Border Color</label>
                        <div className={styles.colorPickerContainer}>
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                disabled={!canManageStatuses}
                                className={styles.colorInput}
                            />
                            <span className={styles.colorHex}>{color}</span>
                        </div>
                        <div className={styles.presetColorsContainer}>
                            {PRESET_COLORS.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    className={`${styles.presetColorBtn} ${color === preset ? styles.activePreset : ''}`}
                                    style={{ backgroundColor: preset }}
                                    onClick={() => canManageStatuses && setColor(preset)}
                                    disabled={!canManageStatuses}
                                    title={preset}
                                />
                            ))}
                        </div>
                    </div>

                    <div className={sharedStyles.field} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={autoComplete}
                            onChange={(e) => setAutoComplete(e.target.checked)}
                            disabled={!canManageStatuses}
                            style={{ width: 'auto', marginBottom: 0, scale: '1.2' }}
                            id="autoCompleteCheck"
                        />
                        <label htmlFor="autoCompleteCheck" style={{ marginBottom: 0, cursor: 'pointer' }}>
                            Autocomplete Tasks
                        </label>
                    </div>
                </div>

                <div className={sharedStyles.footer} style={{ marginTop: '2rem' }}>
                    {saveError && (
                        <div className={sharedStyles.error}>{saveError}</div>
                    )}
                    
                    {canManageStatuses && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #374151', paddingBottom: '1.5rem' }}>
                            <button
                                type="button"
                                className={sharedStyles.cancelButton}
                                style={{ width: '48%', border: '1px dashed #4b5563' }}
                                disabled={isFirstColumn || isSaving}
                                onClick={() => {
                                    onShift("left");
                                    onClose();
                                }}
                            >
                                ← Shift Left
                            </button>
                            <button
                                type="button"
                                className={sharedStyles.cancelButton}
                                style={{ width: '48%', border: '1px dashed #4b5563' }}
                                disabled={isLastColumn || isSaving}
                                onClick={() => {
                                    onShift("right");
                                    onClose();
                                }}
                            >
                                Shift Right →
                            </button>
                        </div>
                    )}

                    <div className={sharedStyles.actions}>
                        {canManageStatuses ? (
                            <button
                                className={sharedStyles.deleteButton}
                                onClick={onDelete}
                                disabled={hasTasks}
                                title={hasTasks ? "Column must be empty to delete" : ""}
                            >
                                Delete Column
                            </button>
                        ) : (
                            <div />
                        )}

                        <div className={sharedStyles.rightActions}>
                            <button className={sharedStyles.cancelButton} onClick={onClose}>
                                Cancel
                            </button>
                            {canManageStatuses && (
                                <button
                                    className={sharedStyles.createButton}
                                    onClick={handleSave}
                                    disabled={isSaving || !name.trim()}
                                >
                                    {isSaving ? "Saving…" : "Save"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ColumnSettingsPopup;
