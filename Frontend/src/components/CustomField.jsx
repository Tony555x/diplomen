import React from "react";
import styles from "./CustomField.module.css";
import StyledCheckbox from "./StyledCheckbox";

function CustomField({ field, value, onChange, readOnly = false }) {
    const handleChange = e => {
        if (readOnly) return;
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
                    <StyledCheckbox
                        checked={value === "true"}
                        onChange={handleChange}
                        label={field.name}
                        disabled={readOnly}
                    />
                    {field.description && (
                        <small className={styles.hint}>{field.description}</small>
                    )}
                </div>
            );

        case "Date":
            return (
                <div className={styles.formGroup} key={field.id}>
                    <label>{field.name}</label>
                    <input type="date" value={value} onChange={handleChange} readOnly={readOnly} />
                    {field.description && (
                        <small className={styles.hint}>{field.description}</small>
                    )}
                </div>
            );

        case "Number":
            return (
                <div className={styles.formGroup} key={field.id}>
                    <label>{field.name}</label>
                    <input type="number" value={value} onChange={handleChange} readOnly={readOnly} />
                    {field.description && (
                        <small className={styles.hint}>{field.description}</small>
                    )}
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
                        readOnly={readOnly}
                    />
                    {field.description && (
                        <small className={styles.hint}>{field.description}</small>
                    )}
                </div>
            );
    }
}

export default CustomField;
