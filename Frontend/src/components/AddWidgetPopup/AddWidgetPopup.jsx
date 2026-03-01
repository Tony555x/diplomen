import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../../auth";
import styles from "./AddWidgetPopup.module.css";
import WidgetQueryBuilder from "./WidgetQueryBuilder";

const DEFAULT_QUERY = {
    select: "tasks",
    filters: [],
    groupBy: null,
    aggregate: null,
    value: null,
};

function AddWidgetPopup({ projectId, widgetId, onClose, onWidgetSaved }) {
    const isEditing = !!widgetId;

    // "gallery" | "builder"
    const [view, setView] = useState(isEditing ? "builder" : "gallery");
    const [templates, setTemplates] = useState([]);
    const [projectContext, setProjectContext] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Builder state
    const [widgetName, setWidgetName] = useState("");
    const [query, setQuery] = useState(DEFAULT_QUERY);

    // Load templates + project context
    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchWithAuth(`/api/projects/${projectId}/dashboard/widget-templates`);
                setTemplates(data.templates || []);
                setProjectContext(data.projectContext || {});
            } catch (err) {
                setError("Failed to load templates.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [projectId]);

    // If editing, pre-load the existing widget data
    useEffect(() => {
        if (!isEditing) return;
        const loadWidget = async () => {
            try {
                const data = await fetchWithAuth(`/api/projects/${projectId}/dashboard/widgets`);
                const w = data.find(w => w.id === parseInt(widgetId));
                if (w) {
                    setWidgetName(w.name || "");
                    try { setQuery(JSON.parse(w.source)); } catch { setQuery(DEFAULT_QUERY); }
                }
            } catch { /* ignore */ }
        };
        loadWidget();
    }, [isEditing, projectId, widgetId]);

    const handleTemplateClick = (template) => {
        setWidgetName(template.name);
        try { setQuery(JSON.parse(template.queryJson)); } catch { setQuery(DEFAULT_QUERY); }
        setView("builder");
    };

    const handleSave = async () => {
        if (!widgetName.trim()) { setError("Widget name is required."); return; }
        setSaving(true);
        setError(null);
        try {
            const endpoint = isEditing
                ? `/api/projects/${projectId}/dashboard/widgets/${widgetId}`
                : `/api/projects/${projectId}/dashboard/widgets`;
            const method = isEditing ? "PUT" : "POST";
            const result = await fetchWithAuth(endpoint, {
                method,
                body: { name: widgetName.trim(), type: "ListResult", source: JSON.stringify(query) }
            });
            onWidgetSaved(result, isEditing);
            onClose();
        } catch (err) {
            setError("Failed to save widget: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.popup}>
                {/* Header */}
                <div className={styles.popupHeader}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {view === "builder" && !isEditing && (
                            <button className={styles.backBtn} onClick={() => setView("gallery")}>← Back</button>
                        )}
                        <h2>{isEditing ? "Edit Widget" : view === "gallery" ? "Add Widget" : "Configure Widget"}</h2>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                {loading ? (
                    <div className={styles.loadingHint}>Loading...</div>
                ) : view === "gallery" ? (
                    /* ── GALLERY view ────────────────────────────────────── */
                    <div className={styles.galleryBody}>
                        {error && <div className={styles.errorMsg}>{error}</div>}

                        {/* Group by Tasks / Members */}
                        {["Tasks", "Members"].map(cat => {
                            const catTemplates = templates.filter(t => t.category === cat);
                            if (catTemplates.length === 0) return null;
                            return (
                                <div key={cat}>
                                    <div className={styles.galleryDivider}>{cat}</div>
                                    <div className={styles.templateGrid}>
                                        {catTemplates.map(t => (
                                            <button
                                                key={t.id}
                                                className={styles.templateCard}
                                                onClick={() => handleTemplateClick(t)}
                                            >
                                                <div className={styles.templateCardBadge}>{t.category}</div>
                                                <div className={styles.templateCardName}>{t.name}</div>
                                                <div className={styles.templateCardDesc}>{t.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        <div className={styles.galleryDivider}>Custom</div>
                        <button
                            className={styles.createCustomBtn}
                            onClick={() => { setWidgetName(""); setQuery(DEFAULT_QUERY); setView("builder"); }}
                        >
                            + Create custom widget
                        </button>
                    </div>
                ) : (
                    /* ── BUILDER view ────────────────────────────────────── */
                    <div className={styles.builderBody}>
                        {error && <div className={styles.errorMsg}>{error}</div>}

                        <div className={styles.fieldRow}>
                            <label className={styles.fieldLabel}>Widget Name</label>
                            <input
                                className={styles.fieldInput}
                                value={widgetName}
                                onChange={e => setWidgetName(e.target.value)}
                                placeholder="e.g. Open Bugs"
                                autoFocus
                            />
                        </div>

                        <WidgetQueryBuilder
                            query={query}
                            onChange={setQuery}
                            projectContext={projectContext}
                        />
                    </div>
                )}

                {/* Footer — only show when in builder */}
                {view === "builder" && (
                    <div className={styles.popupActions}>
                        <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
                        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                            {saving ? "Saving…" : isEditing ? "Save Changes" : "Add Widget"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AddWidgetPopup;
