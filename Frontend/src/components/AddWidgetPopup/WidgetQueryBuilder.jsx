import React, { useState } from "react";
import styles from "./AddWidgetPopup.module.css";

const TASK_FILTER_FIELDS = [
    { value: "status", label: "Status", type: "status" },
    { value: "completed", label: "Completed", type: "bool" },
    { value: "type", label: "Task Type", type: "tasktype" },
    { value: "assigneeCount", label: "# Assignees", type: "number" },
    { value: "isBlocked", label: "Is Blocked", type: "bool" },
    { value: "overdue", label: "Overdue", type: "bool" },
    { value: "dueDate", label: "Due Date", type: "date" },
];

const MEMBER_FILTER_FIELDS = [
    { value: "role", label: "Role", type: "role" },
    { value: "taskCount", label: "# Tasks", type: "number" },
];

const TASK_GROUP_BY_OPTIONS = [
    { value: "status", label: "Status" },
    { value: "completed", label: "Completed" },
    { value: "type", label: "Task Type" },
];

const MEMBER_GROUP_BY_OPTIONS = [
    { value: "role", label: "Role" },
];

const BOOL_VALUES = ["true", "false"];
const NUMERIC_OPS = ["=", "!=", ">", ">=", "<", "<="];
const STRING_OPS = ["=", "!="];
const BOOL_OPS = ["="];

function WidgetQueryBuilder({ query, onChange, projectContext }) {
    const { statuses = [], taskTypes = [], taskFields = [], roles = [] } = projectContext || {};

    // Deduplicate task fields by name (same field name can appear across multiple task types)
    const uniqueTaskFields = taskFields.filter(
        (tf, idx, arr) => arr.findIndex(x => x.name === tf.name) === idx
    );

    const selectTarget = query.select || "tasks";
    const filters = query.filters || [];
    const groupBy = query.groupBy || null;

    const filterFields = selectTarget === "tasks" ? [
        ...TASK_FILTER_FIELDS,
        ...uniqueTaskFields.map(tf => ({ value: `field:${tf.name}`, label: `Field: ${tf.name}`, type: "text" }))
    ] : MEMBER_FILTER_FIELDS;

    const groupByOptions = selectTarget === "tasks" ? [
        ...TASK_GROUP_BY_OPTIONS,
        ...uniqueTaskFields.map(tf => ({ value: `field:${tf.name}`, label: `Field: ${tf.name}` }))
    ] : MEMBER_GROUP_BY_OPTIONS;

    const addFilter = () => {
        const defaultField = filterFields[0];
        onChange({
            ...query,
            filters: [...filters, { field: defaultField.value, op: "=", value: "" }]
        });
    };

    const updateFilter = (i, patch) => {
        const updated = filters.map((f, idx) => idx === i ? { ...f, ...patch } : f);
        onChange({ ...query, filters: updated });
    };

    const removeFilter = (i) => {
        onChange({ ...query, filters: filters.filter((_, idx) => idx !== i) });
    };

    const getValueOptions = (fieldDef) => {
        if (!fieldDef) return [];
        switch (fieldDef.type) {
            case "status": return statuses;
            case "tasktype": return taskTypes.map(tt => tt.name);
            case "bool": return BOOL_VALUES;
            case "role": return roles;
            case "text": {
                // Check if this is a custom Dropdown field — parse its stored options
                if (fieldDef.value?.startsWith("field:")) {
                    const fieldName = fieldDef.value.slice(6);
                    const tf = uniqueTaskFields.find(f => f.name === fieldName);
                    if (tf?.options) {
                        try { return JSON.parse(tf.options); } catch { return []; }
                    }
                }
                return [];
            }
            default: return [];
        }
    };

    const getOpsForField = (fieldDef) => {
        if (!fieldDef) return STRING_OPS;
        switch (fieldDef.type) {
            case "bool": return BOOL_OPS;
            case "number": return NUMERIC_OPS;
            default: return STRING_OPS;
        }
    };

    return (
        <div className={styles.builder}>
            {/* SELECT */}
            <div className={styles.builderRow}>
                <label className={styles.builderLabel}>Select</label>
                <select
                    className={styles.builderSelect}
                    value={selectTarget}
                    onChange={e => onChange({ select: e.target.value, filters: [], groupBy: null, aggregate: null, value: null })}
                >
                    <option value="tasks">Tasks</option>
                    <option value="members">Members</option>
                </select>
            </div>

            {/* FILTERS */}
            <div className={styles.builderSection}>
                <div className={styles.builderSectionHeader}>
                    <span>Filters</span>
                    <button type="button" className={styles.addFilterBtn} onClick={addFilter}>+ Add Filter</button>
                </div>

                {filters.map((f, i) => {
                    const fieldDef = filterFields.find(ff => ff.value === f.field);
                    const ops = getOpsForField(fieldDef);
                    const valOptions = getValueOptions(fieldDef);
                    return (
                        <div key={i} className={styles.filterRow}>
                            {/* Field */}
                            <select
                                className={styles.filterSelect}
                                value={f.field}
                                onChange={e => {
                                    const newFieldDef = filterFields.find(ff => ff.value === e.target.value);
                                    const newOps = getOpsForField(newFieldDef);
                                    updateFilter(i, { field: e.target.value, op: newOps[0], value: "" });
                                }}
                            >
                                {filterFields.map(ff => (
                                    <option key={ff.value} value={ff.value}>{ff.label}</option>
                                ))}
                            </select>

                            {/* Operator */}
                            <select
                                className={styles.filterOp}
                                value={f.op}
                                onChange={e => updateFilter(i, { op: e.target.value })}
                            >
                                {ops.map(op => <option key={op} value={op}>{op}</option>)}
                            </select>

                            {/* Value */}
                            {valOptions.length > 0 ? (
                                <select
                                    className={styles.filterValue}
                                    value={f.value}
                                    onChange={e => updateFilter(i, { value: e.target.value })}
                                >
                                    <option value="">Select...</option>
                                    {valOptions.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            ) : (
                                <input
                                    className={styles.filterValue}
                                    type={fieldDef?.type === "number" ? "number" : "text"}
                                    value={f.value}
                                    onChange={e => updateFilter(i, { value: e.target.value })}
                                    placeholder="value"
                                />
                            )}

                            <button type="button" className={styles.removeFilterBtn} onClick={() => removeFilter(i)}>×</button>
                        </div>
                    );
                })}

                {filters.length === 0 && (
                    <p className={styles.noFiltersHint}>No filters — all {selectTarget} will be included.</p>
                )}
            </div>

            {/* GROUP BY */}
            <div className={styles.builderRow}>
                <label className={styles.builderLabel}>Group by</label>
                <select
                    className={styles.builderSelect}
                    value={groupBy || ""}
                    onChange={e => {
                        const val = e.target.value || null;
                        onChange({
                            ...query,
                            groupBy: val,
                            aggregate: val ? { func: "count" } : null,
                            value: null
                        });
                    }}
                >
                    <option value="">(no grouping — show list)</option>
                    {groupByOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>

            {groupBy && (
                <div className={styles.builderRow}>
                    <label className={styles.builderLabel}>Aggregate</label>
                    <select
                        className={styles.builderSelect}
                        value={query.aggregate?.func || "count"}
                        onChange={e => onChange({ ...query, aggregate: { func: e.target.value } })}
                    >
                        <option value="count">Count</option>
                    </select>
                </div>
            )}
        </div>
    );
}

export default WidgetQueryBuilder;
