import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import { usePageTitle } from "../hooks/usePageTitle";
import PageBackground from "../components/PageBackground";
import styles from "./SearchPage.module.css";

export default function SearchPage() {
    usePageTitle("Search – TaskBoard");
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);

    const doSearch = useCallback(async (q) => {
        if (!q.trim()) { setResults(null); return; }
        setLoading(true);
        try {
            const data = await fetchWithAuth(`/api/search?q=${encodeURIComponent(q.trim())}`);
            setResults(data);
        } catch {
            setResults(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val), 300);
    };

    const navigateTo = (path) => navigate(path);

    const hasResults = results &&
        (results.tasks?.length > 0 || results.projects?.length > 0 || results.workspaces?.length > 0);

    return (
        <div className={styles.root}>
            <PageBackground />

            {/* ── Header bar ─────────────────────────────────────── */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Go back">
                    ← Back
                </button>
                <span className={styles.title}>Search</span>
            </div>

            {/* ── Search input ────────────────────────────────────── */}
            <div className={styles.inputWrap}>
                <input
                    className={styles.input}
                    type="text"
                    placeholder="Search tasks, projects, workspaces…"
                    value={query}
                    onChange={handleChange}
                    autoFocus
                    autoComplete="off"
                />
            </div>

            {/* ── Results ─────────────────────────────────────────── */}
            <div className={styles.results}>
                {loading && <div className={styles.empty}>Searching…</div>}

                {!loading && query.trim() && !hasResults && (
                    <div className={styles.empty}>No results for "{query}"</div>
                )}

                {!loading && results?.workspaces?.length > 0 && (
                    <div className={styles.group}>
                        <div className={styles.groupTitle}>Workspaces</div>
                        {results.workspaces.map(w => (
                            <div key={w.id} className={styles.item}
                                onClick={() => navigateTo(`/workspace/${w.id}/projects`)}>
                                {w.name}
                            </div>
                        ))}
                    </div>
                )}

                {!loading && results?.projects?.length > 0 && (
                    <div className={styles.group}>
                        <div className={styles.groupTitle}>Projects</div>
                        {results.projects.map(p => (
                            <div key={p.id} className={styles.item}
                                onClick={() => navigateTo(`/project/${p.id}/tasks`)}>
                                {p.name}
                            </div>
                        ))}
                    </div>
                )}

                {!loading && results?.tasks?.length > 0 && (
                    <div className={styles.group}>
                        <div className={styles.groupTitle}>Tasks</div>
                        {results.tasks.map(t => (
                            <div key={t.id} className={styles.item}
                                onClick={() => navigateTo(`/project/${t.projectId}/tasks/${t.id}`)}>
                                {t.taskTypeIcon
                                    ? <img src={`/cardicons/${t.taskTypeIcon}`} alt="" className={styles.taskIcon} />
                                    : <span className={styles.itemIcon}>✓</span>
                                }
                                <span className={t.completed ? styles.completed : ""}>{t.title}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
