// CustomField.jsx
import React from "react";
import styles from "./TaskDetailsPopup.module.css";

function CustomField({ field, value, onChange }) {
    const handleChange = e => {
        const val =
            field.type === "Checkbox"
                ? e.target.checked.toString()
                : e.target.value;
        onChange(field.id, val);
    };

    switch (field.type) {
        case "Checkbox":
            return (
                <div className={styles.checkboxGroup} key={field.id}>
                    <label>
                        <input
                            type="checkbox"
                            checked={value === "true"}
                            onChange={handleChange}
                        />
                        <span>{field.name}</span>
                    </label>
                    {field.description && <small className={styles.hint}>{field.description}</small>}
                </div>
            );

        case "Date":
            return (
                <div className={styles.formGroup} key={field.id}>
                    <label>{field.name}</label>
                    <input type="date" value={value} onChange={handleChange} />
                    {field.description && <small className={styles.hint}>{field.description}</small>}
                </div>
            );

        case "Number":
            return (
                <div className={styles.formGroup} key={field.id}>
                    <label>{field.name}</label>
                    <input type="number" value={value} onChange={handleChange} />
                    {field.description && <small className={styles.hint}>{field.description}</small>}
                </div>
            );

        default:
            return (
                <div className={styles.formGroup} key={field.id}>
                    <label>{field.name}</label>
                    <textarea
                        value={value}
                        onChange={handleChange}
                        rows={4}
                        className={styles.textarea}
                    />

                    {field.description && <small className={styles.hint}>{field.description}</small>}
                </div>
            );
    }
}

export default CustomField;
