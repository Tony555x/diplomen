import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../auth";
import Navbar from "../components/Navbar";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./UserSettingsPage.module.css";

const PRESET_COLORS = [
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#14b8a6", // teal
    "#06b6d4", // cyan
    "#6366f1", // indigo
    "#a855f7", // purple
    "#f43f5e", // rose
];

function UserSettingsPage() {
    const [profile, setProfile] = useState(null);
    const [selectedColor, setSelectedColor] = useState("#3b82f6");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    usePageTitle("User Settings");


    useEffect(() => {
        fetchWithAuth("/api/user/profile")
            .then(data => {
                setProfile(data);
                if (data.avatarColor) setSelectedColor(data.avatarColor);
            })
            .catch(() => setError("Failed to load profile."));
    }, []);

    const handleSave = async () => {
        try {
            setSaving(true);
            setSuccess(false);
            setError(null);
            await fetchWithAuth("/api/user/profile", {
                method: "PATCH",
                body: { avatarColor: selectedColor }
            });
            setSuccess(true);
        } catch {
            setError("Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    const initial = profile?.userName?.charAt(0).toUpperCase() ?? "?";

    return (
        <div className={styles.page}>
            <Navbar userName={profile?.userName} />
            <div className={styles.content}>
                <div className={styles.card}>
                    <h2 className={styles.title}>User Settings</h2>

                    <div className={styles.previewRow}>
                        <div className={styles.avatarPreview} style={{ background: selectedColor }}>
                            {initial}
                        </div>
                        <div className={styles.previewInfo}>
                            <div className={styles.previewName}>{profile?.userName}</div>
                            <div className={styles.previewEmail}>{profile?.email}</div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <label className={styles.label}>Avatar Color</label>
                        <div className={styles.colorGrid}>
                            {PRESET_COLORS.map(color => (
                                <button
                                    key={color}
                                    className={`${styles.colorSwatch} ${selectedColor === color ? styles.selected : ""}`}
                                    style={{ background: color }}
                                    onClick={() => setSelectedColor(color)}
                                    title={color}
                                />
                            ))}
                        </div>
                        <div className={styles.customRow}>
                            <label className={styles.customLabel}>Custom:</label>
                            <input
                                type="color"
                                className={styles.colorPicker}
                                value={selectedColor}
                                onChange={e => setSelectedColor(e.target.value)}
                            />
                            <span className={styles.colorHex}>{selectedColor}</span>
                        </div>
                    </div>

                    {error && <div className={styles.error}>{error}</div>}
                    {success && <div className={styles.success}>Saved!</div>}

                    <button
                        className={styles.saveBtn}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? "Saving…" : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UserSettingsPage;
