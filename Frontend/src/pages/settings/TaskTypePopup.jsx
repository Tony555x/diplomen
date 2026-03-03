import React, { useState } from "react";
import { fetchWithAuth } from "../../auth";
import sharedStyles from "../../components/PopupStyles.module.css";
import styles from "./TaskTypePopup.module.css";

const FIELD_TYPES = ["Text", "Number", "Date", "Checkbox", "Dropdown"];

const ICONS = [
    "task.png", "bug.png", "bolt.png", "clone.png",
    "gear.png", "search.png", "story.png", "text.png",
    "up.png", "warn.png"
];

function TaskTypePopup({ projectId, taskType, onClose, onSaved }) {
    const isEdit = !!taskType.id;

    const [name, setName] = useState(taskType.name || "");
    const [description, setDescription] = useState(taskType.description || "");
    const [icon, setIcon] = useState(taskType.icon || "task.png");
    const [fields, setFields] = useState(() =>
        (taskType.fields || []).map(f => ({
            ...f,
            // normalise: backend stores Select, show as Dropdown; parse options JSON to array
            type: f.type === "Select" ? "Dropdown" : (f.type ?? "Text"),
            _options: (() => {
                try { return JSON.parse(f.options || "[]"); } catch { return []; }
            })()
        }))
    );
    const [error, setError] = useState("");

    const addField = () => {
        setFields([
            ...fields,
            {
                name: "",
                type: "Text",
                isRequired: false,
                defaultValue: "",
                // options is a JS array for Dropdown fields; serialized to JSON on save
                _options: []
            }
        ]);
    };

    const updateField = (index, patch) => {
        const copy = [...fields];
        copy[index] = { ...copy[index], ...patch };
        setFields(copy);
    };

    const removeField = (index) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            return;
        }

        setError("");

        try {
            await fetchWithAuth(
                `/api/projects/${projectId}/task-types/${taskType.id}`,
                { method: "DELETE" }
            );

            onSaved();
            onClose();
        } catch (err) {
            console.error("Error deleting task type:", err);
            setError(err.message || "An error occurred while deleting the task type.");
        }
    };

    const save = async () => {
        setError("");

        try {
            // Normalise fields: map Dropdown→Select and serialize options array
            const normalisedFields = fields.map(f => {
                const isDropdown = f.type === "Dropdown";
                return {
                    ...f,
                    type: isDropdown ? "Select" : f.type,
                    options: isDropdown
                        ? JSON.stringify((f._options || []).filter(o => o.trim()))
                        : f.options ?? null
                };
            });

            await fetchWithAuth(
                `/api/projects/${projectId}/task-types`,
                {
                    method: isEdit ? "PUT" : "POST",
                    body: {
                        id: taskType.id,
                        name,
                        description,
                        icon,
                        fields: normalisedFields
                    }
                }
            );

            onSaved();
            onClose();
        } catch (err) {
            console.error("Error saving task type:", err);
            setError(err.message || "An error occurred while saving the task type.");
        }
    };

    return (
        <div className={sharedStyles.backdrop}>
            <div className={sharedStyles.popup}>
                <h3>{isEdit ? "Edit task type" : "New task type"}</h3>

                <input
                    placeholder="Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
                {/* <input
                    placeholder="Description of task type"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                /> */}

                <hr style={{ borderColor: "#888" }} />
                <h3>Icon</h3>
                <div className={styles.iconPicker}>
                    {ICONS.map(filename => (
                        <button
                            key={filename}
                            type="button"
                            title={filename.replace(".png", "")}
                            className={`${styles.iconOption} ${icon === filename ? styles.iconSelected : ""}`}
                            onClick={() => setIcon(filename)}
                        >
                            <img src={`/cardicons/${filename}`} alt={filename} />
                        </button>
                    ))}
                </div>

                <hr style={{ borderColor: "#888" }} />
                <h3>Fields</h3>

                <div className={styles.fields}>
                    {fields.length == 0 && (<div>This task type has no fields. Click 'Add Field' to create a new one.</div>)}
                    {fields.map((f, i) => (
                        <div key={i}>
                            <div className={styles.fieldRow}>
                                <input
                                    placeholder="Field name"
                                    value={f.name}
                                    onChange={e =>
                                        updateField(i, { name: e.target.value })
                                    }
                                />

                                <select
                                    value={f.type}
                                    onChange={e =>
                                        updateField(i, { type: e.target.value, _options: f._options ?? [] })
                                    }
                                >
                                    {FIELD_TYPES.map(t => (
                                        <option key={t}>{t}</option>
                                    ))}
                                </select>

                                <button onClick={() => removeField(i)}>×</button>
                            </div>

                            {/* Option editor — shown only for Dropdown */}
                            {f.type === "Dropdown" && (
                                <div className={styles.optionEditor}>
                                    {(f._options || []).map((opt, oi) => (
                                        <div key={oi} className={styles.optionRow}>
                                            <input
                                                placeholder={`Option ${oi + 1}`}
                                                value={opt}
                                                onChange={e => {
                                                    const next = [...(f._options || [])];
                                                    next[oi] = e.target.value;
                                                    updateField(i, { _options: next });
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = (f._options || []).filter((_, idx) => idx !== oi);
                                                    updateField(i, { _options: next });
                                                }}
                                            >×</button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className={styles.addOptionBtn}
                                        onClick={() => updateField(i, { _options: [...(f._options || []), ""] })}
                                    >
                                        + Add option
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <button onClick={addField}>Add field</button>

                {error && <div className={sharedStyles.error}>{error}</div>}

                <div className={sharedStyles.actions}>
                    {isEdit && (
                        <button
                            className={sharedStyles.deleteButton}
                            onClick={handleDelete}
                        >
                            Delete
                        </button>
                    )}

                    <div className={sharedStyles.rightActions}>
                        <button
                            className={sharedStyles.cancelButton}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            className={sharedStyles.createButton}
                            onClick={save}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TaskTypePopup;
