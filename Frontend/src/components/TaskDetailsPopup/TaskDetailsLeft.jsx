import styles from "./TaskDetailsLeft.module.css";
import CustomField from "../CustomField";
import StyledCheckbox from "../StyledCheckbox";

function TaskDetailsLeft({ taskType, completed, setCompleted, fieldValues, setFieldValues, canCreateTasks = false }) {
    const handleFieldChange = (fieldId, value) => {
        setFieldValues(prev => {
            const next = [...prev];
            const index = next.findIndex(fv => fv.taskFieldId === fieldId);
            if (index !== -1) next[index] = { ...next[index], value };
            else next.push({ taskFieldId: fieldId, value });
            return next;
        });
    };

    return (
        <div className={styles.column}>
            {taskType?.fields?.length > 0 && (
                <>
                    <h3>{taskType.name} Details</h3>
                    {taskType.fields.map(field => {
                        const value =
                            fieldValues.find(fv => fv.taskFieldId === field.id)?.value ??
                            field.defaultValue ??
                            "";

                        return (
                            <CustomField
                                key={field.id}
                                field={field}
                                value={value}
                                onChange={handleFieldChange}
                                readOnly={!canCreateTasks}
                            />
                        );
                    })}
                </>
            )}

            <StyledCheckbox
                checked={completed}
                onChange={e => setCompleted(e.target.checked)}
                label="Mark as completed"
                className={styles.completedCheckbox}
            />
        </div>
    );
}

export default TaskDetailsLeft;
