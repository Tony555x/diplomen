import React from "react";
import styles from "./StyledCheckbox.module.css";

function StyledCheckbox({ checked, onChange, label, disabled = false, className = "" }) {
    return (
        <div className={`${styles.checkbox} ${className}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
            />
            {label && <span>{label}</span>}
        </div>
    );
}

export default StyledCheckbox;
