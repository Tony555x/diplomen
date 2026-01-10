import React, { useState } from "react";
import { fetchWithAuth } from "../../auth";
import styles from "./TaskTypeFormPopup.module.css";

const FIELD_TYPES = ["Text", "Number", "Date", "Checkbox"];

function TaskTypeFormPopup({ projectId, taskType, onClose, onSaved }) {
    const isEdit = !!taskType.id;

    const [name, setName] = useState(taskType.name || "");
    const [description, setDescription] = useState(taskType.description || "");
    const [fields, setFields] = useState(taskType.fields || []);

    const addField = () => {
        setFields([
            ...fields,
            {
                name: "",
                type: "Text",
                isRequired: false,
                defaultValue: ""
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

    const save = async () => {
        await fetchWithAuth(
            `/api/projects/${projectId}/task-types`,
            {
                method: isEdit ? "PUT" : "POST",
                body: {
                    id: taskType.id,
                    name,
                    description,
                    fields
                }
            }
        );

        onSaved();
        onClose();
    };

    return (
        <div className={styles.backdrop}>
            <div className={styles.popup}>
                <h3>{isEdit ? "Edit task type" : "New task type"}</h3>

                <input
                    placeholder="Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />

                <input
                    placeholder="Description of task type"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                />
                <hr style={{borderColor:"#888"}}/>
                <h3>Fields</h3>

                <div className={styles.fields}>
                    {fields.length==0&&(<div>This task type has no fields. Click 'Add Field' to create a new one.</div>)}
                    {fields.map((f, i) => (
                        <div key={i} className={styles.fieldRow}>
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
                                    updateField(i, { type: e.target.value })
                                }
                            >
                                {FIELD_TYPES.map(t => (
                                    <option key={t}>{t}</option>
                                ))}
                            </select>

                            <button onClick={() => removeField(i)}>×</button>
                        </div>
                    ))}
                </div>

                <button onClick={addField}>Add field</button>

                <div className={styles.actions}>
                    <button onClick={onClose}>Cancel</button>
                    <button onClick={save}>Save</button>
                </div>
            </div>
        </div>
    );
}

export default TaskTypeFormPopup;
